import { cn } from '@/lib/utils';
import { formatEvidenceFreshness } from '@/lib/decision-problem-display.util';

export interface DecisionValidityStripProps {
  validUntil?: string | null;
  dependencyHint?: string | null;
  className?: string;
}

/** 决策有效期 · 确认区辅助信息 */
export function DecisionValidityStrip({
  validUntil,
  dependencyHint,
  className,
}: DecisionValidityStripProps) {
  const label = formatEvidenceFreshness(validUntil);
  if (!label && !dependencyHint) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-muted/10 px-2.5 py-1.5 text-[10px] leading-relaxed text-muted-foreground',
        className,
      )}
    >
      {label ? <p>判断有效至 {label}</p> : null}
      {dependencyHint ? <p className={label ? 'mt-0.5' : undefined}>{dependencyHint}</p> : null}
    </div>
  );
}
