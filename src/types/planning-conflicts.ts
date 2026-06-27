import type { PlanStudioConflict } from '@/types/trip';
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
}
