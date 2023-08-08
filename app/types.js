// @flow
import { ScoreBy } from "./pipeline/scores";
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
  PREDICTED_TIME_MINS,
  PREDICTED_TIME_SECS,
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

  static _requireFloatField(fieldMap: Map<ResultField, string>, field: ResultField): number {
    const val = Result._requireField(fieldMap, field);
    const parsed = parseFloat(val);
    if (isNaN(parsed)) {
      throw new Error(`Cannot construct result with ${str(field)} field value of ${val}`);
    }
    return parsed;
  }

  static _requireIntField(fieldMap: Map<ResultField, string>, field: ResultField): number {
    const val = Result._requireField(fieldMap, field);
    const parsed = parseInt(val);
    if (isNaN(parsed)) {
      throw new Error(`Cannot construct result with ${str(field)} field value of ${val}`);
    }
    return parsed;
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

export class JumpResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.Distance, event, fields);
  }
}

export class ThrowResult extends Result {
  implementWeight: number;
  implementWeightUnit: WeightUnit;

  // TODO: Add event param validation
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.Distance, event, fields);
    this.implementWeight = Result._requireFloatField(fields, ResultField.IMPLEMENT_WEIGHT);
    let implementWeightUnitStr = Result._requireField(fields, ResultField.IMPLEMENT_WEIGHT_UNIT)
      .replace(/[^A-Za-z]/g, '').toUpperCase();
    if (implementWeightUnitStr == "K") implementWeightUnitStr = "KG";
    const implementWeightUnit = WeightUnit.cast(implementWeightUnitStr);
    if (implementWeightUnit == null) {
      throw new Error(`Implement weight unit value passed to ThrowResult() is not a valid WeightUnit: ${implementWeightUnitStr}`);
    }
    this.implementWeightUnit = implementWeightUnit;
    this.fields.set(ResultField.IMPLEMENT_WEIGHT, `${this.implementWeight}`);
    this.fields.set(ResultField.IMPLEMENT_WEIGHT_UNIT, `${str(this.implementWeightUnit)}`);
  }
}

export class TrackResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.Time, event, fields);
  }
}

export class PoleVaultResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.ImperialLength, event, fields);
  }
}

export class JoggersMileResult extends Result {
  predictedTimeMins: string;
  predictedTimeSecs: string;

  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.JoggersMile, event, fields);
    this.predictedTimeMins = Result._requireField(fields, ResultField.PREDICTED_TIME_MINS);
    this.predictedTimeSecs = Result._requireField(fields, ResultField.PREDICTED_TIME_SECS);
  }
}

// Types of results (specifies scoring and unique field requirements)
// Division result (default is Open)
// Track results with wind mark (100, 200, hurdles <400m)
// Field events with wind mark (long jump, triple jump)

/**
 * Fields to add
 * gender
 * division
 * wind
 * place
 * team
 */