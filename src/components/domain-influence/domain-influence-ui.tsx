import type { LucideIcon } from 'lucide-react';
import {
  Car,
  Compass,
  Hotel,
  Layers,
  Map,
  Plane,
  Scale,
  ShieldCheck,
  ShoppingBag,
  UtensilsCrossed,
  UserRound,
} from 'lucide-react';
import type { DomainCrossLevel, TripDomain } from '@/types/trip-domain-influence';
import type { DomainNegotiationTaskStatus } from '@/types/domain-negotiation-task';
import { cn } from '@/lib/utils';

/** 领域符号图标（克制、非 emoji） */
export const DOMAIN_LUCIDE_ICONS: Record<TripDomain, LucideIcon> = {
  accommodation: Hotel,
  main_transport: Plane,
  local_transport: Car,
  destination_route: Map,
  dining: UtensilsCrossed,
  activities: Compass,
  shopping: ShoppingBag,
  insurance_visa: ShieldCheck,
};

export function DomainIcon({
  domain,
  className,
}: {
  domain: TripDomain;
  className?: string;
}) {
  const Icon = DOMAIN_LUCIDE_ICONS[domain];
  return <Icon className={cn('h-3.5 w-3.5', className)} aria-hidden />;
}

/** 交叉级别：中性描边，靠标签而非大色块传达 */
export const CROSS_LEVEL_LABEL: Record<DomainCrossLevel, string> = {
  high: '高交叉',
  medium: '中交叉',
  low: '低交叉',
};

export function crossLevelBadgeClass(level: DomainCrossLevel): string {
  return cn(
    'text-[10px] font-normal border',
    level === 'high' && 'bg-muted/50 text-foreground/80 border-border',
    level === 'medium' && 'bg-muted/30 text-muted-foreground border-border/80',
    level === 'low' && 'bg-transparent text-muted-foreground border-border/60',
  );
}

/** 协商任务状态 → 贴近 Gate 四态气质 */
export function negotiationStatusClass(status: DomainNegotiationTaskStatus): string {
  switch (status) {
    case 'consensus_reached':
      return 'bg-gate-allow/40 text-gate-allow-foreground border-gate-allow-border';
    case 'in_discussion':
      return 'bg-gate-confirm/30 text-gate-confirm-foreground border-gate-confirm-border';
    default:
      return 'bg-muted/40 text-muted-foreground border-border';
  }
}

export const domainPanelShell = 'rounded-xl border border-border bg-card shadow-sm';
export const domainPanelHeader = 'border-b border-border/80 px-5 py-4';
export const domainIconWell =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground';

export { Layers, Scale, UserRound };
