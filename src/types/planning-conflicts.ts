import type { PlanStudioConflict } from '@/types/trip';
import type { DecisionCheckerResponse } from '@/types/decision-checker';
import type { PlanningDaySplitDto } from '@/types/planning-day-split';
import type {
  FeasibilityIssueDto,
  FeasibilityIssuePriority,
} from '@/types/trip-feasibility-report';
import type { GateExecuteStatus } from '@/types/trip-reservation-evidence';

export type PlanningConflictSource = 'feasibility' | 'schedule';

export type PlanningConflictCategory =
  | 'schedule'
  | 'transport'
  | 'team_fit'
  | 'access_capacity'
  | 'experience_expectation'
  | 'booking'
  | 'structure'
  | 'environment'
  | 'other';

/** BFF `GET /trips/:id/planning-conflicts` 单条冲突 */
export interface PlanningConflictDto {
  id: string;
  source: PlanningConflictSource;
  priority: FeasibilityIssuePriority;
  category: PlanningConflictCategory;
  title: string;
  message: string;
  affectedDays?: number[];
  /** 与 buildFeasibilityIssueDedupeKey 对齐，revalidate 后稳定 */
  semanticKey?: string;
  issue?: FeasibilityIssueDto;
  studioConflict?: PlanStudioConflict;
}

export interface PlanningConflictsSummaryDto {
  total: number;
  mustHandle: number;
  suggestAdjust: number;
  pendingConfirm: number;
  byCategory: Partial<Record<PlanningConflictCategory, number>>;
}

/** BFF 首包 defer：decisionChecker 后台计算，客户端轮询补全 */
export interface DecisionCheckerDeferredDto {
  status: 'pending' | 'ready' | 'failed';
  taskId: string;
  /** 相对路径，如 `/trips/:id/planning-conflicts?decisionCheckerTaskId=...` */
  pollUrl?: string;
  /** BFF 建议轮询间隔（ms），默认 5000 */
  pollIntervalMs?: number;
  error?: string;
}

export interface PlanningConflictsResponse {
  tripId: string;
  verdict?: {
    status: string;
    headline?: string;
  };
  gateExecute?: GateExecuteStatus;
  canStartExecute?: boolean;
  isStale?: boolean;
  reportVerifiedAt?: string;
  conflictsGeneratedAt?: string;
  summary: PlanningConflictsSummaryDto;
  conflicts: PlanningConflictDto[];
  /** P2：`?includeConstraintsSummary=1` */
  constraintsSummary?: import('@/types/planning-constraints').ConstraintsSummaryResponse;
  /** 决策检查器读模型：`?includeDecisionChecker=1` 或 deferred 轮询 ready 后 */
  decisionChecker?: DecisionCheckerResponse;
  /** includeDecisionChecker=1 且 decisionChecker 尚未就绪时 */
  decisionCheckerDeferred?: DecisionCheckerDeferredDto;
  /** 并行分流时间线：`docs/api/planning-workbench-split-plan-api.md` */
  daySplits?: PlanningDaySplitDto[];
}
