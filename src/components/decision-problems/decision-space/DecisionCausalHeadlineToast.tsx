import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { semanticWarnText } from '@/lib/semantic-ui-classes';

export interface DecisionCausalHeadlineToastProps {
  message: string;
  className?: string;
}

/**
 * 决策因果链 · 结论 toast 条
 * Layer A：中性面 + 左侧 warning 色边线，无阴影
 */
export function DecisionCausalHeadlineToast({ message, className }: DecisionCausalHeadlineToastProps) {
  const trimmed = message.trim();
  if (!trimmed) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2 shadow-none',
        'border-l-[3px] border-l-gate-confirm-border',
        className,
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/15">
        <AlertTriangle className={cn('h-3.5 w-3.5', semanticWarnText)} aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-foreground">{trimmed}</p>
    </div>
  );
}
