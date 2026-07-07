import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collectPrivateConcernsFromOptions } from '@/lib/decision-space-option-view.util';
import type { DecisionOption } from '@/types/decision-problem';
import { workbenchCard } from './workbench-ui';

export interface WorkbenchPrivateConcernsPanelProps {
  options?: DecisionOption[];
  problemDescription?: string;
  displayTimezone?: string;
  className?: string;
}

/** 决策空间 · 私密顾虑聚合（仅自己可见） */
export function WorkbenchPrivateConcernsPanel({
  options = [],
  problemDescription,
  displayTimezone,
  className,
}: WorkbenchPrivateConcernsPanelProps) {
  const bullets = collectPrivateConcernsFromOptions(
    options,
    problemDescription,
    displayTimezone,
  );
  if (bullets.length === 0) return null;

  return (
    <section className={cn(workbenchCard, 'border-dashed border-border/70 bg-muted/10 p-3', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-semibold text-foreground">私密顾虑聚合</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">仅自己可见</span>
      </div>
      <ul className="space-y-1.5">
        {bullets.map((item) => (
          <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
