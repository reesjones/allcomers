// @flow
'use client'
import React from 'react';
// $FlowFixMe avoids "module not found"
import * as XLSX from 'xlsx';
// $FlowFixMe avoids "module not found". Importing types separately helps flow
import {Workbook} from 'xlsx';
import {ResultParser, GoogleSheetsResultParser} from './parser';

export default function Home(): React$Element<any> {
  const onChange = async (e: SyntheticEvent<HTMLInputElement>) => {
    const fileHandle = e.currentTarget.files[0];
    console.log(fileHandle);
    const data = await fileHandle.arrayBuffer();
    console.log(data);
    const parser = new GoogleSheetsResultParser();
    const parseOutput = parser.parse(data);
    const results = parseOutput.results;
    console.log("Parsed these results:");
    console.log(results);
    console.log("Log:");
    console.log(parseOutput.log);
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <input type='file' onChange={onChange} accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
    </main>
  )
}