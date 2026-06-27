import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatDomainAssigneeSummary } from '@/lib/domain-influence-mapping';
import type { DecisionAuthorityLabel } from '@/lib/domain-influence-mapping';
import { useDomainWorkbenchBreakdown } from '@/hooks/useTripDomainInfluence';
import type { DomainWorkbenchDomain, DomainWorkbenchSidebar } from '@/types/trip-domain-influence';
import {
  crossLevelBadgeClass,
  CROSS_LEVEL_LABEL,
  DomainIcon,
  domainPanelShell,
  Layers,
  Scale,
} from './domain-influence-ui';

interface TripDomainBreakdownCardProps {
  tripId: string;
  className?: string;
  onClaimDomain?: () => void;
  breakdown?: DomainWorkbenchSidebar | null;
  loading?: boolean;
}

/** 时间轴右侧 · 行程领域分解 */
export function TripDomainBreakdownCard({
  tripId,
  className,
  onClaimDomain,
  breakdown: breakdownProp,
  loading: loadingProp,
}: TripDomainBreakdownCardProps) {
  const fetched = useDomainWorkbenchBreakdown(breakdownProp === undefined ? tripId : null);
  const breakdown = breakdownProp !== undefined ? breakdownProp : fetched.breakdown;
  const loading = loadingProp ?? (breakdownProp === undefined ? fetched.loading : false);
  const [open, setOpen] = useState(true);
  const collapsedInitRef = useRef(false);

  useEffect(() => {
    if (!breakdown || collapsedInitRef.current) return;
    collapsedInitRef.current = true;
    const completionPercent = Math.round(breakdown.completionRate * 100);
    const allUnclaimed = breakdown.domains.every((d) => d.unclaimed && d.weights.length === 0);
    if (completionPercent === 0 && allUnclaimed) setOpen(false);
  }, [breakdown]);

  if (loading && !breakdown) {
    return (
      <Card className={cn(domainPanelShell, className)}>
        <CardContent className="flex justify-center py-10">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!breakdown || breakdown.domains.length === 0) return null;

  const completionPercent = Math.round(breakdown.completionRate * 100);
  const allUnclaimed = breakdown.domains.every((d) => d.unclaimed && d.weights.length === 0);
  const defaultCollapsed = completionPercent === 0 && allUnclaimed;
  const unclaimedCount = breakdown.domains.filter((d) => d.unclaimed).length;

  /** 已认领优先，其次高/中交叉（侧栏只展示与决策相关的领域，避免 8 行撑满屏） */
  const visibleDomains = [...breakdown.domains].sort((a, b) => {
    const score = (d: typeof a) => {
      let s = 0;
      if (!d.unclaimed && d.weights.length > 0) s += 100;
      if (d.crossLevel === 'high') s += 20;
      if (d.crossLevel === 'medium') s += 10;
      return s;
    };
    return score(b) - score(a);
  });

  const primaryDomains = visibleDomains.filter(
    (d) => d.crossLevel !== 'low' || !d.unclaimed || d.weights.length > 0,
  );
  const overflowDomains = visibleDomains.filter((d) => !primaryDomains.includes(d));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={cn(domainPanelShell, className)} data-tour="domain-breakdown">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-[inherit]"
          >
            <CardHeader className="border-b border-border/80 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CardTitle className="text-sm font-semibold tracking-tight">行程领域分解</CardTitle>
                  {defaultCollapsed ? (
                    <Badge variant="outline" className="h-5 text-[10px] font-normal text-muted-foreground">
                      团队规划
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {completionPercent}%
                  </span>
                  {open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              </div>
              {open ? <Progress value={completionPercent} className="h-0.5 bg-muted" /> : null}
              {!open && defaultCollapsed ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {unclaimedCount > 0
                    ? `${unclaimedCount} 个领域待认领 · 多人协作时再展开`
                    : '展开查看各领域负责人'}
                </p>
              ) : null}
            </CardHeader>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            <ul className="max-h-[min(280px,40vh)] overflow-y-auto overscroll-contain divide-y divide-border/60">
              {primaryDomains.map((domain) => (
                <DomainBreakdownRow key={domain.domain} domain={domain} />
              ))}
              {overflowDomains.map((domain) => (
                <DomainBreakdownRow key={domain.domain} domain={domain} compact />
              ))}
            </ul>

            {onClaimDomain ? (
              <div className="border-t border-border/80 px-4 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-between px-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onClaimDomain}
                >
                  认领领域
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function DomainBreakdownRow({
  domain,
  compact = false,
}: {
  domain: DomainWorkbenchDomain;
  compact?: boolean;
}) {
  const assignee = formatDomainAssigneeSummary(domain);
  const claimed = !domain.unclaimed && domain.weights.length > 0;

  return (
    <li className="flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/15">
      <DomainIcon domain={domain.domain} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{domain.label}</span>
      {!compact ? (
        <Badge
          variant="outline"
          className={cn('shrink-0 text-[9px] px-1 py-0 font-normal', crossLevelBadgeClass(domain.crossLevel))}
        >
          {CROSS_LEVEL_LABEL[domain.crossLevel]}
        </Badge>
      ) : null}
      <span
        className={cn(
          'shrink-0 max-w-[40%] truncate tabular-nums text-right',
          claimed ? 'text-foreground/80' : 'text-muted-foreground',
        )}
      >
        {assignee}
      </span>
    </li>
  );
}

/** 时间轴 POI · 决策权（领域已认领时） */
export function ItineraryDecisionAuthorityRow({
  authority,
  className,
}: {
  authority: DecisionAuthorityLabel;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-2 flex items-center gap-2 rounded-md border border-border/80 bg-muted/25 px-2.5 py-1.5',
        className,
      )}
      role="note"
      aria-label={authority.text}
    >
      <Scale className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-xs leading-snug">
        <span className="text-muted-foreground">决策权</span>
        <span className="text-muted-foreground mx-1">·</span>
        <span className="font-medium text-foreground">{authority.displayName}</span>
        <span className="text-muted-foreground tabular-nums">
          {' '}
          ({authority.domainLabel} {authority.percent}%)
        </span>
      </p>
    </div>
  );
}
