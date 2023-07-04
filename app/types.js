// @flow

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

export enum SortDirection {
  ASCENDING,
  DESCENDING,
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

export const EMPTY_COL = "__EMPTY";

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
    return `${(this.event: string)}-${this.lastName}-${this.firstName}`;
  }

  // Returns the value of the field representing a number score which defines
  // the total ordering of rank. Null indicates no score (DNS, DNF, NM, NH, etc.)
  getScore(): ?number {
    throw new Error("Result is an abstract class")
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

// function ImperialHeightScore(mark: string): ?number {}

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