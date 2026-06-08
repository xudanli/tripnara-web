import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RagStructuredOutcome } from '@/lib/rag-structured-answer';

function decisionTone(decision: string): { className: string; label: string } {
  const d = decision.trim().toUpperCase();
  if (d === 'PASS') {
    return {
      className: 'border-green-300 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-100',
      label: 'PASS',
    };
  }
  if (d === 'CONDITIONAL') {
    return {
      className: 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/35 dark:text-amber-100',
      label: 'CONDITIONAL',
    };
  }
  return {
    className: 'border-border bg-muted/60 text-foreground',
    label: decision,
  };
}

export function RagStructuredOutcomeCard({ outcome }: { outcome: RagStructuredOutcome }) {
  const { decision, why } = outcome;
  const hasDecision = Boolean(decision?.trim());
  const hasWhy = why.length > 0;

  if (!hasDecision && !hasWhy) return null;

  const badge = decision?.trim() ? decisionTone(decision.trim()) : null;

  return (
    <div className="mt-1 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">结论</span>
        {badge ? (
          <Badge variant="outline" className={cn('text-xs font-semibold', badge.className)}>
            {badge.label}
          </Badge>
        ) : null}
      </div>
      {hasWhy ? (
        <ul className="mt-2 list-none space-y-2 pl-0 text-sm leading-relaxed text-foreground">
          {why.map((line, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="mt-0.5 shrink-0 font-medium text-primary">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
