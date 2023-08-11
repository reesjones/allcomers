// @flow

import {Transformer} from "./core";
import {Result, ResultField} from "../types";

export class AddUnattachedIfEmptyTeamTransformer extends Transformer {
  transform(input: Result): Result {
    const team = (input.fields.get(ResultField.TEAM) ?? "").trim().toLowerCase();
    if (team == null || team.length == 0 || team == "no team" || team == "n/a"
        || (team != "unattached" && team.includes("unattached"))) {
      input.fields.set(ResultField.TEAM, "Unattached");
      input.team = "Unattached";
    }
    return input;
  }
}
