// @flow
'use client'
import React from 'react';
import {useState} from "react";
import * as XLSX from 'xlsx';
import {Workbook} from 'xlsx';
import {ResultParser, GoogleSheetsResultParser} from './parser';
import {Result, ResultField} from './types';
import {fillEmpty, emptyRow, emptyCell} from './util';
import {ReactGrid, CellChange, Column, Row, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import Sheet from '@mui/joy/Sheet';
import { applyCellChanges, ResultWorkbook, ResultWorkbookStateless } from './ResultSheet';

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

export function CompiledSheet(props: {results: Array<Result>}): React$Element<any> {
  const fields = [...getAllFields(props.results)];
  const headerRow = fields.map(field => 
    (field: string).split("_").map(part => camelize(part)).join(" "));
  const rowOfStrings = props.results.map((result, resultIdx) => resultToRow(result, fields));
  const rows = [headerRow, ...rowOfStrings];
  const aoa = XLSX.utils.aoa_to_sheet(rows, {dense: true});
  const aoaWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(aoaWorkbook, aoa, "Compiled");
  return <ResultWorkbook initialWorkbook={aoaWorkbook} />;
}

const EXCLUDE_SHEETS = ["Worksheet", "Final Compiled", "Instructions"];
function filterSheets(workbook: Workbook, excludeList: Array<string>): Workbook {
  workbook.SheetNames = workbook.SheetNames.filter(n => !EXCLUDE_SHEETS.includes(n));
  for (const excluded of EXCLUDE_SHEETS) {
    delete workbook.Sheets[excluded];
  }
  return workbook;
}

export default function Home(): React$Element<any> {
  // TODO Get xlsx flow types
  const [workbook, setWorkbook] = useState<any/*Workbook*/>(null);

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
  let originalPane = 
    <div><h2>Select a results spreadsheet from the file picker.</h2></div>;
  let compiledPane: React$Element<any> = <div />;
  if (workbook != null) {
    const parser = new GoogleSheetsResultParser();
    const parseOutput = parser.parse(workbook);
    const parsedResults = parseOutput.results;
    if (parseOutput.error) {
      compiledPane = <div>Error parsing input sheet: {parseOutput.error}</div>;
    } else {
      compiledPane = <CompiledSheet results={parsedResults} />;
    }
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <input type='file' onChange={onFileSelectorChange} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
        <Sheet>
          <Tabs size="lg">
            <TabList variant="plain" color="neutral">
              <Tab>Original</Tab>
              <Tab>Compiled</Tab>
            </TabList>
            <TabPanel value={0}>
              {originalPane}
              <ResultWorkbookStateless
                workbook={workbook}
                onCellsChanged={(changedSheetName: string, changes: Array<CellChange<TextCell>>) => {
                  setWorkbook(prevWorkbook => applyCellChanges(changedSheetName, changes, prevWorkbook))
                }} />
            </TabPanel>
            <TabPanel value={1}>
              {compiledPane}
            </TabPanel>
          </Tabs>
        </Sheet>
      </div>
    </main>
  )
}