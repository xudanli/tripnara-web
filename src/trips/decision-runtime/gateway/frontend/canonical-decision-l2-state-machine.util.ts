/**
 * Canonical L2 阶段分类 — 对齐 Gateway RFC-001 Slices 1–3。
 * 禁止对 Canonical 问题走 Legacy POST decisions + poll。
 */
import type {
  CanonicalL2Phase,
  DecisionRouteView,
  Rfc001SemanticCapability,
} from '@/types/unified-decision';

export type { CanonicalL2Phase };

const CANONICAL_SEMANTIC_CAPABILITIES = new Set<string>([
  'ROAD_SEGMENT_UNAVAILABLE',
  'WEATHER_ACTIVITY_PROHIBITED',
  'EXCESSIVE_DAILY_LOAD',
]);

const CANONICAL_ENGINE_IDS = new Set<string>(['CANONICAL_DECISION_RUNTIME']);

const PERSONA_LABELS: Record<string, string> = {
  ROAD_SEGMENT_UNAVAILABLE: 'Abu',
  WEATHER_ACTIVITY_PROHIBITED: 'Abu',
  EXCESSIVE_DAILY_LOAD: 'Dr.Dre',
};

const SEMANTIC_CAPABILITY_TITLES: Record<string, string> = {
  ROAD_SEGMENT_UNAVAILABLE: '道路关闭 / F-road 不可通行',
  WEATHER_ACTIVITY_PROHIBITED: '天气 / 活动限制',
  EXCESSIVE_DAILY_LOAD: '单日行程负荷过高',
};

function norm(value: string | null | undefined): string {
  return String(value ?? '').trim().toUpperCase();
}

export function personaLabelForSemanticCapability(
  semanticCapability: Rfc001SemanticCapability | null | undefined,
): string {
  const key = String(semanticCapability ?? '').trim();
  return PERSONA_LABELS[key] ?? 'Decision Core';
}

export function titleForSemanticCapability(
  semanticCapability: Rfc001SemanticCapability | null | undefined,
): string {
  const key = String(semanticCapability ?? '').trim();
  return SEMANTIC_CAPABILITY_TITLES[key] ?? '需要您的决策';
}

export function routeResolutionLabel(resolution?: string | null): string | null {
  const normalized = norm(resolution);
  if (!normalized || normalized === 'PRIMARY') return null;
  if (normalized === 'LEGACY_FALLBACK') return 'Legacy 回退';
  if (normalized === 'MANUAL_REVIEW') return '需人工审核';
  return resolution ?? null;
}

export function isPrimaryRouteResolution(resolution?: string | null): boolean {
  const normalized = norm(resolution);
  return !normalized || normalized === 'PRIMARY';
}

export function isCanonicalEngineId(engineId: string | null | undefined): boolean {
  return CANONICAL_ENGINE_IDS.has(norm(engineId));
}

export function isCanonicalSemanticCapability(
  semanticCapability: string | null | undefined,
): boolean {
  return CANONICAL_SEMANTIC_CAPABILITIES.has(String(semanticCapability ?? '').trim());
}

export interface IsCanonicalL2ProblemInput {
  semanticCapability?: string | null;
  route?: DecisionRouteView | null;
  engineId?: string | null;
}

/** 由 item.flow / Gateway route 决定；禁止 destination === 'IS'|'NZ' 硬编码 */
export function isCanonicalL2Problem(input: IsCanonicalL2ProblemInput): boolean {
  if (isCanonicalSemanticCapability(input.semanticCapability)) return true;
  if (isCanonicalEngineId(input.route?.engineId)) return true;
  if (isCanonicalEngineId(input.engineId)) return true;
  return false;
}

export interface ClassifyCanonicalL2PhaseInput {
  semanticCapability?: Rfc001SemanticCapability | null;
  recordStatus?: string | null;
  planVersionStatus?: string | null;
  requiresUserConfirmation?: boolean | null;
  problemStatus?: string | null;
  route?: DecisionRouteView | null;
}

