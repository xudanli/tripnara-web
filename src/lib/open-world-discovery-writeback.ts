import { agentApi } from '@/api/agent';
import { normalizeOpenWorldDiscovery } from '@/lib/open-world-discovery-ui';
import type {
  OpenWorldDiscoveryPayload,
  OpenWorldVerificationApplyAction,
  OpenWorldVerificationApplyPayload,
  OpenWorldVerificationApplyResponse,
  OpenWorldVerificationTask,
} from '@/types/open-world-discovery';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function buildApplyPayload(
  action: OpenWorldVerificationApplyAction,
  task: OpenWorldVerificationTask
): OpenWorldVerificationApplyPayload {
  const payload: OpenWorldVerificationApplyPayload = { stub_id: task.stub_id };
  if (action === 'mark_verified') {
    const promoted =
      pickNum(task.promoted_place_id) ?? pickNum((task as Record<string, unknown>).promotedPlaceId);
    if (promoted != null) payload.promoted_place_id = promoted;
  }
  return payload;
}

function normalizeUpdatedStub(raw: unknown): OpenWorldVerificationApplyResponse['updated_stub'] {
  if (!isRecord(raw)) return undefined;
  const statusRaw = pickStr(raw.status);
  const status =
    statusRaw === 'promoted' || statusRaw === 'discarded' ? statusRaw : statusRaw;
  return {
    ...(pickStr(raw.stub_id) ?? pickStr(raw.stubId) ? { stub_id: pickStr(raw.stub_id) ?? pickStr(raw.stubId) } : {}),
    ...(status ? { status } : {}),
  };
}

function normalizeApplyResponse(data: Record<string, unknown>): OpenWorldVerificationApplyResponse {
  const discoveryRaw =
    data.open_world_discovery ?? data.openWorldDiscovery ?? data.discovery;
  const open_world_discovery = normalizeOpenWorldDiscovery(discoveryRaw) ?? undefined;

  const statusRaw = data.status;
  const status =
    statusRaw === 'OK' || statusRaw === 'REJECTED' ? statusRaw : undefined;

  const rejection_reason_zh =
    pickStr(data.rejection_reason_zh) ?? pickStr(data.rejectionReasonZh);
  const message =
    pickStr(data.message) ?? rejection_reason_zh;

  const updated_stub = normalizeUpdatedStub(data.updated_stub ?? data.updatedStub);

  return {
    ...(status ? { status } : {}),
    ...(open_world_discovery ? { open_world_discovery } : {}),
    ...(updated_stub ? { updated_stub } : {}),
    ...(rejection_reason_zh ? { rejection_reason_zh } : {}),
    ...(message ? { message } : {}),
  };
}

export function openWorldVerificationErrorMessage(
  response: OpenWorldVerificationApplyResponse,
  fallback: string
): string {
  return response.rejection_reason_zh?.trim() || response.message?.trim() || fallback;
}

/**
 * POST /agent/open_world_verification/apply
 * 用响应 open_world_discovery 替换本地快照。
 */
export async function applyOpenWorldVerification(params: {
  discovery: OpenWorldDiscoveryPayload;
  action: OpenWorldVerificationApplyAction;
  task: OpenWorldVerificationTask;
}): Promise<OpenWorldVerificationApplyResponse> {
  const data = await agentApi.applyOpenWorldVerification({
    open_world_discovery: params.discovery,
    action: params.action,
    payload: buildApplyPayload(params.action, params.task),
  });

  if (isRecord(data)) {
    return normalizeApplyResponse(data);
  }

  return normalizeApplyResponse(data as Record<string, unknown>);
}

export async function applyOpenWorldVerificationMarkVerified(params: {
  discovery: OpenWorldDiscoveryPayload;
  task: OpenWorldVerificationTask;
}): Promise<OpenWorldVerificationApplyResponse> {
  return applyOpenWorldVerification({ ...params, action: 'mark_verified' });
}

export async function applyOpenWorldVerificationDiscardStub(params: {
  discovery: OpenWorldDiscoveryPayload;
  task: OpenWorldVerificationTask;
}): Promise<OpenWorldVerificationApplyResponse> {
  return applyOpenWorldVerification({ ...params, action: 'discard_stub' });
}
