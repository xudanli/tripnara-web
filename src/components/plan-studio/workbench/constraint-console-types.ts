import type { LucideIcon } from 'lucide-react';
import type { TripConstraintCardTone } from '@/types/trip-constraints';

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
}

export interface ConstraintImpactPreview {
  affectedDays: Array<{ dayNumber: number; tone: 'major' | 'minor' | 'none' }>;
  adjustmentSummary: string;
  planLabel: string;
  planNeedsAdjust: boolean;
  feasibilityBefore: number;
  feasibilityAfter: number;
  budgetRows: Array<{ label: string; delta: number; currency: string }>;
  diffBullets: string[];
  recommendation: string;
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
  locked: true,
  reason: '',
};
