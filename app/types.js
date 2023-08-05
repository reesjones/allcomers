// @flow

import {str} from "./util";

export enum Event {
  // Track events (TODO complete the list)
  E100,
  E200,
  E400,
  E800,
  E1500,
  EMile,
  EJoggersMile,
  E3000,
  E2Mile,
  E5000,
  E10000,
  EHurdles,
  // Field events (TODO complete the list)
  EPoleVault,
  ELongJump,
  EHighJump,
  ETripleJump,
  EShotput,
  EJavelin,
  EDiscus,
  // Relays (TODO complete the list)
  E4x100,
  E4x200,
  E4x400,
};

export enum ResultField {
  GENDER,
  FIRST_NAME,
  LAST_NAME,
  AGE,
  TEAM,
  HEAT,
  LANE,
  EVENT,
  MARK,
};

export enum RankDirection {
  ASCENDING,
  DESCENDING,
};

export const EMPTY_COL = "__EMPTY";

export type CellObject = {
  't': string,
  'v': string,
  'r': string,
  'h': string,
  'w': string,
};

/**
 * Represents one result of an athlete in an event. Uniquely identified by
 * {firstName, lastName, event} fields (TODO: this is wrong. handle duplicate names)
 */
export class Result {
  firstName: string;
  lastName: string;
  event: Event;
  mark: string;
  _score: ?number;

  constructor(firstName: string, lastName: string, event: Event, mark: string) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.event = event;
    this.mark = mark;
  }

  key(): string {
    return `${str(this.event)}-${this.lastName}-${this.firstName}`;
  }

  /**
   * Returns the value of the field representing a number score which defines
   * the total ordering of rank. Null indicates unparsable score - ill-formatted
   * or DNS/DNF/NH/NM/etc.
   */
  getScore(): ?number {
    throw new Error("Result is an abstract class");
  }

  // Returns all fields tracked by the result (subclasses may override this to add more fields)
  getFields(): Map<ResultField, string> {
    return new Map([
      [ResultField.FIRST_NAME, this.firstName],
      [ResultField.LAST_NAME, this.lastName],
      [ResultField.EVENT, str(this.event)],
      [ResultField.MARK, this.mark],
    ]);
  }
}

export enum WeightUnit {
  G,
  KG,
  LB,
};

function DistanceScore(mark: string): ?number {
  if (/\d+\.\d+/.test(mark)) {
    return parseFloat(mark);
  }
  return null;
}

// Converts marks of feet and inches, F'i", to 12F+i (F=feet, i=inches)
// function ImperialLengthScore(mark: string): ?number {}

export class ThrowResult extends Result {
  implementWeight: number;
  implementWeightUnit: WeightUnit;
  constructor(firstName: string, lastName: string, event: Event, mark: string,
    implementWeight: number, implementWeightUnit: WeightUnit) {
    super(firstName, lastName, event, mark);
    this.implementWeight = implementWeight;
    this.implementWeightUnit = implementWeightUnit;
  }
}

export class ShotputResult extends ThrowResult {
  getScore(): ?number {
    return DistanceScore(this.mark);
  }
}