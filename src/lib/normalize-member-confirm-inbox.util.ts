import type {
  ConfirmScope,
  MemberConfirmInboxItem,
  MemberConfirmInboxResponse,
  MemberConfirmPhase,
  MemberConfirmStatus,
} from '@/types/trip-confirm-inbox';

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

const CONFIRM_SCOPES = new Set<ConfirmScope>([
  'AI_AUTO',
  'ADVISOR_DIRECT',
  'PAYER',
  'AFFECTED_MEMBERS',
  'PAYER_AND_MEMBERS',
  'ALL_MEMBERS',
]);

const CONFIRM_PHASES = new Set<MemberConfirmPhase>(['planning', 'execution', 'completion']);
const CONFIRM_STATUSES = new Set<MemberConfirmStatus>(['PENDING', 'COMPLETED', 'DISMISSED']);

export function normalizeMemberConfirmInboxItem(raw: unknown): MemberConfirmInboxItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = pickString(o, 'id');
  const title = pickString(o, 'title');
  if (!id || !title) return null;

  const confirmScopeRaw = pickString(o, 'confirmScope', 'confirm_scope')?.toUpperCase();
  const phaseRaw = pickString(o, 'phase')?.toLowerCase() as MemberConfirmPhase | undefined;
  const statusRaw = pickString(o, 'status')?.toUpperCase() as MemberConfirmStatus | undefined;

  const confirmScope = CONFIRM_SCOPES.has(confirmScopeRaw as ConfirmScope)
    ? (confirmScopeRaw as ConfirmScope)
    : 'AFFECTED_MEMBERS';
  const phase = phaseRaw && CONFIRM_PHASES.has(phaseRaw) ? phaseRaw : 'planning';
  const status = statusRaw && CONFIRM_STATUSES.has(statusRaw) ? statusRaw : 'PENDING';

  return {
    id,
    title,
    summary: pickString(o, 'summary'),
    confirmScope,
    phase,
    status,
    dueAt: pickString(o, 'dueAt', 'due_at'),
    actionHref: pickString(o, 'actionHref', 'action_href'),
    blocking: pickBool(o, 'blocking'),
  };
}

/** 后端已按 confirmScope 过滤；归一化 items 并计算 pendingCount */
export function normalizeMemberConfirmInboxResponse(
  raw: unknown,
  fallbackTripId?: string,
): MemberConfirmInboxResponse {
  const o = (raw ?? {}) as Record<string, unknown>;
  const tripId = pickString(o, 'tripId', 'trip_id') ?? fallbackTripId;
  const itemsRaw = o.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map(normalizeMemberConfirmInboxItem)
        .filter((item): item is MemberConfirmInboxItem => item != null)
    : [];

  const pendingCount =
    typeof o.pendingCount === 'number'
      ? o.pendingCount
      : typeof o.pending_count === 'number'
        ? o.pending_count
        : items.filter((item) => item.status === 'PENDING').length;

  return {
    tripId,
    items,
    pendingCount,
  };
}
