import { ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { formatDomainAssigneeSummary } from '@/lib/domain-influence-mapping';
import { useDomainWorkbenchBreakdown } from '@/hooks/useTripDomainInfluence';
import {
  crossLevelBadgeClass,
  CROSS_LEVEL_LABEL,
  DomainIcon,
  domainIconWell,
  Layers,
} from './domain-influence-ui';

interface DomainInfluenceWorkbenchPanelProps {
  tripId: string;
  className?: string;
  compact?: boolean;
  onGoToTeamTab?: () => void;
}

export function DomainInfluenceWorkbenchPanel({
  tripId,
  className,
  compact = false,
  onGoToTeamTab,
}: DomainInfluenceWorkbenchPanelProps) {
  const { breakdown, loading, reload } = useDomainWorkbenchBreakdown(tripId);

  const completionPercent = Math.round((breakdown?.completionRate ?? 0) * 100);
  const claimedDomains = breakdown?.domains.filter((d) => !d.unclaimed) ?? [];

  if (loading && !breakdown) {
    return (
      <div className={cn('flex justify-center py-4 border-b border-border/80', className)}>
        <Spinner className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  if (!breakdown) return null;

  return (
    <section className={cn('border-b border-border/80 bg-muted/10', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium truncate">领域分工</span>
          {!breakdown.rulesConfirmed ? (
            <Badge variant="outline" className="text-[9px] px-1 py-0 border-gate-confirm-border text-gate-confirm-foreground">
              待确认
            </Badge>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => void reload()}>
          <RefreshCw className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>

      <div className={cn('px-3 pb-3 space-y-2', compact && 'max-h-48 overflow-y-auto')}>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>认领 {completionPercent}%</span>
            <span>{claimedDomains.length}/{breakdown.domains.length}</span>
          </div>
          <Progress value={completionPercent} className="h-0.5 bg-muted" />
        </div>

        <ul className="space-y-1">
          {breakdown.domains.map((d) => {
            const assignee = formatDomainAssigneeSummary(d);
            return (
              <li
                key={d.domain}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1.5"
              >
                <div className={cn(domainIconWell, 'h-6 w-6')}>
                  <DomainIcon domain={d.domain} className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium truncate">{d.label}</span>
                    <Badge variant="outline" className={cn('text-[8px] px-1 py-0 shrink-0', crossLevelBadgeClass(d.crossLevel))}>
                      {CROSS_LEVEL_LABEL[d.crossLevel]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate tabular-nums">
                    {d.unclaimed ? '待认领' : assignee}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {onGoToTeamTab ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-full text-[11px] justify-between text-muted-foreground"
            onClick={onGoToTeamTab}
          >
            管理团队认领
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </section>
  );
}
