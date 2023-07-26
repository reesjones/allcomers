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
    <ReactGrid rows={rows} columns={cols} onCellsChanged={props.onCellsChanged}/>
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
        <ResultSheetStateless
          sheet={sheet}
          name={name}
          onCellsChanged={(changes) => props.onCellsChanged(name, changes)}
        />
      </TabPanel>
    );
  });
  return (
    <div>
      <Tabs size="sm" defaultValue={workbook.SheetNames[0]}>
        {tabs}
      <TabList variant="soft" color="primary">
        {workbook.SheetNames.map(name => <Tab value={name} key={name}>{name}</Tab>)}
      </TabList>
      </Tabs>
    </div>
  );
}

/**
 * TODO: Create stateful ResultWorkbook component for Compiled tab
 */