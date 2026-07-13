import { useQuery } from '@tanstack/react-query';
import { memberConfirmInboxApi } from '@/api/member-confirm-inbox';
import { tripMemberInvitesApi } from '@/api/trip-member-invites';
import { tripsApi } from '@/api/trips';
import {
  resolveMemberTripPhase,
  type MemberTripPhase,
  type TripLifecycleStatus,
} from '@/lib/member-trip-phase.util';
import type { TripMemberInviteContext } from '@/types/member-onboarding';

export function useMemberConfirmInbox(options: {
  inviteCode?: string;
  tripId?: string;
  enabled?: boolean;
}) {
  const { inviteCode, tripId, enabled = true } = options;

  return useQuery({
    queryKey: ['member-confirm-inbox', inviteCode ?? tripId],
    queryFn: async () => {
      if (inviteCode) return memberConfirmInboxApi.getByInviteCode(inviteCode);
      if (tripId) return memberConfirmInboxApi.getByTripId(tripId);
      throw new Error('缺少 inviteCode 或 tripId');
    },
    enabled: enabled && Boolean(inviteCode || tripId),
    staleTime: 20_000,
  });
}

export function useMemberTripPhaseContext(inviteCode: string | undefined) {
  return useQuery({
    queryKey: ['member-trip-phase', inviteCode],
    queryFn: async (): Promise<{
      phase: MemberTripPhase;
      inviteContext: TripMemberInviteContext;
      tripStatus?: TripLifecycleStatus;
    }> => {
      if (!inviteCode) throw new Error('missing code');
      const inviteContext = await tripMemberInvitesApi.getContext(inviteCode);
      let tripStatus: TripLifecycleStatus | undefined;
      try {
        const trip = await tripsApi.getById(inviteContext.tripId);
        tripStatus = trip.status as TripLifecycleStatus;
      } catch {
        tripStatus = 'PLANNING';
      }
      const phase = resolveMemberTripPhase({ tripStatus, inviteContext });
      return { phase, inviteContext, tripStatus };
    },
    enabled: Boolean(inviteCode),
    staleTime: 30_000,
  });
}
