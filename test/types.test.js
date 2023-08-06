// @flow
import {
  DistanceScorable,
  ImperialLengthScorable,
  JoggersMileScorable,
  TimeScorable,
} from "../app/pipeline/scores";
import {
  Event,
  ResultField,
} from '../app/types'
import type {Scorable} from '../app/types'
// $FlowFixMe The imports are correct
import {test, expect} from '@jest/globals'

const EMPTY_MAP: Map<ResultField, string> = new Map();
// TODO: after Result refactor, instantiate as JoggersMileResult().getFields()
const JOGGERS_MAP: Map<ResultField, string> = new Map([
  [ResultField.PREDICTED_TIME, "6:00"],
]);

function testNullScores(s: Scorable): void {
  expect(s.score("", EMPTY_MAP)).toBe(null);
  expect(s.score("DNF", EMPTY_MAP)).toBe(null);
  expect(s.score("DNS", EMPTY_MAP)).toBe(null);
  expect(s.score("NM", EMPTY_MAP)).toBe(null);
  expect(s.score("NH", EMPTY_MAP)).toBe(null);
  expect(s.score(" ", EMPTY_MAP)).toBe(null);
  expect(s.score(":", EMPTY_MAP)).toBe(null);
  expect(s.score(".", EMPTY_MAP)).toBe(null);
  expect(s.score("-", EMPTY_MAP)).toBe(null);
  expect(s.score("foo", EMPTY_MAP)).toBe(null);
}

test('TimeScorable scores mark correctly', () => {
  const s = new TimeScorable();
  expect(s.score("11.34", EMPTY_MAP)).toBe(11.34);
  expect(s.score("12", EMPTY_MAP)).toBe(12.0);
  expect(s.score("12.0", EMPTY_MAP)).toBe(12.0);
  expect(s.score("1:05.3", EMPTY_MAP)).toBe(65.3);
  expect(s.score(" 1:05.3      ", EMPTY_MAP)).toBe(65.3);
  expect(s.score("10:36.36", EMPTY_MAP)).toBe(636.36);
  expect(s.score("10:00", EMPTY_MAP)).toBe(600.0);
  expect(s.score("10:00.01", EMPTY_MAP)).toBe(600.01);
  expect(s.score("10:00.00", EMPTY_MAP)).toBe(600.0);
  expect(s.score("1:01:54.32", EMPTY_MAP)).toBe(3714.32);
  expect(s.score("0:50.60", EMPTY_MAP)).toBe(50.6);
  expect(s.score("0:0:50.60", EMPTY_MAP)).toBe(50.6);

  testNullScores(s);
});

test('DistanceScorable scores mark correctly', () => {
  const s = new DistanceScorable();
  expect(s.score("11.34", EMPTY_MAP)).toBe(11.34);
  expect(s.score("12", EMPTY_MAP)).toBe(12.0);
  expect(s.score("0", EMPTY_MAP)).toBe(0.0);
  expect(s.score("0.1", EMPTY_MAP)).toBe(0.1);
  expect(s.score("12.0", EMPTY_MAP)).toBe(12.0);
  expect(s.score("12.0000", EMPTY_MAP)).toBe(12.0);
  expect(s.score("  12.0    ", EMPTY_MAP)).toBe(12.0);

  testNullScores(s);
});

test('ImperialLengthScorable scores mark correctly', () => {
  const s = new ImperialLengthScorable();
  expect(s.score("10'4\"", EMPTY_MAP)).toBe(124);
  expect(s.score("10'4", EMPTY_MAP)).toBe(124);
  expect(s.score("10' 4\"", EMPTY_MAP)).toBe(124);
  expect(s.score("10' 4", EMPTY_MAP)).toBe(124);
  expect(s.score("10'", EMPTY_MAP)).toBe(120);
  expect(s.score("6\"", EMPTY_MAP)).toBe(6);
  expect(s.score("10' 4\" foo", EMPTY_MAP)).toBe(124);
  expect(s.score("   10' 4\"    ", EMPTY_MAP)).toBe(124);

  testNullScores(s);
  expect(s.score("6", EMPTY_MAP)).toBe(null);
});

test('JoggersMileScorable scores mark correctly', () => {
  const s = new JoggersMileScorable();
  expect(s.score("6:00", JOGGERS_MAP)).toBe(0);
  expect(s.score("6:00.0", JOGGERS_MAP)).toBe(0);
  expect(s.score("6:00.01", JOGGERS_MAP)).toBe(1);
  expect(s.score("6:01", JOGGERS_MAP)).toBe(1);
  expect(s.score("5:59", JOGGERS_MAP)).toBe(-1);
  expect(s.score("5:59.01", JOGGERS_MAP)).toBe(0);

  testNullScores(s);
  expect(s.score("6:00", EMPTY_MAP)).toBe(null);
  expect(s.score("6", JOGGERS_MAP)).toBe(null);
  expect(s.score(":5", JOGGERS_MAP)).toBe(null);
  expect(s.score("5:", JOGGERS_MAP)).toBe(null);
});