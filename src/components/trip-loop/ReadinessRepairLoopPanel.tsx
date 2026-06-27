import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { isLoopValidationInFlight } from '@/lib/trip-loop-display';
import type { TripLoopUiView } from '@/types/trip-loop';
import { LoopChecklistStrip } from './LoopChecklistStrip';
import { LoopIssueCardView } from './LoopIssueCard';
import { LoopProgressHeader } from './LoopProgressHeader';
import { LoopSnapshotCompare } from './LoopSnapshotCompare';

export interface ReadinessRepairLoopPanelProps {
  ui: TripLoopUiView | null;
  loading?: boolean;
  running?: boolean;
  applying?: boolean;
  error?: string | null;
  canApply?: boolean;
  onRun?: () => void;
  onApply?: () => void;
  onRetry?: () => void;
  className?: string;
  /** 展示完整可行性报告入口 */
  onOpenFeasibilityDetail?: () => void;
  onChecklistItemActivate?: (item: import('@/types/trip-loop').TripLoopChecklistItem) => void;
}

export function ReadinessRepairLoopPanel({
  ui,
  loading,
  running,
  applying,
  error,
  canApply,
  onRun,
  onApply,
  onRetry,
  className,
  onOpenFeasibilityDetail,
  onChecklistItemActivate,
}: ReadinessRepairLoopPanelProps) {
  if (loading && !ui) {
    return (
      <Card className={className}>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!ui) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            尚未运行方案验证闭环。系统将检查时间、营业、团队、天气与预订等维度。
          </p>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive text-left">
              {error}
              {onRetry ? (
                <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={onRetry}>
                  重试
                </Button>
              ) : null}
            </div>
          ) : null}
          {onRun ? (
            <Button type="button" onClick={onRun} disabled={running || loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', running && 'animate-spin')} />
              {running ? '检查中…' : '检查方案'}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const primaryLabel = ui.primaryAction?.label ?? '采用推荐调整';
  const showApply =
    canApply &&
    (ui.phase === 'awaiting_approval' || ui.phase === 'issues_found') &&
    onApply;
  const snapshot = ui.snapshot;

  return (
    <div className={cn('space-y-4', className)}>
      <LoopProgressHeader
        ui={ui}
        loading={isLoopValidationInFlight(ui, running, Boolean(applying))}
      />

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
          {onRetry ? (
            <Button variant="link" size="sm" className="h-auto p-0 ml-2" onClick={onRetry}>
              重试
            </Button>
          ) : null}
        </div>
      ) : null}

      <LoopChecklistStrip items={ui.checklist} onItemActivate={onChecklistItemActivate} />

      {ui.issueCards.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">待处理问题</p>
          <div className="space-y-2">
            {ui.issueCards.map((issue) => (
              <LoopIssueCardView key={issue.issueId} issue={issue} />
            ))}
          </div>
        </div>
      ) : null}

      {snapshot ? <LoopSnapshotCompare before={snapshot.before} after={snapshot.after} /> : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {showApply ? (
          <Button onClick={onApply} disabled={applying || running}>
            {applying ? '应用中…' : primaryLabel}
          </Button>
        ) : null}
        {ui.phase === 'failed' && onRun ? (
          <Button variant="outline" onClick={onRun} disabled={running}>
            <RefreshCw className={cn('h-4 w-4 mr-2', running && 'animate-spin')} />
            重新检查
          </Button>
        ) : null}
        {ui.phase === 'completed' && onRun ? (
          <Button variant="outline" size="sm" onClick={onRun} disabled={running}>
            再次验证
          </Button>
        ) : null}
        {!showApply && ui.phase !== 'failed' && ui.phase !== 'completed' && onRun ? (
          <Button variant="ghost" size="sm" onClick={onRun} disabled={running}>
            刷新验证
          </Button>
        ) : null}
        {onOpenFeasibilityDetail ? (
          <Button variant="link" size="sm" className="text-muted-foreground" onClick={onOpenFeasibilityDetail}>
            查看详细报告
          </Button>
        ) : null}
      </div>
    </div>
  );
}
