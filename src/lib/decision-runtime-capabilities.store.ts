import { decisionRuntimeApi } from '@/api/decision-runtime';
import type { DecisionRuntimeCapabilitiesSnapshot } from '@/types/decision-runtime-capabilities';

function envWriteChainEnabled(): boolean {
  return import.meta.env.VITE_DECISION_GATEWAY_UNIFIED === '1';
}

function envFallbackSnapshot(): DecisionRuntimeCapabilitiesSnapshot {
  const on = envWriteChainEnabled();
  return {
    writeChainEnabled: on,
    gatewayDomainRulesExclusive: on,
    constraintPlanVerifyProjection: on,
    phase6LegacyDeprecation: on,
    loaded: false,
    source: 'env-fallback',
  };
}

let snapshot: DecisionRuntimeCapabilitiesSnapshot = envFallbackSnapshot();
let inflight: Promise<DecisionRuntimeCapabilitiesSnapshot> | null = null;

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mergeCapabilityPayload(
  ops: Partial<DecisionRuntimeCapabilitiesSnapshot> | null | undefined,
  caps: Partial<DecisionRuntimeCapabilitiesSnapshot> | null | undefined,
): DecisionRuntimeCapabilitiesSnapshot {
  const envOn = envWriteChainEnabled();
  const writeChainEnabled =
    asBool(caps?.writeChainEnabled) ||
    asBool(ops?.writeChainEnabled) ||
    envOn;

  return {
    writeChainEnabled,
    gatewayDomainRulesExclusive:
      asBool(caps?.gatewayDomainRulesExclusive) ||
      asBool(ops?.gatewayDomainRulesExclusive) ||
      writeChainEnabled,
    constraintPlanVerifyProjection:
      asBool(caps?.constraintPlanVerifyProjection) ||
      asBool(ops?.constraintPlanVerifyProjection) ||
      writeChainEnabled,
    phase6LegacyDeprecation:
      asBool(caps?.phase6LegacyDeprecation) ||
      asBool(ops?.phase6LegacyDeprecation) ||
      writeChainEnabled,
    loaded: true,
    source: 'runtime',
    fetchedAt: Date.now(),
  };
}

export function getDecisionRuntimeCapabilitiesSnapshot(): DecisionRuntimeCapabilitiesSnapshot {
  return snapshot;
}

export function resetDecisionRuntimeCapabilitiesForTests(
  next?: DecisionRuntimeCapabilitiesSnapshot,
): void {
  snapshot = next ?? envFallbackSnapshot();
  inflight = null;
}

export async function prefetchDecisionRuntimeCapabilities(): Promise<DecisionRuntimeCapabilitiesSnapshot> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [ops, caps] = await Promise.all([
        decisionRuntimeApi.getWriteChainOps(),
        decisionRuntimeApi.getRuntimeCapabilities(),
      ]);
      if (!ops && !caps) {
        snapshot = { ...envFallbackSnapshot(), loaded: true };
        return snapshot;
      }
      snapshot = mergeCapabilityPayload(ops ?? undefined, caps ?? undefined);
      return snapshot;
    } catch {
      snapshot = { ...envFallbackSnapshot(), loaded: true };
      return snapshot;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function isWriteChainEnabledFromRuntime(): boolean {
  return getDecisionRuntimeCapabilitiesSnapshot().writeChainEnabled;
}

export function isGatewayDomainRulesExclusiveFromRuntime(): boolean {
  return getDecisionRuntimeCapabilitiesSnapshot().gatewayDomainRulesExclusive;
}

export function isConstraintPlanVerifyProjectionFromRuntime(): boolean {
  return getDecisionRuntimeCapabilitiesSnapshot().constraintPlanVerifyProjection;
}

export function isPhase6LegacyDeprecationFromRuntime(): boolean {
  return getDecisionRuntimeCapabilitiesSnapshot().phase6LegacyDeprecation;
}
