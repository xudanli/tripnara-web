import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { FrictionDomain, HighRiskAlert } from '@/types/trip-decision-profiling';
import type { TripDomain } from '@/types/trip-domain-influence';

/** 摩擦雷达领域 → 结构化协商 TripDomain（用于深链 roundDomain） */
export const FRICTION_TO_TRIP_DOMAINS: Partial<Record<FrictionDomain, TripDomain[]>> = {
  accommodation: ['accommodation'],
  dining: ['dining'],
  activities: ['activities'],
  transportation: ['main_transport', 'local_transport'],
  pace: ['destination_route', 'activities'],
  budget: ['dining', 'accommodation', 'activities'],
  planning_style: ['destination_route', 'activities'],
  group_decision: ['activities', 'accommodation', 'dining'],
};

export function frictionDomainToTripDomains(domain: FrictionDomain): TripDomain[] {
  return FRICTION_TO_TRIP_DOMAINS[domain] ?? ['activities'];
}

export interface FrictionNegotiationDeepLink {
  roundDomain: string | null;
  roundId: string | null;
}

/** 从摩擦点解析协作决策 Tab 深链（优先匹配进行中的协商任务） */
export function resolveFrictionNegotiationDeepLink(
  alert: Pick<HighRiskAlert, 'domain'>,
  negotiationTasks: DomainNegotiationTask[],
): FrictionNegotiationDeepLink {
  const candidates = frictionDomainToTripDomains(alert.domain);

  for (const domain of candidates) {
    const active = negotiationTasks.find(
      (t) => t.domain === domain && t.status === 'in_discussion',
    );
    if (active) {
      return {
        roundDomain: active.domain,
        roundId: active.activeRoundId ?? null,
      };
    }
  }

  for (const domain of candidates) {
    const pending = negotiationTasks.find(
      (t) => t.domain === domain && t.status === 'pending',
    );
    if (pending) {
      return { roundDomain: pending.domain, roundId: null };
    }
  }

  return {
    roundDomain: candidates[0] ?? null,
    roundId: null,
  };
}
