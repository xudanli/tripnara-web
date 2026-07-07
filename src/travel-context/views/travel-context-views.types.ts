import type {
  ConsumerIssueView,
  ConsumerRepairOption,
  ExplorationCheckJob,
  IssuesListResponse,
} from '@/features/exploration/api/types';

/** GET /travel-contexts/:contextId/views/decisions */
export interface DecisionsViewData {
  openDecisionCount?: number;
  displayedIssues?: ConsumerIssueView[];
  totalIssueCount?: number;
  ontologyIssueCount?: number;
  blockerIssueCount?: number;
  problems?: Array<{
    problemId: string;
    issueId?: string;
    status?: string;
    options?: ConsumerRepairOption[];
  }>;
}

/** GET /travel-contexts/:contextId/views/feasibility */
export interface FeasibilityViewData {
  verdictStatus?: string;
  totalIssueCount?: number;
  blockerIssueCount?: number;
  ontologyIssueCount?: number;
  checkDurationMs?: number;
  jobId?: string;
  job?: ExplorationCheckJob;
  tripId?: string | null;
  displayedIssues?: ConsumerIssueView[];
  ontologyConstraints?: Record<string, unknown>;
  feasibilitySummary?: string;
}

/** GET /travel-contexts/:contextId/views/plan */
export interface PlanViewData {
  selectedRouteId?: string | null;
  effectivePlan?: {
    headline?: string;
    summary?: string;
    versionId?: string;
    lastUpdatedAt?: string;
    [key: string]: unknown;
  };
  /** AI 建议层（未应用） */
  proposalPlan?: {
    headline?: string;
    summary?: string;
    versionId?: string;
    [key: string]: unknown;
  };
  /** 用户编辑草案 */
  draftPlan?: {
    headline?: string;
    summary?: string;
    [key: string]: unknown;
  };
  /** 已接受决策、待应用 */
  pendingApplyPlan?: {
    headline?: string;
    summary?: string;
    [key: string]: unknown;
  };
  materializationStatus?: string;
}

export function decisionsViewToIssuesList(data: DecisionsViewData): IssuesListResponse {
  return {
    displayedIssues: data.displayedIssues ?? [],
    totalIssueCount: data.totalIssueCount ?? data.displayedIssues?.length ?? 0,
    ontologyIssueCount: data.ontologyIssueCount,
    blockerIssueCount: data.blockerIssueCount,
  };
}

export function feasibilityViewToCheckJob(data: FeasibilityViewData): ExplorationCheckJob | undefined {
  if (data.job) return data.job;
  if (!data.jobId) return undefined;
  return {
    jobId: data.jobId,
    status: 'COMPLETED',
    tripId: data.tripId ?? undefined,
    result: {
      verdictStatus: data.verdictStatus,
      totalIssueCount: data.totalIssueCount,
      checkDurationMs: data.checkDurationMs,
      blockerIssueCount: data.blockerIssueCount,
      ontologyIssueCount: data.ontologyIssueCount,
    },
  };
}
