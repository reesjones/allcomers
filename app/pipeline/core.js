// @flow
import {assert} from '../util'
import {Event, Result, RankDirection} from '../types'

export class Filter {
  belongs(input: Result): boolean {
    throw new Error("Filter is an abstract class");
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

  rank(results: Array<Result>, dir: RankDirection, scoreCol: string = "score"): Array<Result> {
    assert(results.every(result => this.events.has(result.event)));
    throw new Error("Implementation is unfinished");
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
    // TODO
    for (let r of results) yield r;
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