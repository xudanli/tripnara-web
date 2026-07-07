import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExecuteAlertBannerProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** @deprecated 使用默认全宽 banner 行 */
  variant?: 'banner' | 'header';
  className?: string;
}

/** 行中 · 强风/风险预警条（设计稿：独立一行全宽） */
export function ExecuteAlertBanner({
  title,
  description,
  actionLabel = '查看详情与建议',
  onAction,
  className,
}: ExecuteAlertBannerProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-gate-reject-border/70 bg-gate-reject/10 px-3 py-2',
        className,
      )}
      role="alert"
    >
      <AlertTriangle
        className="h-4 w-4 shrink-0 text-gate-reject-foreground"
        strokeWidth={1.75}
        aria-hidden
      />

      <p className="min-w-0 flex-1 text-sm leading-snug">
        <span className="font-semibold text-gate-reject-foreground">{title}</span>
        {description ? (
          <span className="ml-1.5 text-[13px] font-normal text-gate-reject-foreground/80">
            {description}
          </span>
        ) : null}
      </p>

      {onAction ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-1.5 text-xs font-medium text-gate-reject-foreground hover:bg-gate-reject/10 hover:text-gate-reject-foreground"
          onClick={onAction}
        >
          {actionLabel}
          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
