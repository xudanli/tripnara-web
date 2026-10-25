/** tripnara.trusted_delivery@v1 — 前端可信交付面（只读公共阶段与用户动作） */
export type TrustedDeliverySchemaId = 'tripnara.trusted_delivery@v1';

export type TrustedDeliveryTaskPhase =
  | 'understanding'
  | 'researching'
  | 'selecting_places'
  | 'checking_rules'
  | 'planning'
  | 'validating'
  | 'fixing'
  | 'narrating'
  | 'quality_check'
  | 'done'
  | 'blocked'
  | 'unknown'
  | (string & {});

export type TrustedDeliveryConfirmKind = 'clarification' | 'confirmation' | 'consent' | (string & {});

export interface TrustedDeliveryTaskProgress {
  phase: TrustedDeliveryTaskPhase;
  /** 直接展示，如「调研中」 */
  label_zh: string;
  percent?: number;
  message?: string;
}

export interface TrustedDeliveryUserConfirm {
  required: boolean;
  kind?: TrustedDeliveryConfirmKind;
  summary_zh?: string;
}

export interface TrustedDeliveryDegradedExplanation {
  present: boolean;
  summary_zh?: string;
  /** 已是中文，可直接列表展示 */
  reasons_zh?: string[];
}

export interface TrustedDeliveryFlawedDisclosure {
  present: boolean;
  headline_zh?: string;
  reason_codes?: string[];
}

export interface TrustedDeliveryAiOperationLogEntry {
  label_zh: string;
  summary?: string;
  duration_ms?: number;
}

export interface TrustedDeliveryV1 {
  schemaId: TrustedDeliverySchemaId;
  version: number;
  task_progress: TrustedDeliveryTaskProgress;
  user_confirm: TrustedDeliveryUserConfirm;
  degraded_explanation: TrustedDeliveryDegradedExplanation;
  flawed_disclosure: TrustedDeliveryFlawedDisclosure;
  ai_operation_log: TrustedDeliveryAiOperationLogEntry[];
  [key: string]: unknown;
}

export function isTrustedDeliveryV1(v: unknown): v is TrustedDeliveryV1 {
  if (typeof v !== 'object' || v == null) return false;
  const o = v as Record<string, unknown>;
  const schema =
    typeof o.schemaId === 'string'
      ? o.schemaId
      : typeof o.schema_id === 'string'
        ? o.schema_id
        : typeof o.schema === 'string'
          ? o.schema
          : undefined;
  if (schema != null && schema !== 'tripnara.trusted_delivery@v1') return false;

  const progress = o.task_progress ?? o.taskProgress;
  if (typeof progress !== 'object' || progress == null) return false;
  const p = progress as Record<string, unknown>;
  return typeof p.label_zh === 'string' || typeof p.labelZh === 'string' || typeof p.phase === 'string';
}
