// @flow
import {assert, str} from '../util'
import {Event, Result, RankDirection} from '../types'

export class Filter {
  shouldRemove(input: Result): boolean {
    throw new Error("Filter is an abstract class");
  }
  belongs(input: Result): boolean {
    return !this.shouldRemove(input);
  }
}

export class Transformer {
  transform(input: Result): Result {
    throw new Error("Transformer is an abstract class");
  }
}

export class Ranker {
  events: Set<Event>;
  constructor(events: Set<Event>) {
    this.events = events;
  }

  rank(results: Array<Result>, dir: RankDirection): Array<Result> {
    const relevantResults = results.filter(r => this.events.has(r.event));
    const irrelevantResults = results.filter(r => !this.events.has(r.event));
    // Group by event, gender, division
    const groups = new Map<string, Array<Result>>();
    relevantResults.forEach(res => {
      const groupKey = `${str(res.event)}-${str(res.gender)}-${res.getDivision()}`;
      const existing = groups.get(groupKey) ?? [];
      existing.push(res);
      groups.set(groupKey, existing);
    });
    const sortedGroups = new Map<string, Array<Result>>();
    for (let [groupKey, group] of groups.entries()) {
      const sorted = group.sort((r1: Result, r2: Result) => {
        const ascending = dir === RankDirection.ASCENDING;
        const [score1, score2] = [r1.getScore(), r2.getScore()];
        if (score1 == null && score2 == null) {
          return 0;
        } else if (score1 == null) {
          return 1;
        } else if (score2 == null) {
          return -1;
        } else {
          return ascending ? score1 - score2 : score2 - score1;
        }
      });
      sortedGroups.set(groupKey, sorted);
      sorted.forEach((result, i) => {
        result.setRank(i+1);
      })
    }
    return [...sortedGroups.values(), irrelevantResults].flat(1);
  }
}

export class PipelineStep {
  *run(results: Array<Result>): Generator<Result, void, any> {
    throw new Error("PipelineStep is an abstract class");
  }
}

export class FilterStep extends PipelineStep {
  filter: Filter;
  constructor(filter: Filter) {
    super();
    this.filter = filter;
  }

  *run(results: Array<Result>): Generator<Result, void, any> {
    for (const result of results) {
      if (this.filter.belongs(result)) {
        yield result;
      }
    }
  }
}

export class TransformStep extends PipelineStep {
  tform: Transformer;
  constructor(tform: Transformer) {
    super();
    this.tform = tform;
  }

  *run(results: Array<Result>): Generator<Result, void, any> {
    for (const result of results) {
      yield this.tform.transform(result);
    }
  }
}

export class RankerStep extends PipelineStep {
  ranker: Ranker;
  dir: RankDirection;

  constructor(ranker: Ranker, dir: RankDirection) {
    super();
    this.ranker = ranker;
    this.dir = dir;
  }

  *run(results: Array<Result>): Generator<Result, void, any> {
    for (let r of this.ranker.rank(results, this.dir)) yield r;
  }
}

export class Pipeline {
  steps: Array<PipelineStep>;

  constructor(steps: Array<PipelineStep> = []) {
    this.steps = steps;
  }

  run(inresults: Array<Result>): Array<Result> {
    let outresults: Array<Result> = inresults;
    for (const step of this.steps) {
      outresults = Array.from(step.run(outresults));
    }
    return outresults;
  }
}