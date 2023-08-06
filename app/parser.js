// @flow
'use client'
import type { Scorable } from "./types";
import { NullScorable } from "./pipeline/scores";

import {
  Event,
  ResultField,
  Result,
  EMPTY_COL,
} from "./types";
import * as XLSX from 'xlsx';
import {CellObject, Workbook, Worksheet} from 'xlsx';

export type ParseOutput = {
  results: Array<Result>;
  error: ?string;
  log: Array<string>;
};

export class ResultParser<TInput> {
  parse(input: TInput): ParseOutput {
    throw new Error("ResultParser.parse is an abstract method");
  }
}

type SheetConfig = {
  event: Event,
  cols: Map<ResultField, Array<string>>,
};

/**
 * Steps to matching a column to a result field (starting with just #1)
 *  1. Find exact match column name 
 *  2. For any remaining, find similar name match (ignore case differences, keyword presence)
 *  3. If mark col still unmatched, seek 1 column with >70% of cols matching expected regex
 * 
 * Each sheet config may have custom fields to be matched
 */
const DEFAULT_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, ["Age"]],
  [ResultField.FIRST_NAME, ["First Name"]],
  [ResultField.LAST_NAME, ["Last Name"]],
  [ResultField.TEAM, ["Club/Team"]],
  [ResultField.GENDER, ["Gender"]],
  [ResultField.HEAT, ["Heat"]],
  [ResultField.LANE, ["Lane"]],
  [ResultField.MARK, ["Results", "Result"]],
]);
const JOGGERS_MILE_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, ["Age"]],
  [ResultField.FIRST_NAME, ["First Name"]],
  [ResultField.LAST_NAME, ["Last Name"]],
  [ResultField.TEAM, ["Club/Team"]],
  [ResultField.GENDER, ["Gender"]],
  [ResultField.HEAT, ["Heat"]],
  [ResultField.LANE, ["Lane"]],
  [ResultField.MARK, ["Time", "Results", "Result"]],
]);

const IgnoreThisField: Array<string> = [""].filter(s => false);
const RELAY_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, IgnoreThisField],
  [ResultField.FIRST_NAME, IgnoreThisField],
  [ResultField.LAST_NAME, IgnoreThisField],
  [ResultField.TEAM, ["Team Name"]],
  [ResultField.GENDER, IgnoreThisField],
  [ResultField.HEAT, ["Heat"]],
  [ResultField.LANE, ["Lane"]],
  [ResultField.MARK, ["Results", "Result"]],
]);
const SHEET_CONFIGS: Map<string, SheetConfig> = new Map([
  ["100m", {event: Event.E100, cols: DEFAULT_COLS}],
  ["200m", {event: Event.E200, cols: DEFAULT_COLS}],
  ["400m", {event: Event.E400, cols: DEFAULT_COLS}],
  ["800m", {event: Event.E800, cols: DEFAULT_COLS}],
  ["1500m", {event: Event.E1500, cols: DEFAULT_COLS}],
  ["Mile", {event: Event.EMile, cols: DEFAULT_COLS}],
  ["Joggers Mile", {event: Event.EJoggersMile, cols: JOGGERS_MILE_COLS}],
  ["3000", {event: Event.E3000, cols: DEFAULT_COLS}],
  ["2 Mile", {event: Event.E2Mile, cols: DEFAULT_COLS}],
  ["5000m", {event: Event.E5000, cols: DEFAULT_COLS}],
  ["Triple Jump", {event: Event.ETripleJump, cols: DEFAULT_COLS}],
  ["Long Jump", {event: Event.ELongJump, cols: DEFAULT_COLS}],
  ["High Jump", {event: Event.EHighJump, cols: DEFAULT_COLS}],
  ["Pole Vault", {event: Event.EPoleVault, cols: DEFAULT_COLS}],
  ["Javelin", {event: Event.EJavelin, cols: DEFAULT_COLS}],
  ["Shot Put", {event: Event.EShotput, cols: DEFAULT_COLS}],
  ["Discus", {event: Event.EDiscus, cols: DEFAULT_COLS}],
  ["Hurdles", {event: Event.EHurdles, cols: DEFAULT_COLS}],
  ["4x100m", {event: Event.E4x100, cols: RELAY_COLS}],
  ["4x200m", {event: Event.E4x200, cols: RELAY_COLS}],
  ["4x400m", {event: Event.E4x400, cols: RELAY_COLS}],
]);

/**
 * Returns function which maps ResultField to matching cell value in a row, based
 * on the header row passed in
 */
function getFields(name: string, config: SheetConfig, headerRow: Array<CellObject>): (Array<CellObject>, ResultField) => ?string {
  const colMap = new Map<ResultField, ?number>();
  for (const [field, cols] of config.cols) {
    const idx = headerRow.findIndex(cell => cell != null && cols.includes(cell.v));
    if (idx != -1) colMap.set(field, idx);
  }
  return function (row: Array<CellObject>, field: ResultField): ?string {
    const idx = colMap.get(field);
    return (idx == null) ? null : `${row[idx].v}`;
  };
}

function getScorableForEvent(event: Event): Scorable {
  // TODO fill out once event enum is complete
  switch (event) {
    default:
      return new NullScorable();
  }
}

function parseSheet(sheetName: string, sheet: Array<Array<CellObject>>): ParseOutput {
  const config = SHEET_CONFIGS.get(sheetName);
  let results: Array<Result> = [];
  const log: Array<string> = [];
  if (config == null) {
    return {error: `Missing config for sheet name '${sheetName}'`, results, log};
  }
  if (sheet.length <= 1) return {results, log, error: null};

  const headerRow = sheet[0];
  const f = getFields(sheetName, config, headerRow);
  results = sheet.slice(1).map(row => {
    let firstName = f(row, ResultField.FIRST_NAME) ?? "No name";
    let lastName = f(row, ResultField.LAST_NAME) ?? "No name";
    let mark: ?string = f(row, ResultField.MARK);
    const resultMap: Map<ResultField, string> = new Map();
    if (mark == null) {
      // Attempts to find mark in an empty column
      if (!headerRow.includes(EMPTY_COL)) {
        log.push(`In the '${sheetName}' tab, ignoring row: ${JSON.stringify(row)}`);
        return null;
      }
      const emptyIdx = sheet[0].findIndex(cell => cell == EMPTY_COL);
      if (emptyIdx == -1) {
        log.push(`In the '${sheetName}' tab, ignoring row: ${JSON.stringify(row)}`);
        return null;
      }
      mark = `${row[emptyIdx].v}`;
    }
    return new Result(
      getScorableForEvent(config.event),
      firstName,
      lastName,
      config.event,
      mark,
    );
  }).filter(r => r != null);
  return {results, error: null, log};
}

export class GoogleSheetsResultParser extends ResultParser<Workbook> {
  parse(input: Workbook): ParseOutput {
    let results: Array<Result> = [];
    let log: Array<string> = [];
    const sheetNames = input.SheetNames;
    for (const sheetName of sheetNames) {
      const sheetResults = parseSheet(sheetName, input.Sheets[sheetName]);
      if (sheetResults.error) {
        return sheetResults;
      }
      results.push(...sheetResults.results);
      log.push(...sheetResults.log);
    }
    return {results, log, error: null};
  }
}