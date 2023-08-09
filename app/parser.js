// @flow
'use client'

import type { CellObject_t, Workbook_t} from './xlsx_types';
import type { Scorable } from "./types";
import {
  DistanceScorable,
  ImperialLengthScorable,
  JoggersMileScorable,
  ScoreBy,
  TimeScorable,
} from "./pipeline/scores";

import {
  Event,
  ResultField,
  Result,
  EMPTY_COL,
  JumpResult,
  ThrowResult,
  TrackResult,
  PoleVaultResult,
  JoggersMileResult,
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
  getEvent: (Map<ResultField, string>) => ?Event,
  cols: Map<ResultField, Array<string>>,
};

function EVENT(e: Event): (Map<ResultField, string>) => ?Event {
  return (_: Map<ResultField, string>) => e;
}

function getEventForHurdlesTab(fields: Map<ResultField, string>): ?Event {
  const hurdleHeight = fields.get(ResultField.HURDLE_HEIGHT);
  if (hurdleHeight == null) {
    console.log("Couldn't determine hurdle event from row: ", fields);
    return null;
  }

  if (hurdleHeight.includes("100m")) {
    return Event.E100Hurdles;
  } else if (hurdleHeight.includes("110HH")) {
    return Event.E110Hurdles;
  } else if (hurdleHeight.includes("80m")) {
    return Event.E80Hurdles;
  } else {
    console.log("Couldn't determine hurdle event from row: ", fields);
    return null;
  }
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
  [ResultField.WIND, ["Wind", "Wind speed", "Windspeed"]],
  [ResultField.MARK, ["Results", "Result"]],
  [ResultField.IMPLEMENT_WEIGHT, ["Implement Size", "Implement"]],
  [ResultField.IMPLEMENT_WEIGHT_UNIT, ["Implement Size", "Implement"]],
]);

const HURDLES_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, ["Age"]],
  [ResultField.FIRST_NAME, ["First Name"]],
  [ResultField.LAST_NAME, ["Last Name"]],
  [ResultField.TEAM, ["Club/Team"]],
  [ResultField.GENDER, ["Gender"]],
  [ResultField.HEAT, ["Heat"]],
  [ResultField.LANE, ["Lane"]],
  [ResultField.MARK, ["Results", "Result"]],
  [ResultField.HURDLE_HEIGHT, ["Hurdle Height: Inches", "Event Hurdle Height: Inches"]],
]);

const JOGGERS_MILE_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, ["Age"]],
  [ResultField.FIRST_NAME, ["First Name"]],
  [ResultField.LAST_NAME, ["Last Name"]],
  [ResultField.TEAM, ["Club/Team"]],
  [ResultField.GENDER, ["Gender"]],
  [ResultField.HEAT, ["Heat"]],
  [ResultField.LANE, ["Lane"]],
  [ResultField.PREDICTED_TIME_MINS, ["Predicted Time: Minutes", "Time: Minutes"]],
  [ResultField.PREDICTED_TIME_SECS, ["Predicted Time: Seconds", "Time: Seconds"]],
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
  ["100m", {getEvent: EVENT(Event.E100), cols: DEFAULT_COLS}],
  ["200m", {getEvent: EVENT(Event.E200), cols: DEFAULT_COLS}],
  ["400m", {getEvent: EVENT(Event.E400), cols: DEFAULT_COLS}],
  ["800m", {getEvent: EVENT(Event.E800), cols: DEFAULT_COLS}],
  ["1500m", {getEvent: EVENT(Event.E1500), cols: DEFAULT_COLS}],
  ["Mile", {getEvent: EVENT(Event.EMile), cols: DEFAULT_COLS}],
  ["Joggers Mile", {getEvent: EVENT(Event.EJoggersMile), cols: JOGGERS_MILE_COLS}],
  ["3000", {getEvent: EVENT(Event.E3000), cols: DEFAULT_COLS}],
  ["2 Mile", {getEvent: EVENT(Event.E2Mile), cols: DEFAULT_COLS}],
  ["5000m", {getEvent: EVENT(Event.E5000), cols: DEFAULT_COLS}],
  ["Triple Jump", {getEvent: EVENT(Event.ETripleJump), cols: DEFAULT_COLS}],
  ["Long Jump", {getEvent: EVENT(Event.ELongJump), cols: DEFAULT_COLS}],
  ["High Jump", {getEvent: EVENT(Event.EHighJump), cols: DEFAULT_COLS}],
  ["Pole Vault", {getEvent: EVENT(Event.EPoleVault), cols: DEFAULT_COLS}],
  ["Javelin", {getEvent: EVENT(Event.EJavelin), cols: DEFAULT_COLS}],
  ["Shot Put", {getEvent: EVENT(Event.EShotput), cols: DEFAULT_COLS}],
  ["Discus", {getEvent: EVENT(Event.EDiscus), cols: DEFAULT_COLS}],
  ["Hurdles", {getEvent: getEventForHurdlesTab, cols: HURDLES_COLS}],
  ["4x100m", {getEvent: EVENT(Event.E4x100), cols: RELAY_COLS}],
  ["4x200m", {getEvent: EVENT(Event.E4x200), cols: RELAY_COLS}],
  ["4x400m", {getEvent: EVENT(Event.E4x400), cols: RELAY_COLS}],
]);

/**
 * Returns function which maps ResultField to matching cell value in a row, based
 * on the header row passed in
 */
