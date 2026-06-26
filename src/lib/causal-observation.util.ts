/**
 * Causal observation 构建与解析（ops outcome extensions）
 */

import type {
  CausalObservationMetrics,
  CausalObservationV1,
} from '@/types/causal-travel-runtime';

export function buildCausalObservation(
  input: {
    metrics?: CausalObservationMetrics;
    missed_appointment?: boolean;
    narrative?: string;
  }
): CausalObservationV1 {
  return {
    schema: 'tripnara/causal-observation/v1',
    metrics: input.metrics,
    missed_appointment: input.missed_appointment,
    narrative: input.narrative,
  };
}

export function parseCausalObservation(
  extensions: Record<string, unknown> | undefined
): CausalObservationV1 | null {
  if (!extensions) return null;
  const raw = extensions.causal_observation;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.schema !== 'tripnara/causal-observation/v1') return null;
  return raw as CausalObservationV1;
}

/** kernelAuthoritative 时不应并行请求 LLM guardian eval */
export function shouldSkipLlmGuardianEval(
  projection?: { kernelAuthoritative?: boolean } | null
): boolean {
  return projection?.kernelAuthoritative === true;
}
