import TeamTabContent from '@/components/trips/TeamTabContent';
import { CollaborativeTaskFlywheelPanel } from '@/features/match-square/components/CollaborativeTaskFlywheelPanel';
import { Spinner } from '@/components/ui/spinner';
import type { TripDetail } from '@/types/trip';

interface TeamTabProps {
  tripId: string;
  trip: TripDetail | null;
  onTripRefetch: () => void | Promise<void>;
  onGoToSchedule: () => void;
}

/** 团队 Tab：成员与协作飞轮；画像/投票/协商由场景或右上角入口触发 */
export default function TeamTab({ tripId, trip, onTripRefetch, onGoToSchedule }: TeamTabProps) {
  if (!trip) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <>
      <CollaborativeTaskFlywheelPanel tripId={tripId} interactive className="mb-4" />
      <TeamTabContent
        tripId={tripId}
        trip={trip}
        onTripRefetch={onTripRefetch}
        onGoToPlanStudio={onGoToSchedule}
        embedded
      />
    </>
  );
}
