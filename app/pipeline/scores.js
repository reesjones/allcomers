// @flow
import type {ResultField, Scorable} from '../types'

/**
 * Interprets mark as integer or floating point number, null if not integral
 * or if the point sinks.
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

// Converts marks of feet and inches, F'i", to 12F+i (F=feet, i=inches)
// export class ImperialLengthScore implements Scorable {}

/**
 * Always returns null score. Used as a placeholder
 */
export class NullScorable implements Scorable {
  score(_: string): ?number {
    return null;
  }
}