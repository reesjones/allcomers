// @flow
'use client'
import React from 'react';
import {useState} from "react";
import * as XLSX from 'xlsx';
import {Workbook} from 'xlsx';
import {ResultParser, GoogleSheetsResultParser} from './parser';
import {Result} from './types';
import {ReactGrid, CellChange, Column, Row, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';
import Sheet from '@mui/joy/Sheet';

const HDR_ROW = {
  rowId: "header",
  cells: [
    { type: "header", text: "headerrowFirst Name" },
    { type: "header", text: "headerrowLast Name" },
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

// Allocates and returns new CellObject
function emptyCell(): CellObject {
  return {'t': '', 'v': '', 'r': '', 'h': '', 'w': ''};
}

// Allocates and returns new row (array) of CellObjects with specified width
function emptyRow(width: number): () => Array<CellObject> {
  // $FlowFixMe missing array element type (correct is XLSX.CellObject)
  const fn = () => {
    const arr = new Array<any>(width);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = emptyCell();
    }
    return arr;
  }
  return fn;
}

function fillEmpty<T>(arr: Array<T>, filler: () => T, size?: number): Array<T> {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null) {
      arr[i] = filler();
    }
  }
  if (size != null) {
    for (let i = arr.length; i < size; i++) {
      arr[i] = filler();
    }
  }
  return arr;
}

export type ResultSheetProps = {
  sheet: WorkSheet;
  onCellsChanged: (Array<CellChange<TextCell>>) => void;
};

export function ResultSheet(props: ResultSheetProps): React$Element<any> {
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
  const [workbook, setWorkbook] = useState<any>(null);
  const onChange = async (e: SyntheticEvent<HTMLInputElement>) => {
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
  let compiledPane = originalPane;
  if (workbook != null) {
    const names = workbook.SheetNames;
    const applyCellChange = (changedSheetName: string, changes: Array<CellChange<TextCell>>, prevWorkbook: Workbook) => {
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
    originalPane = (
      <Tabs size="sm" defaultValue={names[0]}>
        {names.map(name => {
          return (<TabPanel value={name} key={name}>
            <ResultSheet
              sheet={workbook.Sheets[name]}
              onCellsChanged={(changes: Array<CellChange<TextCell>>) => {
                setWorkbook(prevWorkbook => applyCellChange(name, changes, prevWorkbook));
              }}
            />
          </TabPanel>);
        })}
        <TabList variant="soft" color="primary">
          {names.map(name => <Tab value={name} key={name}>{name}</Tab>)}
        </TabList>
      </Tabs>
    );
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
      <input type='file' onChange={onChange} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
      <Sheet>
        <Tabs size="lg">
          <TabList variant="plain" color="neutral">
            <Tab>Original</Tab>
            <Tab>Compiled</Tab>
          </TabList>
          <TabPanel value={0}>
            {originalPane}
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