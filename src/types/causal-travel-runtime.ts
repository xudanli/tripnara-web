/**
 * Causal Travel Runtime · P0–P5（规划 / 决策引擎 / OPS 闭环）
 * @see docs/api/causal-travel-runtime-frontend-integration.md
 */

import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';

// ── 世界状态（generate-plan 请求体；客户端须 session 缓存）────────────────────

/** 与 decision-engine TripWorldState 对齐；含 decisionCausalityChain */
export interface TripWorldState {
  context?: Record<string, unknown>;
  signals?: Record<string, unknown>;
  decisionCausalityChain?: unknown[];
  [key: string]: unknown;
}

// ── 因果人格投影（规划工作台 / generate-plan echo）──────────────────────────

export type CausalPersonaSeat = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export interface CausalChainStep {
  stepId?: string;
  order?: number;
  persona?: CausalPersonaSeat;
  /** Abu / Neptune 切片标识 */
  slice?: 'abu' | 'neptune' | 'dre' | string;
  label?: string;
  summary?: string;
  evidenceRefs?: string[];
}

export interface CausalEvidenceItem {
  id?: string;
  label?: string;
  kind?: string;
  summary?: string;
  freshness?: string;
}

export interface CausalPersonaProjection {
  schemaVersion?: string;
  /** 与预测 tick join（部分响应仅在 projection 内携带） */
  causalityId?: string;
  /** true 时禁止并行 LLM guardian eval，只渲染 projection */
  kernelAuthoritative?: boolean;
  presentation?: Pick<GuardianPersonaPresentation, 'headline' | 'narrative'> & {
    narrative?: string;
    headline?: string;
  };
  causalChain?: CausalChainStep[];
  evidence?: CausalEvidenceItem[];
  abuSlice?: { summary?: string; verdict?: string };
  neptuneSlice?: { summary?: string; verdict?: string };
}

// ── 冰岛自驾因果评估 / 校准 ───────────────────────────────────────────────────

export interface IcelandSelfDriveCausalAssessment {
  missProb?: number;
  p90Minutes?: number;
  windExposure?: number;
  rationale?: string;
  factors?: Array<{
    id?: string;
    label?: string;
    contribution?: string;
  }>;
}

export interface IcelandCausalCalibration {
  sampleCount?: number;
  missProbBias?: number;
  p90MinutesBias?: number;
  updatedAt?: string;
}

// ── 反事实闭环 ────────────────────────────────────────────────────────────────

export interface CausalObservationMetrics {
  iceland_miss_prob?: number;
  iceland_p90_minutes?: number;
}

/** outcome.extensions.causal_observation 推荐形状 */
export interface CausalObservationV1 {
  schema: 'tripnara/causal-observation/v1';
  metrics?: CausalObservationMetrics;
  missed_appointment?: boolean;
  narrative?: string;
}

export interface CausalMetricDelta {
  predicted?: number;
  observed?: number;
  delta?: number;
}

export interface CausalCounterfactualSnapshot {
  causalityId?: string;
  predictedMetrics?: CausalObservationMetrics;
  capturedAt?: string;
}

export interface CausalCounterfactualReport {
  causalityId?: string;
  metricDeltas?: Record<string, CausalMetricDelta>;
  userFacingAssessment?: string;
  missedAppointment?: boolean;
  narrative?: string;
}

/** generate-plan / repair-plan / causal-outcome / ops-outcome 附带 echo */
export interface CausalRuntimeEcho {
  lastDecisionCausalityId?: string;
  icelandSelfDriveCausalAssessment?: IcelandSelfDriveCausalAssessment;
  causalPersonaProjection?: CausalPersonaProjection;
  icelandCausalCalibration?: IcelandCausalCalibration;
  causalCounterfactualSnapshot?: CausalCounterfactualSnapshot;
}

// ── API 请求 / 响应 ───────────────────────────────────────────────────────────

export interface CausalOutcomeRequest {
  state: TripWorldState;
  causality_id: string;
  tripId?: string;
  metrics?: CausalObservationMetrics;
  missed_appointment?: boolean;
  narrative?: string;
}

export interface CausalOutcomeReport {
  metricDeltas?: Record<string, CausalMetricDelta>;
  userFacingAssessment?: string;
}

export interface CausalOutcomeResponseData extends CausalRuntimeEcho {
  report?: CausalOutcomeReport;
  travelEventPersisted?: boolean;
}

/** ops-reality-audit outcome 闭环扩展响应（fail-open） */
export interface OpsRealityOutcomeCausalExtension extends CausalRuntimeEcho {
  success: boolean;
  snapshotId: string;
  causalCounterfactualClosed?: boolean;
  causalCounterfactualReport?: CausalCounterfactualReport;
  travelEventPersisted?: boolean;
}

/** Gate1 trust-surface Plan B 卡 P4 扩展 */
export interface Gate1TrustCausalChainStep {
  label: string;
  summary?: string;
  persona?: CausalPersonaSeat;
}
