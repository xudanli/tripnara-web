import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CollabTabScopeHintProps {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Tab 顶部一句话说明：区分「需求采集」与「决策画像」等边界 */
export function CollabTabScopeHint({ children, action, className }: CollabTabScopeHintProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
