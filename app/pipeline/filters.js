// @flow
import type { Result } from "../types";

import {Filter} from './core'

/**
 * Filters out results with "No name" (case insensitive) for first or last
 * field, and results with either or both name fields empty
 */
export class NoNameFilter extends Filter {
  belongs(result: Result): boolean {
    const nameIsNoName = result.firstName.toLowerCase() == "no name"
        || result.lastName.toLowerCase() == "no name";
    const nameIsEmpty = result.firstName.length == 0
        || result.lastName.length == 0;
    return !nameIsNoName && !nameIsEmpty;
  }
}