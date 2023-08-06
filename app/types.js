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
  PREDICTED_TIME,
};

export enum RankDirection {
  ASCENDING,
  DESCENDING,
};

export const EMPTY_COL = "__EMPTY";

export interface Scorable {
  score(mark: string, fields: Map<ResultField, string>): ?number;
}

/**
 * Represents one result of an athlete in an event. Uniquely identified by
 * {firstName, lastName, event} fields (TODO: this can break, should handle duplicate names)
 */
export class Result {
  scorable: Scorable;
  firstName: string;
  lastName: string;
  event: Event;
  mark: string;

  constructor(scorable: Scorable, firstName: string, lastName: string, event: Event, mark: string) {
    this.scorable = scorable;
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
    // TODO replace empty map with field map after refactor
    return this.scorable.score(this.mark, new Map());
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

// Beginning of attempt to add type annotations for spreadsheet library
// TODO - flesh out, fix flow typing in rest of project
export type CellObject = {
  't': string,
  'v': string,
  'r': string,
  'h': string,
  'w': string,
};