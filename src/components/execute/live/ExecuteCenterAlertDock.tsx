import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExecuteCenterRealtimeAlert } from '@/lib/execute-center-detail.util';

interface ExecuteCenterAlertDockProps {
  alert?: ExecuteCenterRealtimeAlert;
  onViewDetail?: () => void;
  className?: string;
}

export function ExecuteCenterAlertDock({
  alert,
  onViewDetail,
  className,
}: ExecuteCenterAlertDockProps) {
  if (!alert) {
    return (
      <div
        className={cn(
          'shrink-0 flex items-center justify-center gap-1 border-t border-border/60 bg-card px-2 py-1 text-[10px] text-muted-foreground',
          className,
        )}
      >
        <RefreshCw className="h-3 w-3" />
        数据每 2 分钟自动刷新
      </div>
    );
  }

  return (
    <div
      className={cn(
        'shrink-0 rounded-b-2xl border-t border-border/70 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.04)]',
        className,
      )}
      data-section="execute-center-alert-dock"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1 px-2 py-1">
        <div className="flex min-w-[140px] flex-1 items-start gap-1.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gate-reject-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-none text-gate-reject-foreground">实时预警说明</p>
            <p className="mt-1 line-clamp-1 text-[10px] leading-snug text-muted-foreground">{alert.description}</p>
          </div>
        </div>

        <div className="min-w-0 flex-[1.2]">
          <p className="text-[11px] font-semibold leading-none text-gate-reject-foreground">建议行动</p>
          <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {alert.suggestedActions.map((action) => (
              <li key={action} className="flex items-center gap-1 text-[10px] text-muted-foreground leading-snug">
                <span className="text-gate-reject-foreground/70">·</span>
                <span className="line-clamp-1">{action}</span>
              </li>
            ))}
          </ul>
        </div>

        {onViewDetail ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 shrink-0 self-center px-2 text-[10px] font-medium text-gate-reject-foreground border-border hover:bg-muted/40"
            onClick={onViewDetail}
          >
            查看详情
          </Button>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-1 border-t border-border/50 px-2 py-0.5 text-[9px] text-muted-foreground">
        <RefreshCw className="h-2.5 w-2.5" />
        数据每 2 分钟自动刷新
      </div>
    </div>
  );
}
