/**
 * Constraint Assessment API — 前端类型
 * @see GET /trips/:tripId/constraint-assessments
 * 与后端 `dto/frontend-constraint-assessment-api.types.ts` 对齐
 */

import type { TripConstraintCardTone } from '@/types/trip-constraints';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';

/** Phase 0 · aggregateStatus SSOT */
export type ConstraintAggregateStatus =
  | 'PASS'
  | 'WARN'
  | 'PLANNING_BLOCK'
  | 'EXECUTION_BLOCK'
  | 'RUNTIME_BLOCK'
  | 'UNKNOWN';

export type ConstraintAssessmentLaneStatus =
  | 'PASS'
  | 'BLOCK'
  | 'WARNING'
  | 'REQUIRES_VERIFICATION'
  | 'UNKNOWN';

export type ConstraintAssessmentLaneKey = 'planning' | 'executability' | 'runtime';

export type ConstraintAssessmentUiTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface ConstraintAssessmentLaneEvidence {
  day?: number;
  dayIndex?: number;
  actual?: string;
  value?: string;
  /** SDR-202 · 不夜驾结构化 evidence */
  sunsetLocal?: string;
  cutoffLocal?: string;
  arriveLocal?: string;
  maxMinutesAfterSunset?: number;
  segmentLabel?: string;
  degradationReason?: string;
  limit?: string;
  measuredMinutes?: number;
  measuredValue?: string;
  message?: string;
  ruleId?: string;
  [key: string]: unknown;
}

export interface UnifiedConstraintAssessmentLaneView {
  status: ConstraintAssessmentLaneStatus;
  source?: string;
  ruleId?: string;
  message?: string;
  evidence?: ConstraintAssessmentLaneEvidence;
}

export interface UnifiedConstraintAssessmentView {
  constraintKey: string;
  legacyConstraintId?: string;
  templateId?: string;
  /** BFF 合同人话，如「日落后 30 分钟内结束驾驶」 */
  contractRequirement?: string;
  aggregateStatus: ConstraintAggregateStatus;
  lanes: {
    planning: UnifiedConstraintAssessmentLaneView | null;
    executability: UnifiedConstraintAssessmentLaneView | null;
    runtime?: UnifiedConstraintAssessmentLaneView | null;
  };
  problemIds?: string[];
  repairDeepLink?: string;
}

export interface UnifiedConstraintAssessmentBundle {
  tripId: string;
  constraintsVersion?: number;
  assessedAt?: string;
  assessments: UnifiedConstraintAssessmentView[];
}

export interface ConstraintAssessmentLaneBadge {
  laneKey: ConstraintAssessmentLaneKey;
  laneLabel: string;
  status: ConstraintAssessmentLaneStatus;
  statusLabel: string;
  tone: ConstraintAssessmentUiTone;
  ruleId?: string;
  detail?: string;
}

export interface ConstraintCardAggregateUi {
  label: string;
  tone: ConstraintAssessmentUiTone;
  isBlocking: boolean;
}

/** buildConstraintConsoleWithAssessments 输出 · 卡片渲染 SSOT */
export interface ConstraintCardView {
  constraintId: string;
  name: string;
  contractRequirement?: string;
  assessment: UnifiedConstraintAssessmentView | null;
  aggregateUi: ConstraintCardAggregateUi;
  laneBadges: ConstraintAssessmentLaneBadge[];
  repairDeepLink?: string;
  repairProblemId?: string;
  contractCardTone?: TripConstraintCardTone;
  entry?: ConstraintListEntry;
}

export interface ConstraintConsoleWithAssessmentsSection {
  sectionKey: string;
  sectionLabel: string;
  cards: ConstraintCardView[];
}

export interface ConstraintConsoleWithAssessmentsViewModel {
  tripId: string;
  constraintsVersion: number;
  assessedAt?: string;
  sections: ConstraintConsoleWithAssessmentsSection[];
  cardsByConstraintId: Record<string, ConstraintCardView>;
}
