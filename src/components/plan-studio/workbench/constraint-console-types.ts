import type { LucideIcon } from 'lucide-react';
import type { HardConstraintMetadata } from '@/lib/constraint-metadata.util';
import type { TripConstraintCardTone } from '@/types/trip-constraints';
import type {
  ConstraintAggregateStatus,
  ConstraintAssessmentLaneBadge,
  ConstraintAssessmentUiTone,
} from '@/types/frontend-constraint-assessment-api.types';
import type {
  TripConstraintPreviewFollowUpAction,
  TripConstraintPreviewScheduleDetailLevel,
  TripConstraintPreviewVerdict,
} from '@/types/trip-constraints';
import type { UnifiedConstraintAssessmentView } from '@/types/frontend-constraint-assessment-api.types';

export type ConstraintConsoleItemKind = 'hard' | 'soft' | 'external';

export type ConstraintEditorType = 'HARD' | 'SOFT';

export type ConstraintEditorScope = 'TRIP' | 'DAY' | 'MEMBER';

export interface ConstraintListEntry {
  id: string;
  kind: ConstraintConsoleItemKind;
  label: string;
  value?: string;
  icon: LucideIcon;
  locked?: boolean;
  /** 软偏好 slider 0-100 */
  sliderValue?: number;
  statusLabel?: string;
  statusTone?: 'neutral' | 'warning' | 'success';
  /** @deprecated 样式请用 cardTone */
  hasConflict?: boolean;
  cardTone?: TripConstraintCardTone;
  /** type=EXTERNAL + source=OFFICIAL_RULE */
  readOnly?: boolean;
  allowRelaxation?: boolean;
  category?: string;
  sourceType?: string;
  description?: string;
  updatedAt?: string;
  verificationStatus?: string;
  lastVerifiedAt?: string;
  /** check 结果关联 issue，供「查看修复」 */
  checkIssueId?: string;
  /** POST /check trade-off 已牺牲（不再重复标日程 violation） */
  softSacrificed?: boolean;
  softTradeoffMessage?: string;
  /** GET /constraints 分区 */
  sectionKey?: string;
  /** 硬约束合同元数据（作用范围 / 判定规则 / 违反结果） */
  metadata?: HardConstraintMetadata;
  /** 目的地官方规则元数据（只读） */
  destinationRule?: import('@/types/destination-rules').DestinationRuleMetadata;
  /** P1-A · 合同要求摘要（assessment 卡片「要求 ≤6h」） */
  contractRequirement?: string;
  /** P1-A · GET /constraint-assessments aggregateStatus */
  assessmentAggregateStatus?: ConstraintAggregateStatus;
  assessmentAggregateLabel?: string;
  assessmentTone?: ConstraintAssessmentUiTone;
  assessmentLaneBadges?: ConstraintAssessmentLaneBadge[];
  assessmentRepairProblemId?: string;
  assessmentRepairDeepLink?: string;
}

export interface ConstraintEditorDraft {
  id: string;
  name: string;
  enabled: boolean;
  type: ConstraintEditorType;
  scope: ConstraintEditorScope;
  targetValue: number;
  targetUnit: 'hour' | 'day' | 'currency' | 'star' | 'km';
  toleranceMode: 'none' | 'allow_over';
  toleranceMinutes: number;
  priority: number;
  locked: boolean;
  reason: string;
  /** time_range 专用：yyyy-MM-dd */
  startDate?: string;
  endDate?: string;
  currency?: string;
  /** transport 专用：IntentTravelMode | WALKING */
  transportMode?: string;
  /** 作用范围 · 时间/成员/阶段/活动（写入 value.scopeBinding） */
  scopeBinding?: import('@/types/constraint-scope').ConstraintScopeBinding;
}

export interface ConstraintImpactAffectedDayDetail {
  dayNumber: number;
  tone?: 'major' | 'minor' | 'none';
  daySummary?: string;
  items: ConstraintImpactAffectedDayItem[];
}

export interface ConstraintImpactAffectedDayItem {
  itemId?: string;
  label: string;
  startTimeLabel?: string;
  detail?: string;
  impactType?: string;
}

export interface ConstraintImpactPreview {
  affectedDays: Array<{ dayNumber: number; tone: 'major' | 'minor' | 'none' }>;
  /** 按天列出受影响的活动项（供日程 chip 点击展开） */
  affectedDayDetails?: ConstraintImpactAffectedDayDetail[];
  affectedItemIds?: string[];
  adjustmentSummary: string;
  planLabel: string;
  planNeedsAdjust: boolean;
  feasibilityBefore: number;
  feasibilityAfter: number;
  executeabilityDelta?: {
    scoreDelta?: number;
    mustHandleDelta?: number;
    scoreDeltaReason?: string;
    blockingRuleIds?: string[];
    conflictsDeltaSummary?: {
      mustHandle?: string;
      suggestAdjust?: string;
      pendingConfirm?: string;
    };
  };
  budgetRows: Array<{ label: string; delta: number; currency: string }>;
  diffBullets: string[];
  recommendation: string;
  recommendations?: string[];
  conflictsBefore?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  conflictsAfter?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  /** meta.debug · 整趟行程冲突对照（非本约束域） */
  tripLevelConflicts?: {
    before?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
    after?: { mustHandle?: number; suggestAdjust?: number; pendingConfirm?: number };
  };
  /** @deprecated 使用 suggestedFollowUpAction */
  suggestedFollowUp?: string;
  suggestedFollowUpAction?: {
    label: string;
    action: TripConstraintPreviewFollowUpAction;
    deepLink?: string;
  };
  userSummary?: {
    verdict: TripConstraintPreviewVerdict;
    verdictLabel: string;
    verdictReason: string;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
    previewMode?: 'quick' | 'deep';
  };
  scheduleDetailLevel?: TripConstraintPreviewScheduleDetailLevel;
  scheduleDetailUnavailableReason?: string;
  constraintAssessments?: Array<{
    constraintKey?: string;
    legacyConstraintId?: string;
    aggregateStatus?: ConstraintAggregateStatus;
    laneBadges: ConstraintAssessmentLaneBadge[];
    assessment: UnifiedConstraintAssessmentView;
  }>;
  refreshType?: 'quick' | 'deep';
  structuredImpact?: import('@/types/trip-constraints').TripConstraintPreviewStructuredImpact;
  /** quick 预览仅为当前行程快照，affectedDays/冲突计数并非本次修改专属 */
  isTripSnapshotOnly?: boolean;
}

/** mapPreviewImpactToUi 缺字段时的空骨架（不含演示数据） */
export const EMPTY_CONSTRAINT_IMPACT_PREVIEW: ConstraintImpactPreview = {
  affectedDays: [],
  adjustmentSummary: '',
  planLabel: '',
  planNeedsAdjust: false,
  feasibilityBefore: 0,
  feasibilityAfter: 0,
  budgetRows: [],
  diffBullets: [],
  recommendation: '',
};

export const DEFAULT_DAILY_DRIVE_DRAFT: Omit<ConstraintEditorDraft, 'id'> = {
  name: '每日驾驶上限',
  enabled: true,
  type: 'HARD',
  scope: 'TRIP',
  targetValue: 4,
  targetUnit: 'hour',
  toleranceMode: 'allow_over',
  toleranceMinutes: 15,
  priority: 8,
  locked: false,
  reason: '',
};
