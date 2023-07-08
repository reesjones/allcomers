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

export type ResultSheetProps = {
  sheet: WorkSheet;
  onCellsChanged: (Array<CellChange<TextCell>>) => void;
};

export function ResultSheet(props: ResultSheetProps): React$Element<any> {
  const json = XLSX.utils.sheet_to_json(props.sheet, {header:1});
  const rows = json.map((row, i) => {
    return {rowId: i, cells: row.map(cell => {
      let type = i == 0 ? "header" : "text";
      if (cell == null) {
        type = "number";
      }
      return {type, text: `${cell}`};
    })};
    });
  const headerRow = {
    rowId: "header",
    cells: rows[0],
  };
  const largestcol = rows.reduce((max, next) => {
    if (max == null) return next;
    if (next.cells.length > max.cells.length) return next;
    return max;
  }, null);
  const cols = (largestcol ?? {cells: []}).cells.map((_, i) => {return {columnId: i, width: 150};});
  return (
    <ReactGrid rows={rows} columns={cols} onCellsChanged={props.onCellsChanged}/>
  );
}

const EXCLUDE_SHEETS = ["Worksheet", "Final Compiled", "Instructions"];

export default function Home(): React$Element<any> {
  // TODO Get xlsx flow types
  const [workbook, setWorkbook] = useState<any>(null);
  const onChange = async (e: SyntheticEvent<HTMLInputElement>) => {
    const fileHandle = e.currentTarget.files[0];
    console.log(fileHandle);
    const data = await fileHandle.arrayBuffer();
    const wb = XLSX.read(data, {dense: true});
    setWorkbook(wb);
  }
  let originalPane = (
    <div>
      <h2>Select a results spreadsheet from the file picker.</h2>
    </div>
  );
  let compiledPane = (
    <div>
      <h2>Select a results spreadsheet from the file picker.</h2>
    </div>
  );
  if (workbook != null) {
    // const parser = new GoogleSheetsResultParser();
    // const parseOutput = parser.parse(workbook);
    // const parsedResults = parseOutput.results;
    console.log(workbook.Sheets);
    const names = workbook.SheetNames.filter(name => !EXCLUDE_SHEETS.includes(name));
    const applyCellChange = (sheetName: string, changes: Array<CellChange<TextCell>>, prevWorkbook: Workbook) => {
      const sheet = prevWorkbook.Sheets[sheetName];
      for (const change of changes) {
        console.log(`cell change in '${sheetName}' sheet:`);
        console.log(change);
        console.log(sheet[change.rowId][change.columnId]);
        const cell = sheet[change.rowId][change.columnId];
        cell.v = change.newCell.text;
        cell.h = change.newCell.text;
        cell.w = change.newCell.text;
        cell.r = `<t>${change.newCell.text}</t>`;
        console.log(sheet[change.rowId][change.columnId]);
      }
      return prevWorkbook;
    };
    const handleCellChange = (sheetName: string, changes: Array<CellChange<TextCell>>) => {
      console.log("before handelchange:");
      console.log(workbook.Sheets['5000m'][2][2]);
      setWorkbook(prevWorkbook => applyCellChange(sheetName, changes, prevWorkbook));
      // TODO see if there's a way to force render
      console.log("after handelchange:");
      console.log(workbook.Sheets['5000m'][2][2]);
    };
    console.log("rendering w/ workbook");
    originalPane = (
      <Tabs size="sm" defaultValue={names[0]}>
        {names.map(name => {
          if (name == "Long Jump") {
            console.log(workbook.Sheets[name]);
          }
          return (<TabPanel value={name} key={name}>
            <ResultSheet
              sheet={workbook.Sheets[name]}
              onCellsChanged={(changes: Array<CellChange<TextCell>>) => handleCellChange(name, changes)}
            />
          </TabPanel>);
        })}
        <TabList variant="soft" color="primary">
          {names.map(name => <Tab value={name} key={name}>{name}</Tab>)}
        </TabList>
      </Tabs>
    );
    // compiledPane = <ReactGrid rows={getRows(parsedResults)} columns={COLS} />;
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