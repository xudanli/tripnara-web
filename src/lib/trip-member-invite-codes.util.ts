import { buildAdvisorTripInviteUrl } from '@/lib/advisor-trip-create.util';
import {
  normalizeMemberInviteCode,
  readTripMemberInviteCodes,
} from '@/lib/normalize-advisor-trip-create.util';
import type { AdvisorTripMemberInviteCode } from '@/types/advisor-trip-create';

const LOCAL_STORAGE_KEY = 'trip-member-invite-codes-v1';

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code.toLowerCase();
}

function readLocalStore(): Record<string, AdvisorTripMemberInviteCode[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, AdvisorTripMemberInviteCode[]>;
  } catch {
    return {};
  }
}

function writeLocalStore(store: Record<string, AdvisorTripMemberInviteCode[]>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function readLocalTripMemberInviteCodes(tripId: string): AdvisorTripMemberInviteCode[] {
  const list = readLocalStore()[tripId] ?? [];
  return list
    .map(normalizeMemberInviteCode)
    .filter((item): item is AdvisorTripMemberInviteCode => item != null);
}

export function appendLocalTripMemberInviteCodes(
  tripId: string,
  codes: AdvisorTripMemberInviteCode[],
): AdvisorTripMemberInviteCode[] {
  const store = readLocalStore();
  const merged = mergeInviteCodeLists(store[tripId] ?? [], codes);
  store[tripId] = merged;
  writeLocalStore(store);
  return merged;
}

export function mergeInviteCodeLists(
  ...lists: AdvisorTripMemberInviteCode[][]
): AdvisorTripMemberInviteCode[] {
  const map = new Map<string, AdvisorTripMemberInviteCode>();
  for (const list of lists) {
    for (const item of list) {
      if (!item?.inviteCode) continue;
      map.set(item.inviteCode, item);
    }
  }
  return [...map.values()];
}

/** 合并行程 metadata + 本地缓存中的邀请码 */
export function resolveTripMemberInviteCodes(
  tripId: string,
  metadata: Record<string, unknown> | null | undefined,
): AdvisorTripMemberInviteCode[] {
  return mergeInviteCodeLists(readTripMemberInviteCodes(metadata), readLocalTripMemberInviteCodes(tripId));
}

/** 生成通用「同行成员」邀请码（一人一链） */
export function buildGenericMemberInviteCodes(options?: {
  count?: number;
  labelPrefix?: string;
  existingCount?: number;
}): AdvisorTripMemberInviteCode[] {
  const count = Math.min(20, Math.max(1, options?.count ?? 1));
  const labelPrefix = options?.labelPrefix?.trim() || '同行成员';
  const startIndex = Math.max(0, options?.existingCount ?? 0);

  return Array.from({ length: count }, (_, index) => {
    const inviteCode = randomInviteCode();
    const n = startIndex + index + 1;
    return {
      inviteCode,
      inviteUrl: buildAdvisorTripInviteUrl(inviteCode),
      label: count === 1 && startIndex === 0 ? labelPrefix : `${labelPrefix} ${n}`,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
}
