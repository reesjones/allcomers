// @flow
'use client'
import React from 'react';
import {useState} from "react";
import * as XLSX from 'xlsx';
import {Workbook} from 'xlsx';
import {ReactGrid, CellChange, Column, Row, TextCell} from "@silevis/reactgrid";
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import TabList from '@mui/joy/TabList';
import Tabs from '@mui/joy/Tabs';

export type ResultSheetStatelessProps = {
  sheet: Worksheet,
  name: string,
  onCellsChanged: (Array<CellChange<TextCell>>) => void,
};

/**
 * Makes a deep copy of prevWorkbook, applies changes to changed sheet to the
 * deep copy, and returns the deep copy.
 */
export function applyCellChanges(
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

/**
 * Renders a stateless single sheet (grid of cells). onCellsChanged callback
 * allows parent to maintain state and enable editability.
 */
function ResultSheetStateless(props: ResultSheetStatelessProps): React$Element<any> {
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
    <ReactGrid
      rows={rows}
      columns={cols}
      onCellsChanged={props.onCellsChanged}
      enableRangeSelection
    />
  );
};

export type ResultWorkbookStatelessProps = {
  workbook: ?Workbook,
  onCellsChanged: (string, Array<CellChange<TextCell>>) => void,
};

/**
 * Renders a workbook in a collection of tabs. Does not maintain state -
 * includes onCellsChanged callback which can be used to maintain workbook state
 * and enable editability in parent component.
 */
export function ResultWorkbookStateless(props: ResultWorkbookStatelessProps): React$Element<any> {
  const {workbook} = props;
  if (workbook == null) {
    return <div>No workbook selected.</div>
  }
  const tabs = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const onCellsChanged = (changes: Array<CellChange<TextCell>>) => {
      props.onCellsChanged(name, changes);
    };
    return (
      <TabPanel value={name} key={name}>
        <div style={{height: "80vh", overflow: "scroll"}}>
          <ResultSheetStateless
            sheet={sheet}
            name={name}
            onCellsChanged={(changes) => props.onCellsChanged(name, changes)}
          />
        </div>
      </TabPanel>
    );
  });
  return (
    <div>
      <Tabs size="sm" defaultValue={workbook.SheetNames[0]}>
        {tabs}
        <TabList variant="soft" color="primary" tabFlex="auto">
          {workbook.SheetNames.map(name => <Tab value={name} key={name}>{name}</Tab>)}
        </TabList>
      </Tabs>
    </div>
  );
}

/**
 * Stateful version of ResultWorkbookStateless. Uses initialWorkbook
 */
export function ResultWorkbook(props: {initialWorkbook: ?Workbook}): React$Element<any> {
  const [workbook, setWorkbook] = useState(props.initialWorkbook);
  if (props.initialWorkbook == null) {
    return <div>No workbook selected.</div>
  }
  return (
    <ResultWorkbookStateless
      workbook={workbook}
      onCellsChanged={(changedSheetName: string, changes: Array<CellChange<TextCell>>) => {
        setWorkbook(prevWorkbook => applyCellChanges(changedSheetName, changes, prevWorkbook))
      }} />
  );
}