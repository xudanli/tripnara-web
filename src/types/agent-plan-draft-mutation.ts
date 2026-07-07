import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { PlanGateTimelineChange } from '@/types/plan-gate';

/** planState.metadata.agentPlanDraftMutation — Agent 拟议变更（写链开启时只读展示） */
export interface AgentPlanDraftMutation {
  problemId?: string;
  headline?: string;
  summary?: string;
  status?: 'proposed' | 'pending_apply' | string;
  itineraryDiff?: ItineraryDiffEntry[];
  timelineChanges?: PlanGateTimelineChange[];
  operations?: Array<{
    type?: string;
    label?: string;
    description?: string;
    dayNumber?: number;
  }>;
}
