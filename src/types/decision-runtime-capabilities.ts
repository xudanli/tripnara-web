/** GET /decision-runtime/ops/write-chain · GET /decision-engine/v1/runtime-capabilities */

export interface DecisionWriteChainOpsResponse {
  writeChainEnabled?: boolean;
  gatewayDomainRulesExclusive?: boolean;
  constraintPlanVerifyProjection?: boolean;
  phase6LegacyDeprecation?: boolean;
}

export interface DecisionRuntimeCapabilitiesResponse extends DecisionWriteChainOpsResponse {
  /** 后端可能只返回子集；未返回字段由 merge 逻辑补默认 */
}

export interface DecisionRuntimeCapabilitiesSnapshot {
  writeChainEnabled: boolean;
  gatewayDomainRulesExclusive: boolean;
  constraintPlanVerifyProjection: boolean;
  phase6LegacyDeprecation: boolean;
  loaded: boolean;
  source: 'runtime' | 'env-fallback';
  fetchedAt?: number;
}

export const GATEWAY_EXCLUSIVE_FEASIBILITY_DOMAINS = [
  'poi_access',
  'schedule',
  'guardian',
] as const;

export type GatewayExclusiveFeasibilityDomain =
  (typeof GATEWAY_EXCLUSIVE_FEASIBILITY_DOMAINS)[number];

/** RLIntegration.preDecision / DAG orchestrator 结构化写链拒绝 */
export interface WriteChainRequiredSignal {
  writeChainRequired: true;
  authorizedPaths?: string[];
  message?: string;
  caller?: string;
}
