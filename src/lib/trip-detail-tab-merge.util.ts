import type { CollabOverviewResponse } from '@/types/collab-overview';
import type { TimelineOverviewResponse, TimelinePlanObjectsBlock } from '@/types/timeline-overview';
import { normalizePlanObjectsDays } from '@/lib/plan-object-source.util';

function normalizeTimelinePlanObjectsBlock(
  block: TimelinePlanObjectsBlock | undefined,
): TimelinePlanObjectsBlock | undefined {
  if (!block) return undefined;
  const days = normalizePlanObjectsDays(block.days);
  if (!block.topAssessment && !days.length) return undefined;
  return { ...block, days: days.length ? days : block.days };
}

/** Phase2 合并 timeline overview；后者覆盖 stats / planning / tasks / reminders */
export function mergeTimelineOverview(
  prev: TimelineOverviewResponse | null,
  next: TimelineOverviewResponse,
): TimelineOverviewResponse {
  if (!prev) return {
    ...next,
    planObjects: normalizeTimelinePlanObjectsBlock(next.planObjects),
  };
  const planObjects = normalizeTimelinePlanObjectsBlock(next.planObjects ?? prev.planObjects);
  return {
    ...prev,
    ...next,
    stats: { ...prev.stats, ...next.stats },
    planning: next.planning
      ? { ...prev.planning, ...next.planning, stages: next.planning.stages ?? prev.planning.stages }
      : prev.planning,
    tasks: next.tasks ?? prev.tasks,
    todayReminders: next.todayReminders ?? prev.todayReminders,
    health: next.health ?? prev.health,
    planObjects,
  };
}

/** Phase2 合并 collab overview */
export function mergeCollabOverview(
  prev: CollabOverviewResponse | null,
  next: CollabOverviewResponse,
): CollabOverviewResponse {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    collaborators: next.collaborators?.length ? next.collaborators : prev.collaborators,
    teamHealth: next.teamHealth ? { ...prev.teamHealth, ...next.teamHealth } : prev.teamHealth,
    collaborativeTasks: next.collaborativeTasks ?? prev.collaborativeTasks,
    silentVotes: next.silentVotes ?? prev.silentVotes,
    domainInfluence: next.domainInfluence ?? prev.domainInfluence,
    frictionRadar: next.frictionRadar ?? prev.frictionRadar,
    wishSummary: next.wishSummary ?? prev.wishSummary,
    profilingOnboarding: next.profilingOnboarding ?? prev.profilingOnboarding,
  };
}
