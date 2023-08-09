// @flow
'use client'
import React from 'react';
import {useState} from "react";
import * as XLSX from 'xlsx';
import {Workbook} from 'xlsx';
import {ResultParser, GoogleSheetsResultParser} from './parser';
import {Event, RankDirection, Result, ResultField} from './types';
import {Pipeline, Ranker} from './pipeline/core';
import {DNFFilter, DNSFilter, NHFilter, NMFilter, NoNameFilter} from './pipeline/filters';
import {AddUnattachedIfEmptyTeamTransformer} from './pipeline/transformers';
import {fillEmpty, emptyRow, emptyCell, camelize} from './util';
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

import type { CellObject_t, Workbook_t, Worksheet_t } from './xlsx_types';
import type { CellChange_t, TextCell_t } from './reactgrid_types'

const lowerIsBetterEvents: Set<Event> = new Set([
  Event.E100,
  Event.E200,
  Event.E400,
  Event.E800,
  Event.E1500,
  Event.EMile,
  Event.EJoggersMile,
  Event.E3000,
  Event.E2Mile,
  Event.E5000,
  Event.E10000,
  Event.ERaceWalk,
  Event.E80Hurdles,
  Event.E100Hurdles,
  Event.E110Hurdles,
  Event.E300Hurdles,
  Event.E400Hurdles,
  Event.E4x100,
  Event.E4x200,
  Event.E4x400,
  Event.EDMR,
  Event.ESMR,
]);
const higherIsBetterEvents: Set<Event> = new Set([
  Event.EPoleVault,
  Event.ELongJump,
  Event.EHighJump,
  Event.ETripleJump,
  Event.EShotput,
  Event.EJavelin,
  Event.EDiscus,
]);

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


function getAllFields(results: Array<Result>): Set<ResultField> {
  const headers = new Set<ResultField>();
  for (const res of results) {
    for (const field of res.getFields().keys()) {
      headers.add(field);
    }
  }
  return headers;
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
    .rank(new Ranker(lowerIsBetterEvents), RankDirection.ASCENDING)
    .rank(new Ranker(higherIsBetterEvents), RankDirection.DESCENDING)
    .build();
  const transformedResults = pipe.run(props.results);

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
function filterSheets(workbook: Workbook_t, excludeList: Array<string>): Workbook_t {
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
  const [workbook, setWorkbook] = useState<?Workbook_t>(null);
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
              onCellsChanged={(changedSheetName: string, changes: Array<CellChange<TextCell_t>>) => {
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