import { cn } from '@/lib/utils';
import type { DecisionSpacePersonaOneLiner } from '@/lib/decision-space-persona.util';
import { WorkbenchPersonaSymbol } from '@/components/plan-studio/workbench/WorkbenchPersonaSymbol';

export interface DecisionSpacePersonaOneLinerProps {
  line: DecisionSpacePersonaOneLiner;
  className?: string;
}

/** P2 · 三人格主视角一句话 */
export function DecisionSpacePersonaOneLinerStrip({
  line,
  className,
}: DecisionSpacePersonaOneLinerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5',
        className,
      )}
    >
      <WorkbenchPersonaSymbol persona={line.persona} size={28} className="shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground">{line.name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground">{line.quote}</p>
      </div>
    </div>
  );
}
