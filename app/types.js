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

  getRank(): ?number {
    const rank = parseInt(this.fields.get(ResultField.RANK));
    return (isNaN(rank) || rank == null) ? null : rank;
  }

  setRank(rank: number): void {
    this.rank = rank;
    this.fields.set(ResultField.RANK, str(rank));
  }

  getMark(): string {
    return this.mark;
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

  getMark(): string {
    const mark = super.getMark();
    if (mark.length == 0) return mark;
    const markFloat = parseFloat(mark);
    return `${markFloat.toFixed(2)}m`;
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
    if (implementWeightUnitStr == "KGS") implementWeightUnitStr = "KG";
    if (implementWeightUnitStr == "GS") implementWeightUnitStr = "G";
    if (implementWeightUnitStr == "LBS") implementWeightUnitStr = "LB";
    if (implementWeightUnitStr == "L") implementWeightUnitStr = "LB";
    if (implementWeightUnitStr == "B") implementWeightUnitStr = "LB";
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

  getMark(): string {
    const mark = super.getMark();
    if (mark.length == 0) return mark;
    const markFloat = parseFloat(mark);
    return `${markFloat.toFixed(2)}m`;
  }
}

export class TrackResult extends Result {
  constructor(event: Event, fields: Map<ResultField, string>) {
    super(ScoreBy.Time, event, fields);
    this.fields.set(ResultField.DIVISION, this.getDivision());
  }

  getMark(): string {
    const mark = super.getMark();
    if (mark.length == 0) return mark;
    const parts = mark.split(":");
    const secs = parseFloat(parts[parts.length-1]);
    if (isNaN(secs) || secs == null) return mark;
    return [
      ...parts.slice(0, parts.length-1),
      secs < 10 ? `0${secs.toFixed(2)}` : secs.toFixed(2),
    ].join(":");
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

  getFields(): Map<string, string> {
    return new Map([
      ["Type", this.getType()],
      ["Gender", this.getGender()],
      ["[Division]", this.getDivision()],
      ["Event", this.getEventName()],
      ["[Seed]", this.getSeed()],
      ["[Score]", this.getScore()],
      ["[Round]", this.getRound()],
      ["[Heat]", this.getHeat()],
      ["[Wind]", this.getWind()],
      ["[HeatPlace]", this.getHeatPlace()],
      ["[Place]", this.getRank()],
      ["Result", this.getResult()],
      ["Team", this.getTeam()],
      ["[RelayLetter]", this.getRelayLetter()],
      ["FirstName1", this.getFirstName1()],
      ["LastName1", this.getLastName1()],
      ["Grade1", this.getGrade1()],
      ["Gender1", this.getGender1()],
      ["RegId1", this.getRegId1()],
      ["Birthdate1", this.getBirthday1()],
      ["FirstName2", this.getFirstName2()],
      ["LastName2", this.getLastName2()],
      ["Grade2", this.getGrade2()],
      ["Gender2", this.getGender2()],
      ["RegId2", this.getRegId2()],
      ["Birthdate2", this.getBirthday2()],
      ["FirstName3", this.getFirstName3()],
      ["LastName3", this.getLastName3()],
      ["Grade3", this.getGrade3()],
      ["Gender3", this.getGender3()],
      ["RegId3", this.getRegId3()],
      ["Birthdate3", this.getBirthday3()],
      ["FirstName4", this.getFirstName4()],
      ["LastName4", this.getLastName4()],
      ["Grade4", this.getGrade4()],
      ["Gender4", this.getGender4()],
      ["RegId4", this.getRegId4()],
      ["Birthdate4", this.getBirthday4()],
      ["FirstName5", this.getFirstName5()],
      ["LastName5", this.getLastName5()],
      ["Grade5", this.getGrade5()],
      ["Gender5", this.getGender5()],
      ["RegId5", this.getRegId5()],
      ["Birthdate5", this.getBirthday5()],
      ["FirstName6", this.getFirstName6()],
      ["LastName6", this.getLastName6()],
      ["Grade6", this.getGrade6()],
      ["Gender6", this.getGender6()],
      ["RegId6", this.getRegId6()],
      ["Birthdate6", this.getBirthday6()],
      ["FirstName7", this.getFirstName7()],
      ["LastName7", this.getLastName7()],
      ["Grade7", this.getGrade7()],
      ["Gender7", this.getGender7()],
      ["RegId7", this.getRegId7()],
      ["Birthdate7", this.getBirthday7()],
      ["FirstName8", this.getFirstName8()],
      ["LastName8", this.getLastName8()],
      ["Grade8", this.getGrade8()],
      ["Gender8", this.getGender8()],
      ["RegId8", this.getRegId8()],
      ["Birthdate8", this.getBirthday8()],
    ]);
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

  getRank(): string {
    return `${this.result.getRank() ?? ""}`;
  }

  getResult(): string {
    return this.result.getMark();
  }

  getTeam(): string {
    return this.result.team;
  }

  getFirstName1(): string {
    return this.result.firstName;
  }

  getLastName1(): string {
    return this.result.lastName;
  }

  // Optional fields
  getWind(): string {
    return `${this.result.wind ?? ""}`;
  }
  
  getEventName(): string {
    const event = this.result.event;
    switch (event) {
      case Event.E100:
      case Event.E200:
      case Event.E400:
      case Event.E800:
      case Event.E1500:
      case Event.E3000:
      case Event.E5000:
      case Event.E10000:
      case Event.E4x100:
      case Event.E4x200:
      case Event.E4x400:
        return `${str(event).slice(1)}m`;
      case Event.EMile:
      case Event.E2Mile:
      case Event.EDMR:
      case Event.ESMR:
      case Event.EJavelin:
      case Event.EDiscus:
        return str(event).slice(1);
      case Event.ERaceWalk:
        return "Race Walk";
      case Event.E80Hurdles:
        return "80m Hurdles";
      case Event.E100Hurdles:
        return "100m Hurdles";
      case Event.E110Hurdles:
        return "110m Hurdles";
      case Event.E300Hurdles:
        return "300m Hurdles";
      case Event.E400Hurdles:
        return "400m Hurdles";
      case Event.EShotput:
        return "Shot Put";
      case Event.ELongJump:
        return "Long Jump";
      case Event.EHighJump:
        return "High Jump";
      case Event.ETripleJump:
        return "Triple Jump";
      case Event.EPoleVault:
        return "Pole Vault";
      case Event.EJoggersMile:
        return "Joggers Mile";
    }
  }

  getSeed(): string{
    return "";
  }

  getScore(): string {
    return "";
  }

  getRound(): string {
    return "";
  }

  getHeat(): string {
    return "";
  }

  getHeatPlace(): string {
    return "";
  }

  getRelayLetter(): string {
    return "";
  }

  getGrade1(): string {
    return "";
  }

  getGender1(): string {
    return "";
  }

  getRegId1(): string {
    return "";
  }

  getBirthday1(): string {
    return "";
  }

  getFirstName2(): string {
    return "";
  }

  getLastName2(): string {
    return "";
  }

  getGrade2(): string {
    return "";
  }

  getGender2(): string {
    return "";
  }

  getRegId2(): string {
    return "";
  }

  getBirthday2(): string {
    return "";
  }

  getFirstName3(): string {
    return "";
  }

  getLastName3(): string {
    return "";
  }

  getGrade3(): string {
    return "";
  }

  getGender3(): string {
    return "";
  }

  getRegId3(): string {
    return "";
  }

  getBirthday3(): string {
    return "";
  }

  getFirstName4(): string {
    return "";
  }

  getLastName4(): string {
    return "";
  }

  getGrade4(): string {
    return "";
  }

  getGender4(): string {
    return "";
  }

  getRegId4(): string {
    return "";
  }

  getBirthday4(): string {
    return "";
  }

  getFirstName5(): string {
    return "";
  }

  getLastName5(): string {
    return "";
  }

  getGrade5(): string {
    return "";
  }

  getGender5(): string {
    return "";
  }

  getRegId5(): string {
    return "";
  }

  getBirthday5(): string {
    return "";
  }

  getFirstName6(): string {
    return "";
  }

  getLastName6(): string {
    return "";
  }

  getGrade6(): string {
    return "";
  }

  getGender6(): string {
    return "";
  }

  getRegId6(): string {
    return "";
  }

  getBirthday6(): string {
    return "";
  }

  getFirstName7(): string {
    return "";
  }

  getLastName7(): string {
    return "";
  }

  getGrade7(): string {
    return "";
  }

  getGender7(): string {
    return "";
  }

  getRegId7(): string {
    return "";
  }

  getBirthday7(): string {
    return "";
  }

  getFirstName8(): string {
    return "";
  }

  getLastName8(): string {
    return "";
  }

  getGrade8(): string {
    return "";
  }

  getGender8(): string {
    return "";
  }

  getRegId8(): string {
    return "";
  }

  getBirthday8(): string {
    return "";
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