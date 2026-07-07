/** Unified Decision Gateway feature flag + routing helpers */

import {
  getDecisionRuntimeCapabilitiesSnapshot,
  prefetchDecisionRuntimeCapabilities,
} from '@/lib/decision-runtime-capabilities.store';
import {
  resolveProblemFlow,
  type ProblemFlowKind,
} from '@/generated/unified-decision-contracts';

/** 运行时 GET /decision-runtime/ops/write-chain + runtime-capabilities；未加载时回退 env */
export function isWriteChainEnabled(): boolean {
  const snap = getDecisionRuntimeCapabilitiesSnapshot();
  if (snap.loaded) return snap.writeChainEnabled;
  return import.meta.env.VITE_DECISION_GATEWAY_UNIFIED === '1';
}

/** 与后端 DECISION_GATEWAY_UNIFIED=1 / writeChainEnabled 对应 */
export function isUnifiedDecisionGatewayEnabled(): boolean {
  return isWriteChainEnabled();
}

export function isGatewayDomainRulesExclusive(): boolean {
  const snap = getDecisionRuntimeCapabilitiesSnapshot();
  if (snap.loaded) return snap.gatewayDomainRulesExclusive;
  return isWriteChainEnabled();
}

export function isConstraintPlanVerifyProjectionEnabled(): boolean {
  const snap = getDecisionRuntimeCapabilitiesSnapshot();
  if (snap.loaded) return snap.constraintPlanVerifyProjection;
  return isWriteChainEnabled();
}

export function isPhase6LegacyDeprecationEnabled(): boolean {
  const snap = getDecisionRuntimeCapabilitiesSnapshot();
  if (snap.loaded) return snap.phase6LegacyDeprecation;
  return isWriteChainEnabled();
}

export { prefetchDecisionRuntimeCapabilities };
export { resolveProblemFlow, type ProblemFlowKind };

export function unifiedGatewayFeatureLabel(): string {
  return isUnifiedDecisionGatewayEnabled() ? 'Gateway' : 'Legacy V1.5';
}
