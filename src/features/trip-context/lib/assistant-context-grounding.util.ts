import type { ConversationContext } from '@/api/agent';
import type { OverviewViewData } from '@/travel-context/views/overview-view.types';
import type { PlanViewData } from '@/travel-context/views/travel-context-views.types';
import type { TravelContextStage } from '@/travel-context/domain/travel-context.constants';

export interface AssistantTravelContextGrounding {
  contextId: string;
  revision: number;
  stage?: TravelContextStage | string;
  effectivePlanLabel?: string;
  openDecisionCount: number;
  monitoringCount: number;
  freshnessLabel?: string;
  consistencyWarning?: string;
  staleFactsWarning?: string;
}

export interface AssistantContextGroundingDisplay {
  headline: string;
  detail?: string;
  revisionLabel: string;
  warnStale?: boolean;
}

export function buildAssistantTravelContextPayload(input: {
  contextId: string;
  revision: number;
  stage?: TravelContextStage | string;
}): NonNullable<ConversationContext['travel_context']> {
  return {
    context_id: input.contextId,
    revision: input.revision,
    ...(input.stage ? { stage: String(input.stage) } : {}),
  };
}

export function buildAssistantTravelContextGrounding(input: {
  contextId: string;
  revision: number;
  stage?: TravelContextStage | string;
  overviewView?: OverviewViewData;
  planView?: PlanViewData;
  openDecisionCount: number;
  monitoringCount: number;
}): AssistantTravelContextGrounding {
  const effectivePlanLabel =
    input.planView?.effectivePlan?.headline ??
    input.overviewView?.effectivePlanLabel ??
    undefined;

  return {
    contextId: input.contextId,
    revision: input.revision,
    stage: input.stage,
    effectivePlanLabel,
    openDecisionCount: input.openDecisionCount,
    monitoringCount: input.monitoringCount,
    freshnessLabel: input.overviewView?.dataFreshnessLabel,
    consistencyWarning: input.overviewView?.consistencyWarning,
    staleFactsWarning:
      input.overviewView?.consistencyWarning?.includes('过期') ||
      input.overviewView?.consistencyWarning?.includes('陈旧')
        ? input.overviewView.consistencyWarning
        : undefined,
  };
}

export function buildAssistantContextGroundingDisplay(
  grounding: AssistantTravelContextGrounding | null,
): AssistantContextGroundingDisplay | null {
  if (!grounding?.contextId || grounding.revision <= 0) return null;

  const parts: string[] = [];
  if (grounding.effectivePlanLabel) parts.push(grounding.effectivePlanLabel);
  if (grounding.openDecisionCount > 0) {
    parts.push(`${grounding.openDecisionCount} 项待你决定`);
  }
  if (grounding.monitoringCount > 0) {
    parts.push(`关注 ${grounding.monitoringCount} 项变化`);
  }

  return {
    headline: 'AI 基于当前行程上下文回答',
    detail: parts.length > 0 ? parts.join(' · ') : grounding.freshnessLabel,
    revisionLabel: `上下文 v${grounding.revision}`,
    warnStale: Boolean(grounding.staleFactsWarning || grounding.consistencyWarning),
  };
}
