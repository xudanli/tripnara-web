import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripCollabApi } from '@/api/trip-detail-tab-client';
import { CollabCenterMembersDashboard } from '@/components/team-collaboration/CollabCenterMembersDashboard';
import { isAdvisorLedTrip } from '@/lib/trip-collaboration-mode.util';
import type { TripDetail } from '@/types/trip';

interface CollabCenterMembersTabProps {
  tripId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
  onGoToSchedule?: () => void;
  onOpenRoleInvites?: () => void;
}

export function CollabCenterMembersTab({
  tripId,
  trip,
  onTripRefetch,
  onOpenRoleInvites,
}: CollabCenterMembersTabProps) {
  const advisorLed = isAdvisorLedTrip(trip);

  const { data: collabShell } = useQuery({
    queryKey: ['trips', tripId, 'collab-overview', 'shell'],
    queryFn: () => tripCollabApi.getShellOverview(tripId),
    staleTime: 60_000,
  });

  const collaborators = useMemo(
    () =>
      (collabShell?.collaborators ?? []).map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        role: c.role,
      })),
    [collabShell?.collaborators],
  );

  return (
    <CollabCenterMembersDashboard
      tripId={tripId}
      trip={trip}
      collaborators={collaborators}
      includeFriction={!advisorLed}
      advisorLed={advisorLed}
      onOpenRoleInvites={onOpenRoleInvites}
      onTripRefetch={onTripRefetch}
    />
  );
}
