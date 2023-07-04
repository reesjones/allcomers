// @flow
'use client'
import {
  Event,
  ResultField,
  Result,
  EMPTY_COL,
} from "./types";
// $FlowFixMe avoids "module not found"
import * as XLSX from 'xlsx';
// $FlowFixMe avoids "module not found". Importing types separately helps flow
import {Workbook, Worksheet} from 'xlsx';

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

function getFields(sheet: Worksheet, config: SheetConfig): (any, ResultField) => ?string {
  return function (row: Object, field: ResultField): ?string {
    const colnames = config.cols.get(field);
    if (colnames == null) {
      throw new Error(
        `Missing column '${ResultField.getName(field)}' in sheet config for ` +
        `event ${Event.getName(config.event)}`
      );
    }
    for (const col of colnames) {
      if (Object.keys(row).includes(col)) {
        return row[col];
      }
    }
    return null;
  };
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
const RELAY_COLS: Map<ResultField, Array<string>> = new Map<ResultField, Array<string>>([
  [ResultField.AGE, [""]],
  [ResultField.FIRST_NAME, [""]],
  [ResultField.LAST_NAME, [""]],
  [ResultField.TEAM, ["Team Name"]],
  [ResultField.GENDER, [""]],
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
  ["Joggers Mile", {event: Event.EJoggersMile, cols: DEFAULT_COLS}],
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

function parseSheet(sheetName: string, sheet: Worksheet): ParseOutput {
  const json = XLSX.utils.sheet_to_json(sheet);
  const config = SHEET_CONFIGS.get(sheetName);
  const results: Array<Result> = [];
  const log: Array<string> = [];
  if (config == null) {
    return {error: `Missing config for sheet name '${sheetName}'`, results, log};
  }
  const f = getFields(sheet, config);
  results.push(...json.map(row => {
    let firstName = f(row, ResultField.FIRST_NAME) ?? "No name";
    let lastName = f(row, ResultField.LAST_NAME) ?? "No name";
    let mark: ?string = f(row, ResultField.MARK);
    if (mark == null) {
      if (Object.keys(row).includes(EMPTY_COL)) {
        mark = row[EMPTY_COL];
      } else {
        log.push(`In the '${sheetName}' tab, ignoring row: ${JSON.stringify(row)}`);
        return null;
      }
    }
    return new Result(
      firstName,
      lastName,
      config.event,
      mark,
    );
  }).filter(r => r != null));
  return {results, error: null, log};
}

const EXCLUDE_SHEETS = ["Worksheet", "Instructions", "Final Compiled"];

export class GoogleSheetsResultParser extends ResultParser<ArrayBuffer> {
  parse(input: ArrayBuffer): ParseOutput {
    const wb = XLSX.read(input, {dense: true});
    let results: Array<Result> = [];
    let log: Array<string> = [];
    const sheetNames = wb.SheetNames.filter(sn => !EXCLUDE_SHEETS.includes(sn));
    for (const sheetName of sheetNames) {
      const sheetResults = parseSheet(sheetName, wb.Sheets[sheetName]);
      if (sheetResults.error) {
        return sheetResults;
      }
      results.push(...sheetResults.results);
      log.push(...sheetResults.log);
    }
    return {results, log, error: null};
  }
}