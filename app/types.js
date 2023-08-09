// @flow
import { ScoreBy } from "./pipeline/scores";
import {str, camelize} from "./util";

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
  WIND,
  PREDICTED_TIME_MINS,
  PREDICTED_TIME_SECS,
  HURDLE_HEIGHT,
  IMPLEMENT_WEIGHT,
  IMPLEMENT_WEIGHT_UNIT,
  DIVISION, // TODO remove, make this computed (getDivision())
  RANK, // TODO remove once CompiledResult used
};

export enum Gender {
  MALE,
  FEMALE,
  NONBINARY,
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
 *
 * Fields to add
 *  - place
 */
export class Result {
  mark: string;
  scorable: Scorable;
  event: Event;
  fields: Map<ResultField, string>;
  firstName: string;
  lastName: string;
  gender: ?Gender;
  wind: ?number;
  team: string;
  rank: ?number;

  constructor(scorable: Scorable, event: Event, fields: Map<ResultField, string>) {
    this.scorable = scorable;
    this.event = event;
    this.fields = fields;
    this.fields.set(ResultField.EVENT, str(event));
    this.firstName = Result._requireField(fields, ResultField.FIRST_NAME);
    this.lastName = Result._requireField(fields, ResultField.LAST_NAME);
    this.mark = Result._requireField(fields, ResultField.MARK);
    this.wind = Result._requireFloatFieldOptional(fields, ResultField.WIND);
    this.team = Result._requireField(fields, ResultField.TEAM);

    const genderStr = Result._requireField(fields, ResultField.GENDER).trim().toLowerCase();
    this.gender = null;
    if (genderStr.includes("female") || genderStr.includes("girl") || genderStr.includes("women")) {
      this.gender = Gender.FEMALE;
    } else if (genderStr.includes("binary") || genderStr == "nb") {
      this.gender = Gender.NONBINARY;
    } else if (genderStr == "male" || genderStr == "men" || genderStr.includes("boy")) {
      this.gender = Gender.MALE;
    }
    if (this.gender != null) this.fields.set(ResultField.GENDER, str(this.gender));
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

  static _requireFloatFieldOptional(fieldMap: Map<ResultField, string>, field: ResultField): ?number {
    const parsed = parseFloat(Result._requireField(fieldMap, field));
    return isNaN(parsed) ? null : parsed;
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

  getDivision(): string {
    return "Open";
  }

  // Returns all fields tracked by the result (subclasses may override this to add more fields)
  getFields(): Map<ResultField, string> {
    return this.fields;
  }

  setRank(rank: number): void {
    this.rank = rank;
    this.fields.set(ResultField.RANK, str(rank));
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
    this.fields.set(ResultField.DIVISION, this.getDivision());
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
    this.fields.set(ResultField.IMPLEMENT_WEIGHT_UNIT, str(this.implementWeightUnit));
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }

  getDivision(): string {
    return `${this.implementWeight} ${str(this.implementWeightUnit).toLowerCase()}`;
  }
}

export class TrackResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.Time, event, fields);
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }
}

export class HurdleResult extends TrackResult {
  hurdleHeightStr: string;
  hurdleHeight: ?number;
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(event, fields);
    this.hurdleHeightStr = Result._requireField(fields, ResultField.HURDLE_HEIGHT);
    const hurdleHeight = parseInt(this.hurdleHeightStr.split("(")[0].trim());
    this.hurdleHeight = isNaN(hurdleHeight) ? null : hurdleHeight;
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }

  getDivision(): string {
    return this.hurdleHeightStr;
  }
}

export class PoleVaultResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.ImperialLength, event, fields);
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }
}

export class JoggersMileResult extends Result {
  predictedTimeMins: string;
  predictedTimeSecs: string;

  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.JoggersMile, event, fields);
    this.predictedTimeMins = Result._requireField(fields, ResultField.PREDICTED_TIME_MINS);
    this.predictedTimeSecs = Result._requireField(fields, ResultField.PREDICTED_TIME_SECS);
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }
}

