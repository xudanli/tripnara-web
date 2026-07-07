import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ConstraintEvalPendingBannerProps {
  onRefresh: () => void;
  refreshing?: boolean;
  className?: string;
}

/** 决策检查器 · 约束已变更但评估尚未刷新 */
export function ConstraintEvalPendingBanner({
  onRefresh,
  refreshing,
  className,
}: ConstraintEvalPendingBannerProps) {
  return (
    <div
      className={cn(
        'mb-2 flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/10 px-2.5 py-2',
        className,
      )}
      role="status"
    >
      <p className="text-[11px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">约束已变更</span>
        <span> · 下方评估结果可能不是最新</span>
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 shrink-0 text-[11px]"
        disabled={refreshing}
        onClick={onRefresh}
      >
        <RefreshCw className={cn('mr-1 h-3 w-3', refreshing && 'animate-spin')} />
        立即刷新
      </Button>
    </div>
  );
}
