import { Compass, Handshake, Heart, MoreHorizontal, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DecisionProfilingHubDialog } from '@/components/decision-profiling/DecisionProfilingHubDialog';
import { StructuredNegotiationDialog } from '@/components/domain-influence/StructuredNegotiationDialog';
import { SilentVoteHubDialog } from '@/components/silent-vote/SilentVoteHubDialog';
import { PrivateWishDialog } from '@/components/wishlist/PrivateWishDialog';
import type { DecisionProfilingStep } from '@/types/trip-decision-profiling';

export interface PlanStudioCollaborationMenuProps {
  tripId: string;
  destinationLabel?: string;
  userDisplayName?: string;
  isSoloPlanning?: boolean;
  decisionProfilingOpen: boolean;
  onDecisionProfilingOpenChange: (open: boolean) => void;
  decisionProfilingInitialStep?: DecisionProfilingStep | null;
  decisionProfilingForceQuiz?: boolean;
  decisionProfilingForceReuse?: boolean;
  structuredNegotiationOpen: boolean;
  onStructuredNegotiationOpenChange: (open: boolean) => void;
  negotiationRoundId?: string | null;
  negotiationRoundDomain?: string | null;
  silentVoteOpen: boolean;
  onSilentVoteOpenChange: (open: boolean) => void;
  privateWishOpen: boolean;
  onPrivateWishOpenChange: (open: boolean) => void;
  onPrivateWishClose?: () => void;
}

/** 单人规划时把协作入口收进「更多」；多人时保持顶栏按钮 */
export function PlanStudioCollaborationMenu({
  tripId,
  destinationLabel,
  userDisplayName,
  isSoloPlanning = true,
  decisionProfilingOpen,
  onDecisionProfilingOpenChange,
  decisionProfilingInitialStep,
  decisionProfilingForceQuiz,
  decisionProfilingForceReuse,
  structuredNegotiationOpen,
  onStructuredNegotiationOpenChange,
  negotiationRoundId,
  negotiationRoundDomain,
  silentVoteOpen,
  onSilentVoteOpenChange,
  privateWishOpen,
  onPrivateWishOpenChange,
  onPrivateWishClose,
}: PlanStudioCollaborationMenuProps) {
  const showInlineTriggers = !isSoloPlanning;

  return (
    <>
      <DecisionProfilingHubDialog
        tripId={tripId}
        open={decisionProfilingOpen}
        onOpenChange={onDecisionProfilingOpenChange}
        initialStep={decisionProfilingInitialStep}
        forceOpenQuiz={decisionProfilingForceQuiz}
        forceReuseProfile={decisionProfilingForceReuse}
        showTrigger={showInlineTriggers}
      />
      <StructuredNegotiationDialog
        tripId={tripId}
        open={structuredNegotiationOpen}
        onOpenChange={onStructuredNegotiationOpenChange}
        initialRoundId={negotiationRoundId}
        initialRoundDomain={negotiationRoundDomain}
        showTrigger={showInlineTriggers}
      />
      <SilentVoteHubDialog
        tripId={tripId}
        open={silentVoteOpen}
        onOpenChange={onSilentVoteOpenChange}
        showTrigger={showInlineTriggers}
      />
      <PrivateWishDialog
        tripId={tripId}
        destinationLabel={destinationLabel}
        userDisplayName={userDisplayName}
        open={privateWishOpen}
        onOpenChange={(open) => {
          onPrivateWishOpenChange(open);
          if (!open) onPrivateWishClose?.();
        }}
        showTrigger={showInlineTriggers}
      />

      {isSoloPlanning ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">更多</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onDecisionProfilingOpenChange(true)}>
              <Compass className="h-3.5 w-3.5" />
              决策画像
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStructuredNegotiationOpenChange(true)}>
              <Handshake className="h-3.5 w-3.5" />
              结构化协商
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSilentVoteOpenChange(true)}>
              <Vote className="h-3.5 w-3.5" />
              团队投票
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPrivateWishOpenChange(true)}>
              <Heart className="h-3.5 w-3.5" />
              私密想法
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  );
}

export function PlanStudioCollaborationMenuBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
      {count}
    </Badge>
  );
}
