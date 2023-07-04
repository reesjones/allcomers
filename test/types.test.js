// @flow
import {
  Event,
  WeightUnit,
  ShotputResult,
} from '../app/types'
// $FlowFixMe imports correctly. Just for IDE
import {test, expect} from '@jest/globals'

test('ShotputResult scores shotput mark correctly', () => {
  const expectedMark = 11.34;
  const shot = new ShotputResult("Jon", "Doe", Event.EShotput, expectedMark.toString(), 4, WeightUnit.KG);
  const dnf = new ShotputResult("Jon", "Doe", Event.EShotput, "DNF", 4, WeightUnit.KG);
  const dns = new ShotputResult("Jon", "Doe", Event.EShotput, "DNS", 4, WeightUnit.KG);
  const nm = new ShotputResult("Jon", "Doe", Event.EShotput, "NM", 4, WeightUnit.KG);
  expect(shot.getScore()).toBe(expectedMark);
  expect(dnf.getScore()).toBe(null);
  expect(dns.getScore()).toBe(null);
  expect(nm.getScore()).toBe(null);
});