// @flow
'use client'
import React from 'react';
import {useState} from "react";
import * as XLSX from 'xlsx';
import {Workbook} from 'xlsx';
import {ResultParser, GoogleSheetsResultParser} from './parser';
import {Result, ResultField} from './types';
import {Pipeline} from './pipeline/core';
import {DNFFilter, DNSFilter, NHFilter, NMFilter, NoNameFilter} from './pipeline/filters';
import {AddUnattachedIfEmptyTeamTransformer} from './pipeline/transformers';
import {fillEmpty, emptyRow, emptyCell} from './util';
import {ReactGrid, CellChange, Column, Row, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import Button from '@mui/joy/Button';
import ButtonGroup from '@mui/joy/ButtonGroup';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import Sheet from '@mui/joy/Sheet';
import { applyCellChanges, ResultWorkbook, ResultWorkbookStateless } from './ResultSheet';
import PipelineBuilder from './pipeline/builder';

const HDR_ROW = {
  rowId: "header",
  cells: [
    { type: "header", text: "First Name" },
    { type: "header", text: "Last Name" },
    { type: "header", text: "C" },
    { type: "header", text: "D" },
  ],
};

const COLS = [
  {width: 150},
  {width: 150},
  {width: 150},
  {width: 150},
];

function getRows(results: Array<Result>) {
  return [
    HDR_ROW,
    ...results.map((result, idx) => ({
      rowId: idx,
      cells: [
        {type: "text", text: result.firstName},
        {type: "text", text: result.lastName},
      ],
    })),
  ];
}


export function ResultSheet(props: {
  sheet: WorkSheet,
  onCellsChanged: (Array<CellChange<TextCell>>) => void,
}): React$Element<any> {
  const rows = props.sheet.map((row, i) => {
    let cells = row.map(cell => {
      let type = i == 0 ? "header" : "text";
      if (cell == null) type = "number";
      return {type, text: `${cell.v}`};
    });
    return {rowId: i, cells};
  });
  const headerRow = {
    rowId: "header",
    cells: rows[0],
  };
  const maxColWidth = rows.reduce((max, next) =>
    (next.cells.length > max) ? next.cells.length : max, 0);
  const cols = [];
  for (let i = 0; i < maxColWidth; i++) {
    cols.push({columnId: i, width: 150});
  }
  return (
    <ReactGrid rows={rows} columns={cols} onCellsChanged={props.onCellsChanged}/>
  );
}

function getAllFields(results: Array<Result>): Set<ResultField> {
  const headers = new Set<ResultField>();
  for (const res of results) {
    for (const field of res.getFields().keys()) {
      headers.add(field);
    }
  }
  return headers;
}

function camelize(str: string): string {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return "";
    return index === 0 ? match.toUpperCase() : match.toLowerCase();
  });
}

function resultToRow(result: Result, fields: Array<ResultField>): Array<string> {
  const fieldValues = result.getFields();
  return fields.map(f => fieldValues.get(f) ?? "");
}

export function CompiledPane(props: {results: Array<Result>}): React$Element<any> {
  const pipe = new PipelineBuilder()
    .filter(new NoNameFilter())
    .filter(new DNFFilter())
    .filter(new DNSFilter())
    .filter(new NHFilter())
    .filter(new NMFilter())
    .transform(new AddUnattachedIfEmptyTeamTransformer())
    .build();
  // console.log(props.results);
  const transformedResults = pipe.run(props.results);
  // console.log(props.results);
  // console.log(transformedResults);

  const fields = [...getAllFields(transformedResults)];
  const headerRow = fields.map(field => 
    // Convert ResultField enum values to human-formatted
    // TODO: Map instead to expected column names on athletic.net
    (field: string).split("_").map(part => camelize(part)).join(" "));
  const rowOfStrings = transformedResults.map((result, resultIdx) => resultToRow(result, fields));
  const rows = [headerRow, ...rowOfStrings];
  const aoa = XLSX.utils.aoa_to_sheet(rows, {dense: true});
  const aoaWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(aoaWorkbook, aoa, "Compiled");
  return (
    <div>
      <ResultWorkbook initialWorkbook={aoaWorkbook} />
    </div>
  );
}

