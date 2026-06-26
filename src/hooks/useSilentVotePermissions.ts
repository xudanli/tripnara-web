import { useCallback, useEffect, useState } from 'react';
import { tripsApi } from '@/api/trips';
import { useAuth } from '@/hooks/useAuth';
import { canManageSilentVote } from '@/lib/silent-vote-permissions';
import type { SilentVoteDetail } from '@/types/silent-votes';

export function useSilentVotePermissions(tripId: string | null | undefined) {
  const { user } = useAuth();
  const [tripOwnerUserId, setTripOwnerUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!tripId);

  useEffect(() => {
    if (!tripId) {
      setTripOwnerUserId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void tripsApi
      .getCollaborators(tripId)
      .then((collaborators) => {
        if (cancelled) return;
        const owner = collaborators.find((c) => c.role === 'OWNER');
        setTripOwnerUserId(owner?.userId ?? null);
      })
      .catch(() => {
        if (!cancelled) setTripOwnerUserId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const canManage = useCallback(
    (vote: Pick<SilentVoteDetail, 'createdBy'> | null | undefined) =>
      canManageSilentVote(vote, user?.id, tripOwnerUserId),
    [user?.id, tripOwnerUserId],
  );

  return {
    currentUserId: user?.id ?? null,
    tripOwnerUserId,
    loading,
    canManage,
  };
}
