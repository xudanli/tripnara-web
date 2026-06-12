import type { RecruitmentApplicationCard, RecruitmentPostCard } from '@/types/match-square';
import type { MatchSquareRoster } from '@/lib/match-square-trip-roster';

export type MatchSquareRosterCacheEntry = {
  roster: MatchSquareRoster;
  post?: RecruitmentPostCard;
  applications?: RecruitmentApplicationCard[];
  updatedAt: number;
};

const rosterCache = new Map<string, MatchSquareRosterCacheEntry>();

export function setMatchSquareRosterCache(
  tripId: string,
  entry: Omit<MatchSquareRosterCacheEntry, 'updatedAt'>
): void {
  const id = tripId?.trim();
  if (!id || !entry.roster?.members?.length) return;
  rosterCache.set(id, { ...entry, updatedAt: Date.now() });
}

export function getMatchSquareRosterCache(tripId: string): MatchSquareRosterCacheEntry | null {
  const id = tripId?.trim();
  if (!id) return null;
  return rosterCache.get(id) ?? null;
}

export function clearMatchSquareRosterCache(tripId?: string): void {
  if (tripId?.trim()) {
    rosterCache.delete(tripId.trim());
    return;
  }
  rosterCache.clear();
}
