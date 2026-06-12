/** tripnara.open_world_discovery@v1 — 开放世界稀疏 stub 核实任务 */
export type OpenWorldDiscoverySchemaId = 'tripnara.open_world_discovery@v1';

export type VerificationTaskPriority = 'P0' | 'P1' | (string & {});

export type VerificationTaskStatus = 'pending' | 'in_progress' | 'done' | (string & {});

/** provisional POI ≠ 已落地 placeId */
export interface OpenWorldVerificationTask {
  task_id: string;
  stub_id: string;
  title_zh: string;
  description_zh?: string;
  priority: VerificationTaskPriority;
  constraint_tags: string[];
  status: VerificationTaskStatus;
  cta_label_zh?: string;
  /** mark_verified 回写时可随 payload 一并提交 */
  promoted_place_id?: number;
  [key: string]: unknown;
}

/** 与 DecisionUiDisplayDto.open_world_discovery 对齐 */
export interface OpenWorldDiscoveryPayload {
  schema: OpenWorldDiscoverySchemaId;
  sparse_profile_id?: string;
  mention_count: number;
  stub_count: number;
  verification_tasks: OpenWorldVerificationTask[];
  intentional_slack_summary_zh?: string;
  computed_at?: string;
  [key: string]: unknown;
}

/** 指南别名 */
export type OpenWorldDiscoveryUi = OpenWorldDiscoveryPayload;

export type OpenWorldVerificationApplyAction = 'mark_verified' | 'discard_stub' | (string & {});

export interface OpenWorldVerificationApplyPayload {
  stub_id: string;
  promoted_place_id?: number;
  [key: string]: unknown;
}

/** POST /agent/open_world_verification/apply — 客户端回传当前快照，无服务端持久化 */
export interface OpenWorldVerificationApplyRequest {
  open_world_discovery: OpenWorldDiscoveryPayload;
  action: OpenWorldVerificationApplyAction;
  payload: OpenWorldVerificationApplyPayload;
}

export type OpenWorldUpdatedStubStatus = 'promoted' | 'discarded' | (string & {});

export interface OpenWorldUpdatedStub {
  stub_id?: string;
  status?: OpenWorldUpdatedStubStatus;
  [key: string]: unknown;
}

export interface OpenWorldVerificationApplyResponse {
  status?: 'OK' | 'REJECTED';
  message?: string;
  rejection_reason_zh?: string;
  open_world_discovery?: OpenWorldDiscoveryPayload;
  updated_stub?: OpenWorldUpdatedStub;
}

export function isOpenWorldDiscoveryPayload(v: unknown): v is OpenWorldDiscoveryPayload {
  return (
    typeof v === 'object' &&
    v != null &&
    (v as OpenWorldDiscoveryPayload).schema === 'tripnara.open_world_discovery@v1' &&
    Array.isArray((v as OpenWorldDiscoveryPayload).verification_tasks)
  );
}
