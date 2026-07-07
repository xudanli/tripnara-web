import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  primaryEnforcementBadgeClass,
  primaryEnforcementLabel,
} from '@/lib/decision-problem-display.util';
import type { DecisionClosureStatusTone } from '@/lib/decision-closure-card.util';
import type { PrimaryEnforcement } from '@/types/decision-problem';

const STATUS_PILL_CLASS: Record<DecisionClosureStatusTone, string> = {
  attention: 'border-border bg-muted/15 text-foreground',
  progress: 'border-border bg-muted/15 text-muted-foreground',
  success: 'border-gate-allow-border bg-gate-allow/40 text-gate-allow-foreground',
  warning: 'border-border bg-muted/15 text-foreground',
  muted: 'border-border bg-muted/40 text-muted-foreground',
};

export interface DecisionContextRailProps {
  statusLabel: string;
  statusTone?: DecisionClosureStatusTone;
  summary: string;
  primaryEnforcement?: PrimaryEnforcement | null;
  className?: string;
}

/** 工作台 Legacy 决策空间 · 单行上下文（≤72px） */
export function DecisionContextRail({
  statusLabel,
  statusTone = 'progress',
  summary,
  primaryEnforcement,
  className,
}: DecisionContextRailProps) {
  return (
    <div
      className={cn(
        'flex max-h-[72px] items-center gap-2 rounded-lg border border-border/60 bg-muted/12 px-2.5 py-1.5',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[10px] font-medium',
          STATUS_PILL_CLASS[statusTone],
        )}
      >
        {statusLabel}
      </span>
      {primaryEnforcement ? (
        <Badge
          variant="outline"
          className={cn(
            'h-5 shrink-0 rounded-full px-1.5 text-[10px] font-normal',
            primaryEnforcementBadgeClass(primaryEnforcement),
          )}
        >
          {primaryEnforcementLabel(primaryEnforcement)}
        </Badge>
      ) : null}
      <p className="min-w-0 flex-1 truncate text-xs text-foreground">{summary}</p>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
    </div>
  );
}
