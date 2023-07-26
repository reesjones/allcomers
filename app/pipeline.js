// @flow
import {assert} from './util'
import {Event, Result, SortDirection} from './types'


class Transformer {
  transform(input: Result): Result {
    throw new Error("Transformer is an abstract class");
  }
}

class Sorter {
  events: Set<Event>;
  constructor(events: Set<Event>) {
    this.events = events;
  }

  sort(results: Array<Result>, dir: SortDirection, scoreCol: string = "score"): Array<Result> {
    assert(results.every(result => this.events.has(result.event)));
    throw new Error("Implementation is unfinished");
  }
}

class PipelineStep {
  *run(results: Array<Result>): Generator<Result, void, any> {
    throw new Error("PipelineStep is an abstract class");
  }
}

class TransformStep extends PipelineStep {
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

class Pipeline {
  steps: Array<PipelineStep>;

  constructor(steps: Array<PipelineStep>) {
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