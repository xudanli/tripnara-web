/** GET /travel-contexts/:contextId/views/overview */
export interface OverviewViewData {
  summary?: string;
  stage?: string;
  openDecisionCount?: number;
  monitoringCount?: number;
  pendingProposalCount?: number;
  tripId?: string | null;
  dataFreshnessLabel?: string;
  consistencyWarning?: string;
  planningProgressPercent?: number;
  effectivePlanLabel?: string;
}

/** GET /travel-contexts/:contextId/views/monitoring */
export interface MonitoringViewData {
  activeCount?: number;
  items?: Array<{
    kind?: string;
    label?: string;
    status?: string;
    summary?: string;
    lastCheckedAt?: string;
  }>;
}

/** Mutation 结果 — 前端展示变化说明（P0.4） */
export interface ContextMutationResult {
  previousRevision: number;
  newRevision: number;
  changedDomains?: string[];
  userFacingSummary?: string;
  decisionsCreated?: string[];
  warnings?: string[];
}
