// @flow
import type { Result } from "../types";

import {Filter} from './core'

/**
 * Filters out results with "No name" (case insensitive) for first or last
 * field, and results with either or both name fields empty
 */
export class NoNameFilter extends Filter {
  shouldRemove(result: Result): boolean {
    const nameIsNoName = result.firstName.toLowerCase() == "no name"
        || result.lastName.toLowerCase() == "no name";
    const nameIsEmpty = result.firstName.length == 0
        || result.lastName.length == 0;
    return nameIsNoName || nameIsEmpty;
  }
}

class MarkFilter extends Filter {
  _shouldRemove(result: Result, excludeStr: string): boolean {
    return result.mark.trim().toLowerCase() == excludeStr.trim().toLowerCase();
  }
}

export class DNFFilter extends MarkFilter {
  shouldRemove(result: Result): boolean {
    return super._shouldRemove(result, "DNF");
  }
}

export class DNSFilter extends MarkFilter {
  shouldRemove(result: Result): boolean {
    return super._shouldRemove(result, "DNS");
  }
}

export class NHFilter extends MarkFilter {
  shouldRemove(result: Result): boolean {
    return super._shouldRemove(result, "NH");
  }
}

export class NMFilter extends MarkFilter {
  shouldRemove(result: Result): boolean {
    return super._shouldRemove(result, "NM");
  }
}