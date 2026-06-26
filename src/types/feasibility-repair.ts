import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import type {
  CascadeCausalPreAnalysis,
  CascadeUiHint,
} from '@/types/readiness-cascade';
import type { FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';

/** 与 readiness repair-options / preview-repair 的 guardianNegotiation 同结构 */
export type GuardianNegotiationSnapshot = GuardianNegotiationResult;

export type RepairPreviewMode = 'heuristic' | 'decision_engine_dry_run';

export type PreviewRepairStatus = 'preview' | 'would_defer';

export type ItineraryChangeType =
  | 'added'
  | 'removed'
  | 'time_changed'
  | 'title_changed'
  | 'moved_day';

export interface ItineraryDiffEntry {
  slotId: string;
  changeType: ItineraryChangeType;
  dayNumber: number;
  before?: { title?: string; time?: string; endTime?: string; dayNumber?: number };
  after?: { title?: string; time?: string; endTime?: string; dayNumber?: number };
}

export interface RepairPreviewDaySnapshot {
  dayNumber: number;
  itemCount: number;
  totalItemCount: number;
  highlights: string[];
}

export interface PreviewRepairResponse {
  issueId?: string;
  optionId: string;
  actionType: string;
  previewMode: RepairPreviewMode;
  status: PreviewRepairStatus;
  message: string;
  before: RepairPreviewDaySnapshot;
  after: RepairPreviewDaySnapshot;
  itineraryDiff: ItineraryDiffEntry[];
  impact: {
    feasibilityScoreBefore: number;
    feasibilityScoreAfter?: number;
    /** true = 分数勿当精确值展示 */
    estimated: boolean;
  };
  wouldDefer?: boolean;
  guardianNegotiation?: GuardianNegotiationSnapshot;
  cascadeUiHints?: CascadeUiHint[];
  causalPreAnalysis?: CascadeCausalPreAnalysis;
  option: FeasibilityRepairOptionDto;
  /** preview/would_defer 时驱动 CHOOSE */
  humanDecisionPointsFlat?: string[];
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
}

export type ApplyRepairStatus = 'applied' | 'deferred' | 'redirect';

export interface ApplyRepairResponse {
  status: ApplyRepairStatus;
  message: string;
  actionType: string;
  persisted?: boolean;
  persistDecision?: boolean;
  guardianNegotiation?: GuardianNegotiationSnapshot;
  metadata?: { guardianGate?: 'low_consensus_reject' };
  /** deferred 时驱动 CHOOSE 弹窗 */
  humanDecisionPointsFlat?: string[];
  presentation?: import('@/types/guardian-presentation').GuardianPersonaPresentation;
}

export interface FeasibilityRepairOptionsResponse {
  issueId: string;
  /** 与 readiness blockerId 同值，兼容深链 */
  blockerId?: string;
  issueMessage?: string;
  blockerMessage?: string;
  options: FeasibilityRepairOptionDto[];
  guardianNegotiation?: GuardianNegotiationSnapshot;
  cascadeUiHints?: CascadeUiHint[];
  causalPreAnalysis?: CascadeCausalPreAnalysis;
  dependencyImpact?: Record<string, unknown>;
}

export type RepairDrawerPhase =
  | 'select_option'
  | 'guidance_ready'
  | 'preview_loading'
  | 'preview_ready'
  | 'preview_deferred'
  | 'applying'
  | 'apply_deferred'
  | 'done';
