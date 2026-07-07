import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { formatSuppressedActionsSummary } from '@/lib/decision-action-display.util';
import type { DecisionAction } from '@/generated/unified-decision-contracts';

export interface DecisionSuppressedActionsCollapsibleProps {
  actions: DecisionAction[];
  className?: string;
}

/** 默认折叠 · 系统已尝试但不可执行的自动方案 */
export function DecisionSuppressedActionsCollapsible({
  actions,
  className,
}: DecisionSuppressedActionsCollapsibleProps) {
  if (!actions.length) return null;

  const summary = formatSuppressedActionsSummary(actions);

  return (
    <Collapsible className={cn('rounded-lg border border-border/50 bg-muted/10', className)}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-muted-foreground hover:text-foreground">
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        <span className="min-w-0 flex-1 leading-snug">{summary}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/40 px-3 py-2">
        <ul className="space-y-1.5">
          {actions.map((action) => (
            <li key={action.actionId} className="text-[11px] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {action.title?.trim() || action.label}
              </span>
              {action.blockedReason ? (
                <span className="text-muted-foreground"> — {action.blockedReason}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
