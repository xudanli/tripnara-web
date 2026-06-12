import type { RouteAndRunResponse } from '@/api/agent';
import {
  FLAWED_DRAFT_REASON_SUMMARY_ZH,
  isFlawedDraftDescriptor,
  type FlawedDraftDescriptorV1,
  type FlawedDraftReason,
  type FlawedDraftReasonCode,
} from '@/types/flawed-draft';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function pickNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function pickBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

function pickStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

function normalizeReason(v: unknown): FlawedDraftReason | null {
  if (!isRecord(v)) return null;
  const code = (pickStr(v.code) ?? 'UNRESOLVED_VERIFICATION') as FlawedDraftReasonCode;
  return {
    code,
    ...(pickStr(v.detail_zh) ?? pickStr(v.detailZh)
      ? { detail_zh: pickStr(v.detail_zh) ?? pickStr(v.detailZh) }
      : {}),
    ...(pickStr(v.detail_en) ?? pickStr(v.detailEn)
      ? { detail_en: pickStr(v.detail_en) ?? pickStr(v.detailEn) }
      : {}),
  };
}

export function normalizeFlawedDraft(raw: unknown): FlawedDraftDescriptorV1 | null {
  if (!isFlawedDraftDescriptor(raw)) return null;

  const reasons = raw.reasons
    .map((r) => normalizeReason(r))
    .filter(Boolean) as FlawedDraftReason[];

  const user_action_recommended =
    pickBool(raw.user_action_recommended) ??
    pickBool(raw.userActionRecommended) ??
    false;

  return {
    schemaId: 'tripnara.flawed_draft@v1',
    version: pickNum(raw.version) ?? 1,
    is_flawed: raw.is_flawed,
    reasons,
    user_action_recommended,
    ...(pickStr(raw.headline_zh) ?? pickStr(raw.headlineZh)
      ? { headline_zh: pickStr(raw.headline_zh) ?? pickStr(raw.headlineZh) }
      : {}),
    ...(pickStr(raw.headline_en) ?? pickStr(raw.headlineEn)
      ? { headline_en: pickStr(raw.headline_en) ?? pickStr(raw.headlineEn) }
      : {}),
    ...(pickNum(raw.repair_count) ?? pickNum(raw.repairCount)
      ? { repair_count: pickNum(raw.repair_count) ?? pickNum(raw.repairCount) }
      : {}),
    ...(pickNum(raw.max_repair_count) ?? pickNum(raw.maxRepairCount)
      ? { max_repair_count: pickNum(raw.max_repair_count) ?? pickNum(raw.maxRepairCount) }
      : {}),
    ...(pickStr(raw.gate_status) ?? pickStr(raw.gateStatus)
      ? { gate_status: pickStr(raw.gate_status) ?? pickStr(raw.gateStatus) }
      : {}),
    ...(pickStringArray(raw.unresolved_verification_codes ?? raw.unresolvedVerificationCodes)
      ? {
          unresolved_verification_codes: pickStringArray(
            raw.unresolved_verification_codes ?? raw.unresolvedVerificationCodes
          ),
        }
      : {}),
  };
}

function pickRawFlawedDraft(response: RouteAndRunResponse): unknown {
  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const fromPayload = payload?.flawed_draft_v1 ?? payload?.flawedDraftV1;
  if (fromPayload != null) return fromPayload;

  const explain = response.explain as Record<string, unknown> | undefined;
  return explain?.flawed_draft_v1 ?? explain?.flawedDraftV1;
}

/** payload.flawed_draft_v1 优先；次选 explain.flawed_draft_v1（同源只读镜像） */
export function pickFlawedDraftFromRouteRun(
  response: RouteAndRunResponse
): FlawedDraftDescriptorV1 | null {
  if (response.result?.status !== 'OK') return null;
  return normalizeFlawedDraft(pickRawFlawedDraft(response));
}

export function hasFlawedDraftUi(draft: FlawedDraftDescriptorV1 | null | undefined): boolean {
  return draft?.is_flawed === true;
}

export function flawedDraftHeadline(draft: FlawedDraftDescriptorV1): string {
  return (
    draft.headline_zh?.trim() ||
    draft.reasons[0]?.detail_zh?.trim() ||
    FLAWED_DRAFT_REASON_SUMMARY_ZH[draft.reasons[0]?.code ?? ''] ||
    '当前行程为瑕疵草案，尚未完全验证，请确认后再定稿。'
  );
}

export function flawedDraftReasonLabel(reason: FlawedDraftReason): string {
  return (
    reason.detail_zh?.trim() ||
    FLAWED_DRAFT_REASON_SUMMARY_ZH[reason.code] ||
    reason.code
  );
}

export function flawedDraftSubheadline(draft: FlawedDraftDescriptorV1): string | null {
  const first = draft.reasons[0];
  if (!first) return null;
  const summary = FLAWED_DRAFT_REASON_SUMMARY_ZH[first.code];
  if (first.detail_zh?.trim() && summary && first.detail_zh.trim() !== summary) {
    return summary;
  }
  if (!draft.headline_zh?.trim() && summary) return summary;
  return null;
}
