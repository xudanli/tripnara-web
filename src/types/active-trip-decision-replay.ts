/** Decision Replay · Abu 叙事 */

export type DecisionReplayPersonaId = 'abu' | 'drDre' | 'neptune';

export type DecisionReplayTimelineEntry = {
  id: string;
  at: string;
  labelZh: string;
  kind: 'instantiate' | 'task_confirmed' | 'task_rollback' | 'rollback_proposal' | 'vault_authorize';
};

export type FlywheelAuditAssertion = {
  id: string;
  passed: boolean;
  message: string;
};

/** 预测 vs 观测信号对撞（键名由后端扩展） */
export type FlywheelAuditSignals = {
  noisePredictionValidated?: boolean;
  roleAnchorObserved?: boolean;
  [key: string]: boolean | undefined;
};

/** collab_flywheel_audit_snapshots · 只读预测/观测对撞报告 */
export type FlywheelAuditReport = {
  snapshotId: string;
  applicationId: string;
  tripId: string;
  /** 预测 vs 观测是否对齐 */
  match: boolean;
  predictionFingerprint: string;
  observationFingerprint: string;
  comparablePredictionFp: string;
  comparableObservationFp: string;
  signals: FlywheelAuditSignals;
  assertions: FlywheelAuditAssertion[];
  note?: string;
};

/** GET /api/trips/:tripId/decision-replay */
export type DecisionReplayResponse = {
  tripId: string;
  timeline: DecisionReplayTimelineEntry[];
  abuNarrative: string;
  personaSections: Array<{
    persona: DecisionReplayPersonaId;
    titleZh: string;
    bodyZh: string;
  }>;
  /** 无 snapshot 时为 null */
  flywheelAuditReport?: FlywheelAuditReport | null;
};

/** GET /api/trips/:tripId/template-backflow/preview — 不写 DB */
export type TemplateBackflowPreview = {
  tripId: string;
  canBackflow: boolean;
  suggestedCatalogId: string | null;
  previewTitleZh: string;
  derivedFields: {
    itinerary_summary?: string;
    captain_message?: string;
  };
  anonymizedCrewSize?: number;
  taskCompletionRate?: number;
};

export type TemplateBackflowCommitRequest = {
  note?: string;
  skipIfExists?: boolean;
};

export type TemplateBackflowCommitResponse = {
  alreadyCommitted: boolean;
  catalogId?: string | null;
};

export type RouteContractAuthorizeRequest = {
  milestoneId?: string;
};

export type RouteContractReorderRequest = {
  milestoneIds: string[];
  note?: string;
};
