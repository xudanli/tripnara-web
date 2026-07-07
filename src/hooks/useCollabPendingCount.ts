import { useMemo } from 'react';
import { useDomainNegotiationTasks } from '@/hooks/useDomainNegotiationTasks';
import { useDecisionProfilingOnboarding } from '@/hooks/useDecisionProfiling';
import { useSilentVoteList } from '@/hooks/useSilentVotes';
import type { WishSummary } from '@/types/trip-wishes';

function profilingPendingCount(onboarding: {
  travelStyleCompleted: boolean;
  moneyDnaCompleted: boolean;
  quizCompleted: boolean;
  teamCompletionRate: number;
}): number {
  if (!onboarding.quizCompleted) {
    return (
      (onboarding.travelStyleCompleted ? 0 : 1) + (onboarding.moneyDnaCompleted ? 0 : 1)
    );
  }
  if (onboarding.teamCompletionRate < 95) return 1;
  return 0;
}

/** 顶栏「协作」角标：待决协商 + 待投票 + 画像待完成 */
export function useCollabPendingCount(
  tripId: string | null | undefined,
  wishSummary?: WishSummary | null,
  enabled = true,
) {
  const active = enabled && Boolean(tripId);
  const { data: negotiationTasks = [] } = useDomainNegotiationTasks(
    active ? (tripId ?? undefined) : undefined,
    active,
  );
  const { items: votes } = useSilentVoteList(tripId, active);
  const { data: profiling } = useDecisionProfilingOnboarding(tripId, active);

  return useMemo(() => {
    let count = 0;

    count += negotiationTasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_discussion',
    ).length;

    count += votes.filter((v) => v.status === 'open' && !v.myBallotSubmitted).length;

    if (profiling) {
      count += profilingPendingCount(profiling);
    }

    if (wishSummary && wishSummary.mineCount > 0 && wishSummary.agentEligibleCount > 0) {
      count += 1;
    }

    return count;
  }, [negotiationTasks, votes, profiling, wishSummary]);
}
