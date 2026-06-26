/**
 * Decision OS · 前端类型（文档镜像）
 *
 * 运行时源码：`src/types/decision-os.ts`（须保持同步）
 * @see docs/api/decision-os-frontend-integration.md
 */

export type Gate1TrustCardSubjectType = 'CANDIDATE' | 'PLAN_B' | 'DECISION';

export type Gate1TrustConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type Gate1TrustDataSourceKind =
  | 'HUMAN_ASSISTED'
  | 'SANITIZED_CONSTRAINT'
  | 'CONFLICT_REPORT'
  | 'READINESS'
  | 'ADVISOR'
  | 'SYSTEM';

export interface Gate1TrustCard {
  cardId: string;
  subjectType: Gate1TrustCardSubjectType;
  subjectId: string;
  title: string;
  confidence: {
    level: Gate1TrustConfidenceLevel;
    score: number | null;
    rationale: string;
  };
  alternatives: Array<{
    id: string;
    label: string;
    summary: string;
    confidenceLevel: string;
    isSelected?: boolean;
  }>;
  dataSources: Array<{
    id: string;
    label: string;
    kind: Gate1TrustDataSourceKind;
    freshness?: string;
  }>;
  machineAesthetic: {
    humanAssisted: boolean;
    humanMinutes: number | null;
    disclaimer: string;
  };
  /** P4：Plan B 卡因果链摘要 */
  causalChain?: Array<{
    label: string;
    summary?: string;
    persona?: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  }>;
  updatedAt: string;
}

export interface Gate1TrustSurface {
  projectId?: string;
  schemaVersion: 1;
  cards: Gate1TrustCard[];
  summary: {
    totalCards: number;
    highConfidenceCount: number;
    humanAssistedCount: number;
  };
}

export interface Gate1TrustSurfacePreview {
  schemaVersion: 1;
  cardCount: number;
  detailPath: string;
}

export type DecisionDnaSignalTier = 'EXPLICIT' | 'IMPLICIT_WITH_CONSENT' | 'FORBIDDEN';

export interface DecisionDnaConsentStatus {
  implicit_learning: boolean;
  granted_at?: string;
  revoked_at?: string | null;
  explicit_signals_always_allowed: boolean;
  signal_tiers: {
    USER_CONFIRMED_CHOICE: DecisionDnaSignalTier;
    ROLLBACK_AGGREGATE: DecisionDnaSignalTier;
    INFERRED_TRAIT: DecisionDnaSignalTier;
  };
}

export interface UpdateDecisionDnaConsentRequest {
  implicit_learning: boolean;
}

export interface DecisionOsSloSnapshot {
  generatedAt: string;
  validation: {
    totalRuns: number;
    passedRuns: number;
    passRatePct: number;
    avgDurationMs: number;
    byStage?: Record<string, { runs: number; avgIssueCount: number }>;
  };
  contingency: {
    totalRuns: number;
    successRuns: number;
    successRatePct: number;
    byPath?: Record<string, { runs: number; successRatePct: number }>;
  };
  blendedInterventionSuccessRatePct: number;
}

export interface DecisionOsContextRecallCaseResult {
  id: string;
  title: string;
  passed: boolean;
  recallPct: number;
  hits: string[];
  misses: string[];
  forbiddenPresent: string[];
}

export interface DecisionOsContextRecallBaseline {
  generatedAt: string;
  totalCases: number;
  passedCases: number;
  recallPct: number;
  targetPctT6: number;
  deltaVsTargetPct: number;
  results: DecisionOsContextRecallCaseResult[];
}

export interface DecisionOsMemoryStateShadowEntry {
  userId: string;
  recordedAt: string;
  overlayApplied: boolean;
  changedKeys: string[];
}

export interface DecisionOsMemoryStateRecentResponse {
  recentShadow: DecisionOsMemoryStateShadowEntry[];
}
