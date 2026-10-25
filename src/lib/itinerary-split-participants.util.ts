import type { Collaborator } from '@/types/trip';
import type { ItinerarySplitPhase, ItinerarySplitPlanNoteMarker } from '@/lib/itinerary-split-note.util';

export interface TripMemberOption {
  id: string;
  label: string;
  role?: string;
}

export function resolveTripMemberOptions(
  collaborators?: Collaborator[] | null,
): TripMemberOption[] {
  if (!collaborators?.length) return [];
  return collaborators.map((c) => ({
    id: c.userId || c.id,
    label: c.displayName?.trim() || c.email?.trim() || '未命名成员',
    role: c.role,
  }));
}

export function remainingMemberIds(allIds: string[], selectedIds: string[]): string[] {
  const selected = new Set(selectedIds);
  return allIds.filter((id) => !selected.has(id));
}

/** 分流分支且仍有未分配成员时，允许同时间段新增并行活动 */
export function canAddParallelActivity(input: {
  phase?: ItinerarySplitPhase | null;
  totalMemberCount: number;
  selectedMemberCount: number;
}): boolean {
  if (input.phase !== 'branch') return false;
  if (input.totalMemberCount <= 0) return false;
  return input.selectedMemberCount > 0 && input.selectedMemberCount < input.totalMemberCount;
}

export function nextSplitLetter(existingLetters: Array<string | undefined>): string {
  const used = new Set(
    existingLetters
      .map((l) => l?.trim().toUpperCase())
      .filter((l): l is string => Boolean(l && /^[A-Z]$/.test(l))),
  );
  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return 'Z';
}

export function buildManualSplitMarker(input: {
  memberIds: string[];
  phase?: ItinerarySplitPhase;
  groupLabel?: string;
  letter?: string;
  groupId?: string;
  splitPlanId?: string;
}): ItinerarySplitPlanNoteMarker {
  const phase = input.phase ?? 'branch';
  const letter = input.letter?.trim().toUpperCase() || undefined;
  const groupLabel =
    input.groupLabel?.trim() ||
    (letter ? `分组 ${letter}` : phase === 'shared' ? '全员' : '分流');
  return {
    splitPlanId: input.splitPlanId ?? `manual_${Date.now().toString(36)}`,
    groupId: input.groupId ?? (letter ? `grp_${letter.toLowerCase()}` : 'grp_manual'),
    groupLabel,
    letter,
    phase,
    memberIds: input.memberIds,
    source: 'manual',
  };
}

export function readParticipantIdsFromMetadata(
  metadata?: Record<string, unknown> | null,
): string[] | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const raw = metadata.participantIds ?? metadata.participant_ids;
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  return ids.length ? ids : undefined;
}

export function withParticipantIdsMetadata(
  metadata: Record<string, unknown> | null | undefined,
  participantIds: string[] | undefined,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(metadata ?? {}) };
  if (participantIds?.length) {
    next.participantIds = participantIds;
  } else {
    delete next.participantIds;
    delete next.participant_ids;
  }
  return next;
}
