import { participantInvitePath } from '@/features/participant-portal/shell/participant-phase';
import type { InviteKind, ResolvedInvite, ResolvedInvitePreview } from '@/types/invite-resolver';

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

const INVITE_KINDS = new Set<InviteKind>(['trip_member', 'team', 'gate1_participant']);

function normalizePreview(raw: unknown): ResolvedInvitePreview | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const preview: ResolvedInvitePreview = {};
  const title = pickString(o, 'title');
  const subtitle = pickString(o, 'subtitle');
  const destination = pickString(o, 'destination');
  const tripId = pickString(o, 'tripId', 'trip_id');
  const projectId = pickString(o, 'projectId', 'project_id');
  const label = pickString(o, 'label');
  const expired = pickBool(o, 'expired');
  if (title) preview.title = title;
  if (subtitle) preview.subtitle = subtitle;
  if (destination) preview.destination = destination;
  if (tripId) preview.tripId = tripId;
  if (projectId) preview.projectId = projectId;
  if (label) preview.label = label;
  if (expired !== undefined) preview.expired = expired;
  return Object.keys(preview).length > 0 ? preview : undefined;
}

export function defaultTargetPathForKind(kind: InviteKind, token: string): string {
  if (kind === 'gate1_participant') {
    return participantInvitePath(token);
  }
  return `/invite/${encodeURIComponent(token)}`;
}

export function normalizeResolvedInvite(raw: unknown, fallbackToken: string): ResolvedInvite | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kindRaw = pickString(o, 'kind');
  if (!kindRaw || !INVITE_KINDS.has(kindRaw as InviteKind)) return null;

  const kind = kindRaw as InviteKind;
  const token = pickString(o, 'token') ?? fallbackToken;
  const targetPath =
    pickString(o, 'targetPath', 'target_path') ?? defaultTargetPathForKind(kind, token);
  return {
    kind,
    token,
    targetPath,
    preview: normalizePreview(o.preview),
  };
}

export function isInviteResolveNotFound(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const o = payload as { success?: boolean; error?: { code?: string } };
  return o.success === false && o.error?.code === 'NOT_FOUND';
}

export function rewriteJoinTripInviteUrl(url: string, inviteCode: string): string {
  if (!url.includes('/join-trip/')) return url;
  try {
    if (url.startsWith('http')) {
      const parsed = new URL(url);
      return `${parsed.origin}/invite/${inviteCode}`;
    }
  } catch {
    /* fall through */
  }
  return `/invite/${inviteCode}`;
}
