/**
 * OR-Tools Shadow（ADR-008 / M4-RA-01A）前端薄类型。
 * 只 pick UI 需要字段；shadowAuthority / writeAuthority 锁定为 false。
 */

export const ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID =
  'tripnara.ortools_evaluate_shadow@v1' as const;

export const ORTOOLS_PLANNING_SHADOW_SCHEMA_ID =
  'tripnara.ortools_planning_shadow@v1' as const;

export type OrtToolsShadowEvidenceFreshness = 'FRESH' | 'STALE';

export type OrtToolsCanaryStage =
  | 'shadow'
  | 'selected_trips'
  | 'expanded'
  | 'full'
  | string;

/** GET /decision-engine/v1/ortools-shadow/health → data */
export interface OrtToolsShadowHealthData {
  shadowRepairEnabled: boolean;
  solverUrlConfigured: boolean;
  /** 恒为 false — UI 须写「仅对比 / 非权威」 */
  writeAuthority: false;
  canaryStage: OrtToolsCanaryStage;
  authoritativeCanaryFlag: boolean;
  planningOrchestratorShadow?: {
    optimizeRouteField?: string;
    autoArrangeField?: string;
    [key: string]: unknown;
  };
  mvpOperations?: string[];
  [key: string]: unknown;
}

export interface OrtToolsShadowLabCompare {
  orderConsistent?: boolean;
  distanceDeltaMeters?: number;
  summary?: string;
  [key: string]: unknown;
}

export interface OrtToolsShadowCanaryAudit {
  canaryStage?: OrtToolsCanaryStage;
  authoritativeProviderId?: string;
  whitelistMatched?: boolean;
  mergedIntoRepairCandidates?: boolean;
  mergedCandidateIds?: string[];
  gateAuthoritativePromotion?: unknown;
  [key: string]: unknown;
}

export interface OrtToolsShadowReport {
  writeAttempted?: false;
  gatewayRequired?: boolean;
  summary?: string;
  [key: string]: unknown;
}

export interface OrtToolsShadowCandidate {
  candidateId?: string;
  id?: string;
  label?: string;
  generatorVersion?: string;
  [key: string]: unknown;
}

/** workspace.ortoolsShadow — Evaluate Shadow */
export interface OrtToolsEvaluateShadowAttachment {
  schemaId: typeof ORTOOLS_EVALUATE_SHADOW_SCHEMA_ID;
  shadowAuthority: false;
  report?: OrtToolsShadowReport;
  gatewayByCandidateId?: Record<string, unknown>;
  shadowRepairCandidates?: OrtToolsShadowCandidate[];
  neptuneCandidateCount?: number;
  shadowCandidateCount?: number;
  evidenceFreshness?: OrtToolsShadowEvidenceFreshness;
  discardedStalePrior?: boolean;
  solverOperation?: string;
  solverUnavailableReason?: string;
  canary?: OrtToolsShadowCanaryAudit;
  [key: string]: unknown;
}

/** proposal.ortoolsShadow — Planning Shadow */
export interface OrtToolsPlanningShadowAttachment {
  schemaId: typeof ORTOOLS_PLANNING_SHADOW_SCHEMA_ID;
  shadowAuthority: false;
  planningIntent?: 'OPTIMIZE_ROUTE' | 'AUTO_ARRANGE' | string;
  /** 仅观测；禁止当作 apply 输入 */
  shadowChanges?: Array<Record<string, unknown>>;
  legacyChangeCount?: number;
  shadowChangeCount?: number;
  labCompare?: OrtToolsShadowLabCompare;
  dayIndex?: number;
  evidenceFreshness?: OrtToolsShadowEvidenceFreshness;
  report?: OrtToolsShadowReport;
  solverUnavailableReason?: string;
  canary?: OrtToolsShadowCanaryAudit;
  [key: string]: unknown;
}

export interface OrtToolsShadowHealthSnapshot {
  loaded: boolean;
  fetchedAt?: number;
  data: OrtToolsShadowHealthData | null;
  error?: string | null;
}
