import { TeamCollaborationCenter } from '@/components/team-collaboration';
import { Spinner } from '@/components/ui/spinner';
import type { TripDetail } from '@/types/trip';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';

interface TeamTabProps {
  tripId: string;
  trip: TripDetail | null;
  onTripRefetch: () => void | Promise<void>;
  onGoToSchedule: () => void;
  onInviteMembers?: () => void;
  onOpenTeamSettings?: () => void;
  destinationLabel?: string;
  userDisplayName?: string;
  onWishSummaryChange?: () => void;
  decisionProfilingInitialStep?: DecisionProfilingStep | null;
  decisionProfilingForceQuiz?: boolean;
  decisionProfilingForceReuse?: boolean;
}

/** 团队 Tab → 团队协作中心（五 Tab 仪表盘） */
export default function TeamTab({
  tripId,
  trip,
  onTripRefetch,
  onGoToSchedule,
  onInviteMembers,
  onOpenTeamSettings,
  destinationLabel,
  userDisplayName,
  onWishSummaryChange,
  decisionProfilingInitialStep,
  decisionProfilingForceQuiz,
  decisionProfilingForceReuse,
}: TeamTabProps) {
  if (!trip) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <TeamCollaborationCenter
      tripId={tripId}
      trip={trip}
      onTripRefetch={onTripRefetch}
      onGoToSchedule={onGoToSchedule}
      onInviteMembers={onInviteMembers}
      onOpenTeamSettings={onOpenTeamSettings}
      destinationLabel={destinationLabel}
      userDisplayName={userDisplayName}
      onWishSummaryChange={onWishSummaryChange}
      decisionProfilingInitialStep={decisionProfilingInitialStep}
      decisionProfilingForceQuiz={decisionProfilingForceQuiz}
      decisionProfilingForceReuse={decisionProfilingForceReuse}
    />
  );
}
