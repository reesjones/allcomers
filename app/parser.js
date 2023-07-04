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

export class ResultParser<TInput> {
  parse(input: TInput): Array<Result> {
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
 * Steps to matching a column to a result field:
 *  1. Find exact match column name 
 *  2. For any remaining, find similar name match (ignore case differences, keyword presence)
 *  3. If mark col still unmatched, seek 1 column with >70% of cols matching expected regex
 * 
 * Each sheet config has custom fields to be matched
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
]);

function parseSheet(sheetName: string, sheet: Worksheet): Array<Result> {
  const json = XLSX.utils.sheet_to_json(sheet);
  const config = SHEET_CONFIGS.get(sheetName);
  if (config == null) {
    console.log(`Missing config for sheet name '${sheetName}'`);
    return [];
  }
  const f = getFields(sheet, config);
  const out = json.map(row => {
    let firstName = f(row, ResultField.FIRST_NAME) ?? "Error";
    let lastName = f(row, ResultField.LAST_NAME) ?? "Error";
    let mark: ?string = f(row, ResultField.MARK);
    if (mark == null) {
      if (Object.keys(row).includes(EMPTY_COL)) {
        mark = row[EMPTY_COL];
      } else {
        console.log(`In the '${sheetName}' tab, ignoring row: ${JSON.stringify(row)}`);
        return null;
      }
    }
    return new Result(
      firstName,
      lastName,
      config.event,
      mark,
    );
  }).filter(r => r != null);
  return out;
}

const EXCLUDE_SHEETS = ["Worksheet", "Instructions", "Final Compiled", "4x100m", "4x400m"];

export class GoogleSheetsResultParser extends ResultParser<ArrayBuffer> {
  parse(input: ArrayBuffer): Array<Result> {
    const wb = XLSX.read(input, {dense: true});
    let out: Array<Result> = [];
    const sheetNames = wb.SheetNames.filter(sn => !EXCLUDE_SHEETS.includes(sn));
    for (const sheetName of sheetNames) {
      out = out.concat(parseSheet(sheetName, wb.Sheets[sheetName]));
    }
    return out;
  }
}