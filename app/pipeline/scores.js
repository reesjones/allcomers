// @flow
import type {Scorable} from '../types'
import {ResultField} from '../types'

import assert from "assert";

/**
 * Scores mark as integer or floating point number, null if not integral
 * or if the point sinks.
 * Examples: 11.34, 12, 12.0, 0.01, .01, 0
 */
export class DistanceScorable implements Scorable {
  score(mark: string, _: Map<ResultField, string>): ?number {
    if (/\d+\.\d+/.test(mark)) {
      return parseFloat(mark);
    } else if (/\d+/.test(mark)) {
      return parseInt(mark);
    }
    return null;
  }
}

/**
 * Scores mark as time, in H:M:s.xx format (H and M may be omitted, including
 * colons)
 * Examples: 15:45.12 or 10:00 or 22.19 or 33.0 or 55 or 3:04
 */
export class TimeScorable implements Scorable {
  static TIME_MULTIPLIERS: Array<number> = [1, 60, 3600];
  score(mark: string, _: Map<ResultField, string>): ?number {
    return this.scoreAsSeconds(mark, _);
  }

  /**
   * score() only guarantees total ordering (with ties), doesn't guarantee unit
   * such as seconds. Expose second-based score as score()-independent utility
   * for other Scorables
   */
  scoreAsSeconds(mark: string, _: Map<ResultField, string>): ?number {
    const parts = mark.split(":");
    assert(parts.length <= 3);
    let total = 0.0;
    for (let off = 0; off < parts.length; off++) {
      const idx = parts.length - off - 1;
      const parsed = parseFloat(parts[idx]);
      if (isNaN(parsed)) return null;
      total += parsed * TimeScorable.TIME_MULTIPLIERS[off];
    }
    return total;
  }
}

/**
 * Scores Joggers Mile as difference between actual and predicted time. Rounds
 * up actual time to nearest second.
 */
export class JoggersMileScorable implements Scorable {
  static timeScorable: TimeScorable = new TimeScorable();
  score(mark: string, fields: Map<ResultField, string>): ?number {
    if (mark.split(":").length != 2) return null;
    const predMin = parseInt(fields.get(ResultField.PREDICTED_TIME_MINS));
    const predSec = Math.ceil(parseFloat(fields.get(ResultField.PREDICTED_TIME_SECS)));
    if (isNaN(predMin) || isNaN(predSec)) return null;
    const actualTotalSecs = JoggersMileScorable.timeScorable.scoreAsSeconds(mark, fields);
    if (actualTotalSecs == null) return null;
    const predictedTotalSecs = predMin*60 + predSec;
    return Math.ceil(actualTotalSecs) - predictedTotalSecs;
  }
}

/**
 * Scores mark of feet and inches, F'i", to 12F+i (F=feet, i=inches)
 * Examples: 11'4", 10' 0", 9'
 * Non-number values such as DNS/NM/NH, and numbers without " or ', are scored
 * as null.
 */
export class ImperialLengthScorable implements Scorable {
  score(mark: string, fields: Map<ResultField, string>): ?number {
    if (mark == "") return null;
    let parts = mark.split("'");
    if (parts.length == 1) {
      parts = mark.split('"');
      if (parts.length == 1) return null; // Can't tell if mark is feet or inch
      const parsed = parseInt(parts[0]);
      return isNaN(parsed) ? null : parsed;
    } else if (parts.length == 2) {
      if (parts[1].split('"').length > 1) {
        parts[1] = parts[1].split('"')[0];
      }
      const feet = parseInt(parts[0]);
      const inches = parts[1] == "" ? 0 : parseInt(parts[1]);
      if (isNaN(feet) || isNaN(inches)) return null;
      return 12 * feet + inches;
    } else {
      return null;
    }
  }
}

export class ScoreBy {
  static Time: TimeScorable = new TimeScorable();
  static Distance: DistanceScorable = new DistanceScorable();
  static JoggersMile: JoggersMileScorable = new JoggersMileScorable();
  static ImperialLength: ImperialLengthScorable = new ImperialLengthScorable();
}