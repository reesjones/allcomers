// @flow
import { Scorables } from "./pipeline/scores";
import {str} from "./util";

export enum Event {
  // Individual track events
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
  ERaceWalk,
  E80Hurdles,
  E100Hurdles,
  E110Hurdles,
  E300Hurdles,
  E400Hurdles,
  // Field events
  EPoleVault,
  ELongJump,
  EHighJump,
  ETripleJump,
  EShotput,
  EJavelin,
  EDiscus,
  // Relays
  E4x100,
  E4x200,
  E4x400,
  EDMR,
  ESMR,
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
  HURDLE_HEIGHT,
  IMPLEMENT_WEIGHT,
  IMPLEMENT_WEIGHT_UNIT,
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
  event: Event;
  fields: Map<ResultField, string>;
  firstName: string;
  lastName: string;
  mark: string;

  constructor(scorable: Scorable, event: Event, fields: Map<ResultField, string>) {
    this.scorable = scorable;
    this.event = event;
    this.fields = fields;
    this.fields.set(ResultField.EVENT, str(event));
    this.firstName = Result._requireField(fields, ResultField.FIRST_NAME);
    this.lastName = Result._requireField(fields, ResultField.LAST_NAME);
    this.mark = Result._requireField(fields, ResultField.MARK);
  }

  static _requireField(fieldMap: Map<ResultField, string>, field: ResultField): string {
    const val = fieldMap.get(field);
    if (val == null) {
      throw new Error(`Cannot construct result; field ${str(field)} is missing`);
    }
    return val;
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
    return this.scorable.score(this.mark, this.fields);
  }

  // Returns all fields tracked by the result (subclasses may override this to add more fields)
  getFields(): Map<ResultField, string> {
    return this.fields;
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
  constructor(scorable: Scorable, event: Event, fields: Map<ResultField, string>) {
    super(Scorables.Distance, event, fields);
    const implementWeightStr = Result._requireField(fields, ResultField.IMPLEMENT_WEIGHT);
    const implementWeight = parseFloat(implementWeightStr);
    const implementWeightUnitStr = Result._requireField(fields, ResultField.IMPLEMENT_WEIGHT_UNIT);
    if (implementWeight == null || isNaN(implementWeight)) {
      throw new Error(`Implement weight value passed to ThrowResult() is not a number: ${implementWeightStr}`);
    }
    const implementWeightUnit = WeightUnit.cast(implementWeightUnitStr);
    if (implementWeightUnit == null) {
      throw new Error(`Implement weight unit value passed to ThrowResult() is not a valid WeightUnit: ${implementWeightUnitStr}`);
    }
  }
}