import TeamTabContent from '@/components/trips/TeamTabContent';
import { CollabCenterMembersDashboard } from '@/components/team-collaboration/CollabCenterMembersDashboard';
import type { TripDetail } from '@/types/trip';

interface CollabCenterMembersTabProps {
  tripId: string;
  trip: TripDetail;
  onTripRefetch?: () => void | Promise<void>;
  onGoToSchedule?: () => void;
}

function resolveTeamId(trip: TripDetail): string | null {
  const fromMeta = (trip as { metadata?: { teamId?: string } }).metadata?.teamId;
  if (fromMeta) return fromMeta;
  try {
    return localStorage.getItem(`trip_team_id:${trip.id}`);
  } catch {
    return null;
  }
}

export function CollabCenterMembersTab({
  tripId,
  trip,
  onTripRefetch,
  onGoToSchedule,
}: CollabCenterMembersTabProps) {
  const teamId = resolveTeamId(trip);

  if (!teamId) {
    return (
      <TeamTabContent
        tripId={tripId}
        trip={trip}
        onTripRefetch={onTripRefetch}
        onGoToPlanStudio={onGoToSchedule}
        embedded
      />
    );
  }

  return (
    <CollabCenterMembersDashboard
      tripId={tripId}
      teamId={teamId}
      trip={trip}
      onTripRefetch={onTripRefetch}
      onGoToSchedule={onGoToSchedule}
    />
  );
}