function getFields(name: string, config: SheetConfig, headerRow: Array<CellObject_t>): (Array<CellObject_t>, ResultField) => ?string {
  const colMap = new Map<ResultField, ?number>();
  for (const [field, cols] of config.cols) {
    const colsNorm = cols.map(c => c.trim().toLowerCase());
    const idx = headerRow.findIndex(cell => cell != null && colsNorm.includes(cell.v.trim().toLowerCase()));
    if (idx != -1) colMap.set(field, idx);
  }
  return function (row: Array<CellObject_t>, field: ResultField): ?string {
    const idx = colMap.get(field);
    return (idx == null) ? null : `${row[idx].v ?? ""}`;
  };
}

function constructResultForEvent(event: Event, fields: Map<ResultField, string>): Result {
  switch (event) {
    case Event.E100:
    case Event.E200:
    case Event.E400:
    case Event.E800:
    case Event.E1500:
    case Event.EMile:
    case Event.E3000:
    case Event.E2Mile:
    case Event.E5000:
    case Event.E10000:
    case Event.ERaceWalk:
    case Event.E80Hurdles:
    case Event.E100Hurdles:
    case Event.E110Hurdles:
    case Event.E300Hurdles:
    case Event.E400Hurdles:
    case Event.E4x100:
    case Event.E4x200:
    case Event.E4x400:
    case Event.EDMR:
    case Event.ESMR:
      return new TrackResult(event, fields);
    case Event.EShotput:
    case Event.EJavelin:
    case Event.EDiscus:
      return new ThrowResult(event, fields);
    case Event.ELongJump:
    case Event.EHighJump:
    case Event.ETripleJump:
      return new JumpResult(event, fields);
    case Event.EPoleVault:
      return new PoleVaultResult(event, fields);
    case Event.EJoggersMile:
      return new JoggersMileResult(event, fields);
  }
}

function findFirstEmptyCell(row: Array<CellObject_t>) {
  for (let i = 0; i < row.length; i++) {
    if (row[i].v.length == 0) return i;
  }
  return -1;
}

/**
 * Yields results, returns array of log lines
 */
function *genResults(
  sheetName: string,
  config: SheetConfig,
  sheet: Array<Array<CellObject_t>>,
  resultRows: Array<Array<CellObject_t>>,
  log: (msg: string) => void,
): Iterator<Result> {
  const headerRow = sheet[0];
  const f = getFields(sheetName, config, headerRow);
  for (const row of resultRows) {
    let firstName = f(row, ResultField.FIRST_NAME) ?? "No name";
    let lastName = f(row, ResultField.LAST_NAME) ?? "No name";
    let mark: ?string = f(row, ResultField.MARK);
    const resultMap: Map<ResultField, string> = new Map();
    if (mark == null) {
      // Attempts to find mark in an empty column
      const emptyIdx = findFirstEmptyCell(headerRow);
      if (emptyIdx === -1) {
        log(`In the '${sheetName}' tab, ignoring row: ${JSON.stringify(row)}`);
        continue;
      }
      mark = `${row[emptyIdx].v}`;
    }
    const fields: Map<ResultField, string> = new Map();
    fields.set(ResultField.FIRST_NAME, f(row, ResultField.FIRST_NAME) ?? "");
    fields.set(ResultField.LAST_NAME, f(row, ResultField.LAST_NAME) ?? "");
    fields.set(ResultField.MARK, mark);
    fields.set(ResultField.GENDER, f(row, ResultField.GENDER) ?? "");
    fields.set(ResultField.WIND, f(row, ResultField.WIND) ?? "");

    const norm = sheetName.toLowerCase().trim();
    if (norm == "hurdles") {
      fields.set(ResultField.HURDLE_HEIGHT, f(row, ResultField.HURDLE_HEIGHT) ?? "");
    } else if (norm.includes("jogger") && norm.includes("mile")) {
      const mins = f(row, ResultField.PREDICTED_TIME_MINS) ?? "";
      const secs = f(row, ResultField.PREDICTED_TIME_SECS) ?? "";
      fields.set(ResultField.PREDICTED_TIME_MINS, mins);
      fields.set(ResultField.PREDICTED_TIME_SECS, secs);
    } else if ((norm.includes("shot") && norm.includes("put")) || norm.includes("discus") || norm.includes("javelin")) {
      const weight = f(row, ResultField.IMPLEMENT_WEIGHT) ?? "";
      const weightUnit = f(row, ResultField.IMPLEMENT_WEIGHT_UNIT) ?? "";
      fields.set(ResultField.IMPLEMENT_WEIGHT, weight);
      fields.set(ResultField.IMPLEMENT_WEIGHT_UNIT, weightUnit);
    }

    const event = config.getEvent(fields);
    if (event == null) continue;
    yield constructResultForEvent(event, fields);
  }
}

function parseSheet(sheetName: string, sheet: Array<Array<CellObject_t>>): ParseOutput {
  const config = SHEET_CONFIGS.get(sheetName);
  let results: Array<Result> = [];
  const log: Array<string> = [];
  if (config == null) {
    return {error: `Missing config for sheet name '${sheetName}'`, results, log};
  }
  if (sheet.length <= 1) return {results, log, error: null};

  const headerRow = sheet[0];
  const f = getFields(sheetName, config, headerRow);
  const resultRows: Array<Array<CellObject_t>> = sheet.slice(1);
  results = Array.from(genResults(
    sheetName, config, sheet, resultRows, (msg: string) => {log.push(msg);}));
  return {results, error: null, log};
}

export class GoogleSheetsResultParser extends ResultParser<Workbook_t> {
  parse(input: Workbook_t): ParseOutput {
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