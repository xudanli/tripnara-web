import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
    <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>
      <div className="mx-auto max-w-7xl px-6 py-6">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回行程
          </Button>
        ) : null}
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
