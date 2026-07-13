/**
 * 旅行决策合同 / 约束控制台 — 前端 API 类型
 * @see Swagger tag: trip-constraints
 * 与后端 `dto/frontend-travel-decision-contract-api.types.ts` 对齐
 */

export type {
  ChangeStrategyArchetype,
  TripObjectivePrinciple,
  TravelGoalDimension,
} from '@/types/travel-decision-contract';

export type {
  TripConstraint,
  TripConstraintCardTone,
  TripConstraintContractMeta,
  TripConstraintPreviewStructuredImpact,
  TripConstraintPreviewConstraintChange,
  TripConstraintsAutomationPolicy,
  TripConstraintsChangeStrategy,
  TripConstraintsCheckResponse,
  TripConstraintsCompiledWeights,
  TripConstraintsConflictSummary,
  TripConstraintsContract,
  TripConstraintsContractBlockType,
  TripConstraintsContractConflictSummary,
  TripConstraintsContractObjectives,
  TripConstraintsDisplayPrinciple,
  TripConstraintsListResponse,
  TripConstraintsSectionKey,
  TripConstraintsSectionMeta,
  TripConstraintsTeamGovernance,
  PatchTripConstraintsContractDto,
  PatchTripConstraintsContractResponse,
  TripConstraintPreviewImpactData,
  TripConstraintPreviewImpactRequest,
  AutomationDefaultLevel,
} from '@/types/trip-constraints';

export type {
  HardConstraintEnforcementSpec,
  HardConstraintEnforcementIssueKind,
  HardConstraintEnforcementTemplateId,
  HardConstraintVerdictChannel,
} from '@/lib/trip-constraint-hard-enforcement.util';

export { HARD_CONSTRAINT_ENFORCEMENT_SPECS } from '@/lib/trip-constraint-hard-enforcement.util';

/** GET /constraints 聚合视图（buildConstraintConsoleViewModel 输出） */
export interface ConstraintConsoleViewModel {
  constraintsVersion: number;
  contract: import('@/types/trip-constraints').TripConstraintsContract;
  itemsById: Record<string, import('@/types/trip-constraints').TripConstraint>;
  sections: ConstraintConsoleViewSection[];
  conflictCount: number;
}

export interface ConstraintConsoleViewSection {
  section: import('@/types/trip-constraints').TripConstraintsSectionMeta;
  /** UI 列表项（已由 adapter 映射） */
  constraints: import('@/components/plan-studio/workbench/constraint-console-types').ConstraintListEntry[];
  contractBlock?: import('@/types/trip-constraints').TripConstraintsContractBlockType | null;
}

export type {
  ConstraintAggregateStatus,
  ConstraintAssessmentLaneBadge,
  ConstraintAssessmentUiTone,
  ConstraintCardView,
  ConstraintConsoleWithAssessmentsViewModel,
  UnifiedConstraintAssessmentBundle,
  UnifiedConstraintAssessmentView,
} from '@/types/frontend-constraint-assessment-api.types';
