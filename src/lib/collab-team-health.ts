import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { FrictionRadarData } from '@/types/trip-decision-profiling';
import type { OnboardingStatus } from '@/types/trip-decision-profiling';

export interface CollabTeamHealth {
  participation: number;
  communication: number;
  decisionEfficiency: number;
  conflictLevel: number;
}

export type CollabTeamHealthSource = 'friction-radar' | 'heuristic';

export interface CollabTeamHealthResult {
  health: CollabTeamHealth;
  source: CollabTeamHealthSource;
}

/** 从摩擦雷达 API 与协商任务推算团队健康度（v1 无独立 health 端点） */
export function buildTeamHealth(
  friction: FrictionRadarData | null | undefined,
  onboarding: OnboardingStatus | null | undefined,
  negotiationTasks: DomainNegotiationTask[],
): CollabTeamHealthResult {
  const memberCount = Math.max(friction?.memberCount ?? 1, 1);
  const completionRate = friction?.completionRate ?? onboarding?.teamCompletionRate ?? 0;
  const inDiscussion = negotiationTasks.filter((t) => t.status === 'in_discussion').length;
  const reached = negotiationTasks.filter((t) => t.status === 'consensus_reached').length;
  const totalNegotiation = negotiationTasks.length || 1;
  const highRisk = friction?.highRiskAlerts?.length ?? 0;
  const conflictLevel = Math.min(100, Math.round(highRisk * 18 + inDiscussion * 8));

  const health: CollabTeamHealth = {
    participation: Math.round(completionRate),
    communication: Math.min(100, Math.round(55 + inDiscussion * 12 + memberCount * 4)),
    decisionEfficiency: Math.round((reached / totalNegotiation) * 100),
    conflictLevel,
  };

  return {
    health,
    source: friction ? 'friction-radar' : 'heuristic',
  };
}