const EXCLUDE_SHEETS = ["Worksheet", "Final Compiled", "Instructions"];
function filterSheets(workbook: Workbook, excludeList: Array<string>): Workbook {
  workbook.SheetNames = workbook.SheetNames.filter(n => !EXCLUDE_SHEETS.includes(n));
  for (const excluded of EXCLUDE_SHEETS) {
    delete workbook.Sheets[excluded];
  }
  return workbook;
}

enum SelectedTab {
  ORIGINAL,
  COMPILED,
};

export default function Home(): React$Element<any> {
  // TODO Get xlsx flow types
  const [workbook, setWorkbook] = useState<any/*Workbook*/>(null);
  const [selectedTab, setSelectedTab] = useState<SelectedTab>(SelectedTab.ORIGINAL);
  const [originalWorkbookVersion, setOriginalWorkbookVersion] = useState(0);

  const selectedStyle = {};
  const hiddenStyle = {display: "none"};
  const originalTabStyle = selectedTab === SelectedTab.ORIGINAL ? selectedStyle: hiddenStyle;
  const compiledTabStyle = selectedTab === SelectedTab.COMPILED ? selectedStyle: hiddenStyle;

  const onFileSelectorChange = async (e: SyntheticEvent<HTMLInputElement>) => {
    const fileHandle = e.currentTarget.files[0];
    const data = await fileHandle.arrayBuffer();
    let wb = XLSX.read(data, {dense: true});
    wb = filterSheets(wb, EXCLUDE_SHEETS);
    for (const name of wb.SheetNames) {
      // Fill undefined cells within each row
      const rowSizes = Array.from(wb.Sheets[name].map(row => row.length)).filter(n => n != null);
      const maxColWidth = Math.max(...rowSizes);
      const filledRows = wb.Sheets[name].map(row => {
        row = fillEmpty(row, emptyCell, maxColWidth);
        return row;
      });
      // Fill undefined rows within each sheet
      wb.Sheets[name] = fillEmpty(filledRows, emptyRow(maxColWidth));
    }
    setWorkbook(wb);
  }
  let compiledPane: React$Element<any> = <div />;
  if (workbook != null) {
    const parser = new GoogleSheetsResultParser();
    const parseOutput = parser.parse(workbook);
    const parsedResults = parseOutput.results;
    if (parseOutput.error) {
      compiledPane = <div>Error parsing input sheet: {parseOutput.error}</div>;
    } else {
      compiledPane = <CompiledPane results={parsedResults} />;
    }
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4" style={{height: "1vh"}}>
      <div style={{width: "100%", height: "100%"}}>
        <div className="p-4">
          <input type='file' onChange={onFileSelectorChange} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        </div>
        <Sheet className="p-4">
          <ButtonGroup sx={{display: 'flex', justifyContent: 'center'}}>
              <Button sx={{width: 300}} size="lg" onClick={(e) => setSelectedTab(SelectedTab.ORIGINAL)}>Original</Button>
              <Button sx={{width: 300}} size="lg" onClick={(e) => setSelectedTab(SelectedTab.COMPILED)}>Compiled</Button>
          </ButtonGroup>
          <div style={originalTabStyle}>
            <ResultWorkbookStateless
              workbook={workbook}
              onCellsChanged={(changedSheetName: string, changes: Array<CellChange<TextCell>>) => {
                setWorkbook(prevWorkbook => applyCellChanges(changedSheetName, changes, prevWorkbook))
                setOriginalWorkbookVersion(ver => ver + 1);
              }} />
          </div>
          <div style={compiledTabStyle} key={originalWorkbookVersion}>
            {compiledPane}
          </div>
        </Sheet>
      </div>
    </main>
  )
}