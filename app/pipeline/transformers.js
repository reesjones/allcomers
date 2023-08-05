// @flow

import {Transformer} from "./core";
import {Result} from "../types";

export class AddUnattachedIfEmptyTeamTransformer extends Transformer {
  transform(input: Result): Result {
    // TODO implement once team field added
    return input;
  }
}
