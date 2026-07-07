/** Canonical Causal Trace v1 — Gateway 统一读模型 */

export interface CausalTraceReference {
  traceId: string;
  worldStateVersion: string;
  protocolVersion: 'causal-trace-v1';
}

export interface CausalStoryChainNode {
  nodeId: string;
  type: string;
  title: string;
  description: string;
  sourceRefs?: string[];
}

export interface CausalStoryRecommendedOption {
  optionId: string;
  summary: string;
  expectedImprovement?: string;
  tradeoff?: string;
}

export interface CausalStoryView {
  traceId: string;
  worldStateVersion: string;
  headline: string;
  assessment: string;
  chain: CausalStoryChainNode[];
  recommendedOption?: CausalStoryRecommendedOption;
  technicalTraceRef: string;
}

/** GET …/causal-trace — 技术回放完整 trace */
export interface CanonicalCausalTraceV1 {
  traceId?: string;
  worldStateVersion?: string;
  [key: string]: unknown;
}

export interface CausalTraceReplayView {
  schemaId: 'tripnara.causal_trace_replay@v1';
  tripId: string;
  problemId: string;
  generatedAt: string;
  ref: CausalTraceReference;
  trace: CanonicalCausalTraceV1;
  causalStoryView: CausalStoryView;
  guardianCausalStoryView: CausalStoryView;
}
