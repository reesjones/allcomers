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
import { ResultWorkbookStateless } from './ResultSheet';

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

export function CompiledSheet(props: {results: Array<Result>}): React$Element<any> {
  const fields = [...getAllFields(props.results)];
  const headerRow = {
    rowId: "header",
    cells: fields.map(field => {
      const field_parts = (field: string).split("_").map(part => camelize(part));
      return {type: "header", text: field_parts.join(" ")};
    }),
  };
  const cols = fields.map(_ => {return {width: 150};});
  const rows = [headerRow, ...props.results.map(result => {
    const cells = new Array<{type: string, text: string}>(fields.length);
    [...result.getFields()].forEach(([field, val]) => {
      const idx = fields.findIndex(f => f === field);
      cells[idx] = {type: "text", text: `${val}`};
    });
    return {rowId: result.key(), cells};
  })];
  return <ReactGrid rows={rows} columns={COLS} />
}

const EXCLUDE_SHEETS = ["Worksheet", "Final Compiled", "Instructions"];
function filterSheets(workbook: Workbook, excludeList: Array<string>): Workbook {
  workbook.SheetNames = workbook.SheetNames.filter(n => !EXCLUDE_SHEETS.includes(n));
  for (const excluded of EXCLUDE_SHEETS) {
    delete workbook.Sheets[excluded];
  }
  return workbook;
}

/**
 * Makes a deep copy of prevWorkbook, applies changes to changed sheet to the
 * deep copy, and returns the deep copy.
 */
function applyCellChanges(
  changedSheetName: string,
  changes: Array<CellChange<TextCell>>,
  prevWorkbook: Workbook,
): Workbook {
  const newWorkbook = XLSX.utils.book_new();
  const changedSheet = prevWorkbook.Sheets[changedSheetName];
  for (const nameToCopy of prevWorkbook.SheetNames) {
    const newSheet = XLSX.utils.aoa_to_sheet(prevWorkbook.Sheets[nameToCopy], {dense: true});
    XLSX.utils.book_append_sheet(newWorkbook, newSheet, nameToCopy);
  }
  for (const change of changes) {
    const cell = newWorkbook.Sheets[changedSheetName][change.rowId][change.columnId];
    cell.v = change.newCell.text;
    cell.h = change.newCell.text;
    cell.w = change.newCell.text;
    cell.r = `<t>${change.newCell.text}</t>`;
  }
  return newWorkbook;
};

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
    console.log("workbook");
    console.log(workbook);
    const parser = new GoogleSheetsResultParser();
    const parseOutput = parser.parse(workbook);
    console.log("parseOutput");
    console.log(parseOutput);
    const parsedResults = parseOutput.results;
    // compiledPane = <ReactGrid rows={getRows(parsedResults)} columns={COLS} />
    compiledPane = <CompiledSheet results={parsedResults} />;
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