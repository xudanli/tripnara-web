import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DayExecutabilityView } from '@/lib/day-executability.util';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';

interface DayExecutabilityPanelProps {
  view: DayExecutabilityView;
  onViewAlternatives?: () => void;
  className?: string;
}

/** Day 级可执行状态 — 发生了什么 / 为什么 / 影响 / 怎么办 */
export function DayExecutabilityPanel({
  view,
  onViewAlternatives,
  className,
}: DayExecutabilityPanelProps) {
  if (view.status === 'executable') return null;

  return (
    <div
      className={cn(
        'mt-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-3 space-y-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">当前状态</span>
        <ExecutionStatusBadge label={view.label} status={view.status} />
      </div>

      {view.reasons.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">原因</p>
          <ul className="space-y-1">
            {view.reasons.map((reason) => (
              <li key={reason} className="text-xs text-foreground flex gap-2">
                <span className="text-muted-foreground">·</span>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {view.impacts.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">影响</p>
          <ul className="space-y-1">
            {view.impacts.map((impact) => (
              <li key={impact} className="text-xs text-muted-foreground flex gap-2">
                <span>·</span>
                {impact}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onViewAlternatives ? (
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onViewAlternatives}>
          查看替代方案
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </Button>
      ) : null}
    </div>
  );
}