export function classifyCanonicalL2Phase(
  input: ClassifyCanonicalL2PhaseInput,
): CanonicalL2Phase {
  const recordStatus = norm(input.recordStatus);
  const planVersionStatus = norm(input.planVersionStatus);
  const problemStatus = norm(input.problemStatus);

  if (recordStatus === 'ROLLED_BACK' || planVersionStatus === 'ROLLED_BACK') {
    return 'ROLLED_BACK';
  }

  if (
    recordStatus === 'NEEDS_REPAIR' ||
    planVersionStatus === 'NEEDS_REPAIR' ||
    problemStatus === 'NEEDS_REPAIR'
  ) {
    return 'NEEDS_REPAIR';
  }

  if (
    recordStatus === 'EFFECTIVE' ||
    planVersionStatus === 'EFFECTIVE' ||
    problemStatus === 'RESOLVED'
  ) {
    return 'EFFECTIVE';
  }

  if (
    recordStatus === 'AUTHORIZED' ||
    planVersionStatus === 'PENDING_EXECUTION' ||
    planVersionStatus === 'AUTHORIZED'
  ) {
    return 'AWAITING_EXECUTE';
  }

  if (
    recordStatus === 'PROPOSED' ||
    planVersionStatus === 'PENDING_AUTHORIZATION' ||
    (input.requiresUserConfirmation === true && recordStatus !== 'EFFECTIVE')
  ) {
    return 'AWAITING_AUTHORIZE';
  }

  if (!recordStatus && !planVersionStatus) {
    return 'NEEDS_EVALUATE';
  }

  if (recordStatus === 'DRAFT' || planVersionStatus === 'DRAFT') {
    return 'NEEDS_EVALUATE';
  }

  return 'UNKNOWN';
}

/** evaluate 已返回候选但 record 尚未 PROPOSED 时，UI 应进入「选择方案」 */
export function resolveDisplayCanonicalL2Phase(
  phase: CanonicalL2Phase,
  input: { optionCount?: number; evaluateCandidateCount?: number },
): CanonicalL2Phase {
  const hasCandidates =
    (input.optionCount ?? 0) > 0 || (input.evaluateCandidateCount ?? 0) > 0;
  if (phase === 'NEEDS_EVALUATE' && hasCandidates) {
    return 'AWAITING_AUTHORIZE';
  }
  return phase;
}

/** execute 成功后是否应刷新 itinerary（authorize 前不应刷新） */
export function shouldRefreshItineraryAfterCanonicalExecute(
  phase: CanonicalL2Phase,
): boolean {
  return phase === 'EFFECTIVE';
}

export function buildCanonicalExecuteIdempotencyKey(input: {
  tripId: string;
  decisionId: string;
}): string {
  return `pv:${input.tripId}:${input.decisionId}`;
}

export type ProblemFlowKind = 'CANONICAL_L2' | 'LEGACY_V15';

export function resolveProblemFlow(input: {
  semanticCapability?: string | null;
  route?: DecisionRouteView | null;
  engineId?: string | null;
}): ProblemFlowKind {
  return isCanonicalL2Problem(input) ? 'CANONICAL_L2' : 'LEGACY_V15';
}

export const CANONICAL_L2_PHASE_LABELS: Record<CanonicalL2Phase, string> = {
  NEEDS_EVALUATE: '生成方案',
  AWAITING_AUTHORIZE: '选择方案',
  AWAITING_EXECUTE: '确认生效',
  EFFECTIVE: '已生效',
  ROLLED_BACK: '已回滚',
  NEEDS_REPAIR: '需重试',
  UNKNOWN: '处理中',
};

export const CANONICAL_L2_PHASE_CTA: Record<CanonicalL2Phase, string | null> = {
  NEEDS_EVALUATE: '生成方案',
  AWAITING_AUTHORIZE: '确认选择',
  AWAITING_EXECUTE: '确认生效',
  EFFECTIVE: null,
  ROLLED_BACK: null,
  NEEDS_REPAIR: '重新生成方案',
  UNKNOWN: null,
};

/** 按所选方案 executionCapability 覆盖阶段 CTA（GUIDED_MANUAL → 查看手动步骤） */
export function resolveCanonicalPrimaryCta(
  phase: CanonicalL2Phase,
  capability?: string | null,
): string | null {
  const base = CANONICAL_L2_PHASE_CTA[phase];
  if (!base) return null;

  const normalized = capability?.trim().toUpperCase();
  const manual = normalized === 'GUIDED_MANUAL' || normalized === 'ADVISORY_ONLY';

  if (phase === 'AWAITING_AUTHORIZE' && manual) {
    return normalized === 'ADVISORY_ONLY' ? '查看建议' : '查看手动步骤';
  }
  if (phase === 'AWAITING_EXECUTE') {
    if (manual) {
      return normalized === 'ADVISORY_ONLY' ? '查看建议' : '查看手动步骤';
    }
    if (normalized === 'PARTIAL') return '应用可自动修改部分';
  }
  return base;
}
