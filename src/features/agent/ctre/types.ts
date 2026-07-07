/** tripnara.ctre_compile_progress@v0 — 与后端 Travel Compiler SSOT 对齐 */

export type CompilePhase =
  | 'LEXICAL'
  | 'CANONICALIZATION'
  | 'GRAPH_CONSTRUCTION'
  | 'ROUTE_RESOLUTION'
  | 'SEMANTIC'
  | 'LINKING'
  | 'VALIDATION'
  | 'OPTIMIZATION';

export type CtreCompileStatus = 'success' | 'partial' | 'failed';

export type CtrePhaseStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed';

export type CtreCompileTrigger = 'plan_gen' | 'repair';

export interface CtreCounterProgress {
  done: number;
  total: number;
}

export interface CtrePhaseProgressView {
  phase: CompilePhase;
  status: CtrePhaseStatus;
  summary?: string;
  counters?: Record<string, CtreCounterProgress>;
  durationMs?: number;
}

export interface CtreCompileProgressView {
  schemaId: 'tripnara.ctre_compile_progress@v0';
  engine: 'CTRE';
  compileId: string;
  status: CtreCompileStatus;
  /** 0–100 结构完整度 */
  score: number;
  trigger: CtreCompileTrigger;
  incremental?: {
    affectedDayIndices: number[];
    previousCompileId?: string;
    merged: boolean;
  };
  phases: CtrePhaseProgressView[];
  counters: {
    POI?: CtreCounterProgress;
    Route?: CtreCounterProgress;
    Booking?: CtreCounterProgress;
    Constraint?: CtreCounterProgress;
    Dependency?: CtreCounterProgress;
  };
  updatedAt: string;
}

export interface CtreCompileProgressApiResponse {
  engine: 'CTRE';
  progress: CtreCompileProgressView;
}

// ── Workbench-only（uiOutput.ctre / execute task status）────────────────────

export type KernelVerifyRepairTerminatedReason =
  | 'clean'
  | 'fatal'
  | 'max_iterations'
  | 'repair_not_applied'
  | 'repair_disabled'
  | 'verify_skipped';

export type KernelVerifyIssueClass = 'FATAL' | 'CONFLICT' | 'ADVISORY';

export interface KernelVerifyIssueSummary {
  code: string;
  class: KernelVerifyIssueClass;
  message: string;
}

export interface CtreKernelVerifyRepairRoundDetail {
  /** 0 = 首轮 VERIFY（含 CTRE 后）；≥1 = RE-VERIFY 轮次 */
  round: number;
  verify: {
    issueCount: number;
    fatalCount: number;
    conflictCount: number;
    advisoryCount: number;
    issues?: KernelVerifyIssueSummary[];
  };
  repair?: {
    applied?: boolean;
    skipped?: boolean;
    reason?: string;
    segmentsUpdated?: number;
    itemsApplied?: number;
  };
  recompile?: {
    skipped?: boolean;
    status?: CtreCompileStatus;
    score?: number;
    incrementalMerged?: boolean;
    affectedDayIndices?: number[];
  };
}

export interface CtreKernelVerifyRepairLoop {
  terminatedReason?: KernelVerifyRepairTerminatedReason;
  repairCount?: number;
  maxRepairs?: number;
  rounds?: number;
  finalVerify?: { issueCount?: number; fatalCount?: number; conflictCount?: number };
  roundDetails?: CtreKernelVerifyRepairRoundDetail[];
}

export interface WorkbenchCtreUiOutput {
  skipped?: boolean;
  reason?: string;
  progress?: CtreCompileProgressView;
  verifySsotApplied?: boolean;
  segmentEnrichment?: {
    segmentsUpdated: number;
    poiTagsApplied: number;
    routeTemplatesTagged: number;
  };
  kernelVerifyRepairLoop?: CtreKernelVerifyRepairLoop;
  kernelVerify?: { issueCount?: number; fatalCount?: number; conflictCount?: number };
  kernelRepair?: CtreKernelVerifyRepairRoundDetail['repair'];
  kernelReVerify?: { issueCount?: number; fatalCount?: number; conflictCount?: number };
}