/**
 * A wrapper over Result classes, presenting in terms of athletic.net columns.
 */
export class CompiledResult {
  result: Result;
  constructor(result: Result) {
    this.result = result;
  }

  getType(): string {
    return "Event";
  }

  getGender(): string {
    return camelize(str(this.result.gender ?? ""));
  }

  getDivision(): string {
    return this.result.getDivision();
  }

  getEvent(): string {
    return str(this.result.event);
  }

  getPlace(): ?number {
    throw new Error("Unimplemented");
  }

  getResult(): string {
    return this.result.mark;
  }

  getTeam(): string {
    throw new Error("Unimplemented");
  }

  getFirstName1(): string {
    return "";
  }

  getLastName1(): string {
    return "";
  }

  // Optional fields
  getWind(): ?number {
    return this.result.wind;
  }

  getSeed(): ?number {
    return null;
  }

  getScore(): ?number {
    return null;
  }

  getRound(): ?number {
    return null;
  }

  getHeat(): ?number {
    return null;
  }

  getHeatPlace(): ?number {
    return null;
  }

  getRelayLetter(): ?string {
    return null;
  }

  getGrade1(): ?string {
    return null;
  }

  getGender1(): ?Gender {
    return null;
  }

  getRegId1(): ?string {
    return null;
  }

  getBirthday1(): ?string {
    return null;
  }

  getFirstName2(): ?string {
    return null;
  }

  getLastName2(): ?string {
    return null;
  }

  getGrade2(): ?string {
    return null;
  }

  getGender2(): ?Gender {
    return null;
  }

  getRegId2(): ?string {
    return null;
  }

  getBirthday2(): ?string {
    return null;
  }

  getFirstName3(): ?string {
    return null;
  }

  getLastName3(): ?string {
    return null;
  }

  getGrade3(): ?string {
    return null;
  }

  getGender3(): ?Gender {
    return null;
  }

  getRegId3(): ?string {
    return null;
  }

  getBirthday3(): ?string {
    return null;
  }

  getFirstName4(): ?string {
    return null;
  }

  getLastName4(): ?string {
    return null;
  }

  getGrade4(): ?string {
    return null;
  }

  getGender4(): ?Gender {
    return null;
  }

  getRegId4(): ?string {
    return null;
  }

  getBirthday4(): ?string {
    return null;
  }

  getFirstName5(): ?string {
    return null;
  }

  getLastName5(): ?string {
    return null;
  }

  getGrade5(): ?string {
    return null;
  }

  getGender5(): ?Gender {
    return null;
  }

  getRegId5(): ?string {
    return null;
  }

  getBirthday5(): ?string {
    return null;
  }

  getFirstName6(): ?string {
    return null;
  }

  getLastName6(): ?string {
    return null;
  }

  getGrade6(): ?string {
    return null;
  }

  getGender6(): ?Gender {
    return null;
  }

  getRegId6(): ?string {
    return null;
  }

  getBirthday6(): ?string {
    return null;
  }

  getFirstName7(): ?string {
    return null;
  }

  getLastName7(): ?string {
    return null;
  }

  getGrade7(): ?string {
    return null;
  }

  getGender7(): ?Gender {
    return null;
  }

  getRegId7(): ?string {
    return null;
  }

  getBirthday7(): ?string {
    return null;
  }

  getFirstName8(): ?string {
    return null;
  }

  getLastName8(): ?string {
    return null;
  }

  getGrade8(): ?string {
    return null;
  }

  getGender8(): ?Gender {
    return null;
  }

  getRegId8(): ?string {
    return null;
  }

  getBirthday8(): ?string {
    return null;
  }
}

export class CompiledTrackResult extends CompiledResult {
  constructor(
    res: TrackResult,
  ) {
    super(res);
  }

  getDivision(): string {
    throw new Error("Unimplemented");
  }
}

// Types of results (specifies scoring and unique field requirements)
// Division result (default is Open)
// Track results with wind mark (100, 200, hurdles <400m)
// Field events with wind mark (long jump, triple jump)
