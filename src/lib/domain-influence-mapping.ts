import type { DomainWorkbenchDomain, DomainWorkbenchSidebar, TripDomain } from '@/types/trip-domain-influence';

/** 行程项 category / type → 规划领域 */
const CATEGORY_TO_DOMAIN: Record<string, TripDomain> = {
  HOTEL: 'accommodation',
  RESTAURANT: 'dining',
  ATTRACTION: 'activities',
  SHOPPING: 'shopping',
  TRANSIT_HUB: 'local_transport',
  MEAL_ANCHOR: 'dining',
  MEAL_FLOATING: 'dining',
  FLIGHT: 'main_transport',
  RAIL: 'main_transport',
  FERRY: 'main_transport',
  CAR_RENTAL: 'local_transport',
  DRIVE: 'local_transport',
  TRANSPORT: 'main_transport',
};

export function itineraryCategoryToDomain(categoryOrType: string | undefined | null): TripDomain | null {
  if (!categoryOrType) return null;
  const key = categoryOrType.toUpperCase();
  return CATEGORY_TO_DOMAIN[key] ?? null;
}

export interface DecisionAuthorityLabel {
  displayName: string;
  domainLabel: string;
  percent: number;
  text: string;
}

/** 时间轴「决策权」标签：取该领域最高权重者（领域已认领时） */
export function resolveDecisionAuthority(
  breakdown: DomainWorkbenchSidebar | null | undefined,
  categoryOrType: string | undefined | null,
): DecisionAuthorityLabel | null {
  if (!breakdown) return null;
  const domain = itineraryCategoryToDomain(categoryOrType);
  if (!domain) return null;

  const entry = breakdown.domains.find((d) => d.domain === domain);
  if (!entry || entry.unclaimed || entry.weights.length === 0) return null;

  const top = [...entry.weights].sort((a, b) => b.percent - a.percent)[0];
  if (!top) return null;

  return {
    displayName: top.displayName,
    domainLabel: entry.label,
    percent: top.percent,
    text: formatDecisionAuthorityLine(top.displayName, entry.label, top.percent),
  };
}

/** 侧栏领域分工摘要：单人显示姓名，多人显示「小明 (20%) 小红 (80%)」 */
export function formatDomainAssigneeSummary(domain: DomainWorkbenchDomain): string {
  if (domain.unclaimed) return '待认领';
  if (domain.weights.length === 0) {
    return domain.leader ?? '待认领';
  }
  if (domain.weights.length === 1) {
    const only = domain.weights[0];
    if (only.percent >= 99) return only.displayName;
    return `${only.displayName} (${only.percent}%)`;
  }
  const sorted = [...domain.weights].sort((a, b) => b.percent - a.percent);
  const allEqual =
    sorted.length > 1 &&
    sorted.every((w) => Math.abs(w.percent - sorted[0].percent) < 1);
  if (domain.domain === 'destination_route' && allEqual && sorted.length >= 2) {
    return '全员';
  }
  return sorted.map((w) => `${w.displayName} (${w.percent}%)`).join(' ');
}

/** 时间轴 POI 决策权文案 */
export function formatDecisionAuthorityLine(
  displayName: string,
  domainLabel: string,
  percent: number,
): string {
  return `决策权：${displayName} (${domainLabel} ${percent}%)`;
}

export const CROSS_LEVEL_LABEL: Record<string, string> = {
  high: '高交叉',
  medium: '中交叉',
  low: '低交叉',
};

/** @deprecated 使用 domain-influence-ui 的 crossLevelBadgeClass */
export const CROSS_LEVEL_CLASS: Record<string, string> = {
  high: 'bg-muted/50 text-foreground/80 border-border',
  medium: 'bg-muted/30 text-muted-foreground border-border/80',
  low: 'bg-transparent text-muted-foreground border-border/60',
};
