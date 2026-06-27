/**
 * 体验底线 / 遗憾上界 — 行前 Readiness P0
 * @see docs/prd/pre-trip-readiness-p0-prd.md §4
 */

export type ExperienceRegretBoundDraftSource = 'dual_track' | 'verify' | 'default';

export type ExperienceRegretConfirmationMode = 'organizer_only' | 'all_members';

export interface ExperienceRegretBoundStatement {
  id: string;
  text: string;
  presetId?: string;
}

export interface ExperienceRegretBoundMetadata {
  revision: 'v1';
  draftUpperBound?: number;
  draftSource?: ExperienceRegretBoundDraftSource;
  draftGeneratedAt?: string;
  confirmedUpperBound?: number;
  confirmedAt?: string;
  confirmedBy?: string;
  confirmationMode?: ExperienceRegretConfirmationMode;
  statements?: ExperienceRegretBoundStatement[];
  planRegretEstimate?: number;
  planRegretEstimateAt?: string;
}

export interface ConfirmExperienceRegretBoundRequest {
  confirmedUpperBound: number;
  statements?: Array<{ text: string; presetId?: string }>;
  confirmationMode?: 'organizer_only';
}

export interface ConfirmExperienceRegretBoundResponse {
  tripId: string;
  experienceRegretBound: ExperienceRegretBoundMetadata;
  readinessHint?: {
    experienceRegretIssueResolved: boolean;
    feasibilityVerdict?: string;
  };
}

export const EXPERIENCE_REGRET_PRESETS: Array<{ id: string; text: string }> = [
  { id: 'no_two_core_cancelled', text: '不接受连续取消 2 个核心体验' },
  { id: 'weather_flex', text: '可接受因天气替换 1 个户外项' },
  { id: 'pace_slow', text: '可接受减少 1 个打卡点以保节奏' },
];

export const EXPERIENCE_REGRET_TIER_LABELS: Record<'conservative' | 'balanced' | 'exploratory', { label: string; value: number }> = {
  conservative: { label: '保守', value: 0.15 },
  balanced: { label: '平衡', value: 0.3 },
  exploratory: { label: '探索', value: 0.45 },
};
