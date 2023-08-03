// @flow

import type {RankDirection} from "../types";
import {
  Filter,
  FilterStep,
  Ranker,
  RankerStep,
  Transformer,
  TransformStep,
  PipelineStep,
  Pipeline,
} from "./core";

export default class PipelineBuilder {
  steps: Array<PipelineStep> = [];
  constructor() {}

  filter(f: Filter): PipelineBuilder {
    this.steps.push(new FilterStep(f));
    return this;
  }

  transform(t: Transformer): PipelineBuilder {
    this.steps.push(new TransformStep(t));
    return this;
  }

  rank(r: Ranker, dir: RankDirection): PipelineBuilder {
    this.steps.push(new RankerStep(r, dir));
    return this;
  }

  build(): Pipeline {
    return new Pipeline(this.steps);
  }
}