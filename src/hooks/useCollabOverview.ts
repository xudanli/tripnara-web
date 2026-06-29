import { useMemo } from 'react';
import { useDomainNegotiationTasks } from '@/hooks/useDomainNegotiationTasks';
import { useDecisionProfilingOnboarding, useFrictionRadar } from '@/hooks/useDecisionProfiling';
import { useSilentVoteList } from '@/hooks/useSilentVotes';
import { useTripWishSummary } from '@/hooks/useTripWishes';
import { useCollaborativeTasks } from '@/features/match-square/hooks/useCollaborativeTasks';
import { buildTeamHealth } from '@/lib/collab-team-health';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { SilentVoteDetail } from '@/types/silent-votes';

export type CollabPendingPriority = '高' | '中' | '低';

export interface CollabPendingItem {
  id: string;
  title: string;
  priority: CollabPendingPriority;
  kind: 'negotiation' | 'vote' | 'task';
  domain?: string;
  roundId?: string | null;
  voteId?: string;
}

export interface CollabConsensusDimension {
  key: string;
  label: string;
  score: number;
}

export interface CollabDecisionStats {
  pending: number;
  inNegotiation: number;
  inVoting: number;
  consensusReached: number;
}

export type { CollabTeamHealth } from '@/lib/collab-team-health';

function negotiationPriority(task: DomainNegotiationTask): CollabPendingPriority {
  if (task.status === 'in_discussion') return '高';
  if (task.crossLevel === 'high') return '高';
  if (task.crossLevel === 'medium') return '中';
  return '低';
}

function buildPendingItems(
  tasks: DomainNegotiationTask[],
  votes: SilentVoteDetail[],
  pendingTaskCount: number,
): CollabPendingItem[] {
  const items: CollabPendingItem[] = [];

  for (const task of tasks) {
    if (task.status === 'pending' || task.status === 'in_discussion') {
      items.push({
        id: `neg-${task.id}`,
        title: task.title,
        priority: negotiationPriority(task),
        kind: 'negotiation',
        domain: task.domain,
        roundId: task.activeRoundId,
      });
    }
  }

  for (const vote of votes) {
    if (vote.status === 'open' && !vote.myBallotSubmitted) {
      items.push({
        id: `vote-${vote.id}`,
        title: vote.title,
        priority: '中',
        kind: 'vote',
        voteId: vote.id,
      });
    }
  }

  if (pendingTaskCount > 0) {
    items.push({
      id: 'tasks-pending',
      title: `${pendingTaskCount} 项协作任务待确认`,
      priority: '中',
      kind: 'task',
    });
  }

  const rank = { 高: 0, 中: 1, 低: 2 };
  return items.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

/** 协作中心概览数据聚合 */
export function useCollabOverview(tripId: string | undefined) {
  const { data: negotiationTasks = [], isLoading: negotiationLoading } =
    useDomainNegotiationTasks(tripId);
  const { items: votes, loading: votesLoading } = useSilentVoteList(tripId);
  const { data: onboarding, loading: onboardingLoading } = useDecisionProfilingOnboarding(tripId);
  const { data: friction, loading: frictionLoading } = useFrictionRadar(tripId, Boolean(tripId));
  const { summary: wishSummary, loading: wishLoading } = useTripWishSummary(tripId);
  const { data: collabTasks, isLoading: tasksLoading } = useCollaborativeTasks(tripId);

  const flywheelTasks = collabTasks?.tasks ?? collabTasks?.flywheel?.tasks ?? [];
  const pendingFlywheel = flywheelTasks.filter((t) => t.status === 'pending');

  const pendingItems = useMemo(
    () => buildPendingItems(negotiationTasks, votes, pendingFlywheel.length),
    [negotiationTasks, votes, pendingFlywheel.length],
  );

  const decisionStats = useMemo((): CollabDecisionStats => {
    const inNegotiation = negotiationTasks.filter((t) => t.status === 'in_discussion').length;
    const consensusReached = negotiationTasks.filter((t) => t.status === 'consensus_reached').length;
    const pending = negotiationTasks.filter((t) => t.status === 'pending').length;
    const inVoting = votes.filter((v) => v.status === 'open').length;
    return { pending, inNegotiation, inVoting, consensusReached };
  }, [negotiationTasks, votes]);

  const consensusDimensions = useMemo((): CollabConsensusDimension[] => {
    const c = friction?.compatibility;
    if (!c) {
      return [
        { key: 'pace', label: '行程节奏', score: 70 },
        { key: 'budget', label: '预算分配', score: 68 },
        { key: 'experience', label: '核心体验', score: 72 },
        { key: 'accommodation', label: '住宿标准', score: 65 },
        { key: 'intensity', label: '每日强度', score: 74 },
      ];
    }
    return [
      { key: 'pace', label: '行程节奏', score: c.paceSyncPct },
      { key: 'budget', label: '预算分配', score: c.budgetOverlapPct },
      { key: 'experience', label: '核心体验', score: c.styleSimilarityPct },
      { key: 'accommodation', label: '住宿标准', score: Math.round((c.budgetOverlapPct + c.styleSimilarityPct) / 2) },
      { key: 'intensity', label: '每日强度', score: c.paceSyncPct },
    ];
  }, [friction?.compatibility]);

  const overallConsensus = useMemo(() => {
    if (friction?.compatibility?.overallScore != null) {
      return Math.round(friction.compatibility.overallScore);
    }
    if (consensusDimensions.length === 0) return 0;
    return Math.round(
      consensusDimensions.reduce((sum, d) => sum + d.score, 0) / consensusDimensions.length,
    );
  }, [friction?.compatibility?.overallScore, consensusDimensions]);

  const { health: teamHealth, source: teamHealthSource } = useMemo(
    () => buildTeamHealth(friction, onboarding, negotiationTasks),
    [friction, onboarding, negotiationTasks],
  );

  const loading =
    negotiationLoading || votesLoading || onboardingLoading || frictionLoading || wishLoading || tasksLoading;

  return {
    loading,
    pendingItems,
    decisionStats,
    consensusDimensions,
    overallConsensus,
    teamHealth,
    teamHealthSource,
    negotiationTasks,
    votes,
    wishSummary,
    flywheelTasks,
    pendingFlywheel,
    friction,
  };
}
