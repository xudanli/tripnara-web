import type { SilentVoteDetail } from '@/types/silent-votes';

export function buildSilentVotePagePath(tripId: string, voteId: string): string {
  return `/dashboard/trips/${tripId}/silent-votes/${voteId}`;
}

export function canManageSilentVote(
  vote: Pick<SilentVoteDetail, 'createdBy'> | null | undefined,
  currentUserId: string | null | undefined,
  tripOwnerUserId: string | null | undefined,
): boolean {
  if (!vote || !currentUserId) return false;
  if (vote.createdBy === currentUserId) return true;
  if (tripOwnerUserId && tripOwnerUserId === currentUserId) return true;
  return false;
}
