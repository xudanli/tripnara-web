import { cn } from '@/lib/utils';
import { workbenchShell } from '@/components/plan-studio/workbench/workbench-ui';
import type { TripDetail } from '@/types/trip';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';
import { TeamCollaborationCenter } from './TeamCollaborationCenter';

export interface TeamCollaborationCenterPageProps {
  tripId: string;
  trip: TripDetail | null;
  onBack?: () => void;
  onTripRefetch?: () => void | Promise<void>;
  onInviteMembers?: () => void;
  onOpenTeamSettings?: () => void;
  destinationLabel?: string;
  userDisplayName?: string;
  onWishSummaryChange?: () => void;
  decisionProfilingInitialStep?: DecisionProfilingStep | null;
  decisionProfilingForceQuiz?: boolean;
  decisionProfilingForceReuse?: boolean;
  className?: string;
}

/** 规划工作台内嵌页 · 团队协作中心（非弹窗） */
export function TeamCollaborationCenterPage({
  tripId,
  trip,
  onBack,
  onTripRefetch,
  onInviteMembers,
  onOpenTeamSettings,
  destinationLabel,
  userDisplayName,
  onWishSummaryChange,
  decisionProfilingInitialStep,
  decisionProfilingForceQuiz,
  decisionProfilingForceReuse,
  className,
}: TeamCollaborationCenterPageProps) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', workbenchShell, className)}>
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <TeamCollaborationCenter
          tripId={tripId}
          trip={trip}
          onTripRefetch={onTripRefetch}
          onGoToSchedule={onBack}
          onInviteMembers={onInviteMembers}
          onOpenTeamSettings={onOpenTeamSettings}
          destinationLabel={destinationLabel}
          userDisplayName={userDisplayName}
          onWishSummaryChange={onWishSummaryChange}
          decisionProfilingInitialStep={decisionProfilingInitialStep}
          decisionProfilingForceQuiz={decisionProfilingForceQuiz}
          decisionProfilingForceReuse={decisionProfilingForceReuse}
        />
      </div>
    </div>
  );
}
