import type { Health } from '@/api/trip-detail';
import type { OverallReadinessCardDto } from '@/types/overall-readiness';
import type { PersonaAlert, PipelineStage, Task } from '@/types/trip';
import type { PlanObjectDayChainDto } from '@/types/plan-objects';

export type TimelineConflictCountSource =
  | 'ssot_planning_conflicts'
  | 'schedule_conflicts'
  | (string & {});

export interface TimelineOverviewStats {
  feasibilityScore: number;
  paceScore: number;
  conflictCount: number;
  /** ssot_planning_conflicts 优先；schedule_conflicts 为回退 */
  conflictCountSource?: TimelineConflictCountSource;
  pendingConfirmationCount: number;
  filesPendingCount?: number;
  newSuggestionCount: number;
}

export interface TimelinePlanObjectTopAssessment {
  headline?: string;
  label?: string;
  status?: 'ok' | 'warning' | 'blocked' | string;
  score?: number;
  issueCount?: number;
  summary?: string;
}

/** `include=planobjects` — 日内对象链 + trip 级 top assessment */
export interface TimelinePlanObjectsBlock {
  topAssessment?: TimelinePlanObjectTopAssessment;
  days?: PlanObjectDayChainDto[];
}

export interface TimelineOverviewPlanning {
  progressPercent: number;
  completedStages: number;
  totalStages: number;
  currentStageName?: string;
  stages: PipelineStage[];
}

export interface TimelineOverviewResponse {
  tripId: string;
  stats: TimelineOverviewStats;
  /** 内部 pipeline；勿作用户主分数 */
  planning: TimelineOverviewPlanning;
  /** 用户主分数：整体准备度壳层卡 */
  overallReadiness?: OverallReadinessCardDto;
  tasks: Task[];
  incompleteTaskCount: number;
  todayReminders: PersonaAlert[];
  health?: Health;
  /** Phase 4：`include=planobjects` */
  planObjects?: TimelinePlanObjectsBlock;
  generatedAt: string;
}

export interface TimelineOverviewQuery {
  /** 逗号分隔；显式 include 优先于 preset（含 readiness） */
  include?: string;
  /** shell ≈ stats,readiness；full 含 readiness + pipeline/tasks/reminders */
  preset?: 'shell' | 'full';
}
