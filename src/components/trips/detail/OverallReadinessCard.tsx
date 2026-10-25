import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  buildOverallReadinessReportPath,
  resolveOverallReadinessActionHref,
} from '@/lib/overall-readiness-navigation.util';
import {
  formatOverallReadinessMeta,
  isOverallReadinessBlocked,
} from '@/lib/overall-readiness.util';
import type { OverallReadinessCardDto } from '@/types/overall-readiness';
import { tripDetailUi } from './trip-detail-ui';

export interface OverallReadinessCardProps {
  tripId: string;
  readiness: OverallReadinessCardDto | null | undefined;
  loading?: boolean;
  className?: string;
  /** 紧凑模式：工作台顶栏 */
  compact?: boolean;
}

function DimensionMiniBars({
  dimensions,
}: {
  dimensions: OverallReadinessCardDto['dimensions'];
}) {
  if (!dimensions?.length) return null;
  return (
    <div className="mt-2 grid grid-cols-5 gap-1.5">
      {dimensions.map((dim) => {
        const pct = Math.min(100, Math.max(0, dim.score));
        return (
          <div key={dim.code} className="min-w-0 space-y-0.5">
            <div className="h-1 rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="truncate text-center text-[9px] text-muted-foreground">{dim.labelZh}</p>
          </div>
        );
      })}
    </div>
  );
}

export function OverallReadinessCard({
  tripId,
  readiness,
  loading = false,
  className,
  compact = false,
}: OverallReadinessCardProps) {
  if (loading && !readiness) {
    return (
      <div className={cn(tripDetailUi.statCard, 'p-3 shadow-none animate-pulse', className)}>
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-2 h-7 w-16 rounded bg-muted" />
      </div>
    );
  }

  if (!readiness) {
    return (
      <div className={cn(tripDetailUi.statCard, 'p-3 shadow-none', className)}>
        <p className="text-xs text-muted-foreground">整体准备度待同步</p>
      </div>
    );
  }

  const blocked = isOverallReadinessBlocked(readiness.state);
  const reportPath = buildOverallReadinessReportPath(tripId);
  const priorityHref = readiness.topPriority
    ? resolveOverallReadinessActionHref(tripId, {
        actionCode: readiness.topPriority.actionCode,
        deepLink: readiness.topPriority.deepLink,
      })
    : reportPath;
  const meta = formatOverallReadinessMeta(readiness);

  if (compact) {
    return (
      <Link
        to={reportPath}
        className={cn(
          'flex min-w-0 max-w-md flex-1 items-center gap-2 text-left hover:opacity-90',
          className,
        )}
        title="查看准备报告"
      >
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">整体准备度</span>
        <div className="h-1.5 min-w-[100px] flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-300',
              blocked ? 'bg-gate-reject-foreground' : 'bg-primary',
            )}
            style={{ width: `${Math.min(100, Math.max(0, readiness.score))}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 text-[11px] tabular-nums',
            blocked ? 'font-medium text-gate-reject-foreground' : 'text-muted-foreground',
          )}
        >
          {Math.round(readiness.score)}% · {readiness.displayLabelZh}
        </span>
      </Link>
    );
  }

  return (
    <div
      className={cn(
        tripDetailUi.statCard,
        'p-3 shadow-none',
        blocked && 'border-gate-reject-border bg-gate-reject/5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">整体准备度</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground leading-tight">
            {Math.round(readiness.score)}%
            <span
              className={cn(
                'ml-1.5 text-sm font-medium',
                blocked ? 'text-gate-reject-foreground' : 'text-muted-foreground',
              )}
            >
              · {readiness.displayLabelZh}
            </span>
          </p>
          {readiness.headline ? (
            <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{readiness.headline}</p>
          ) : null}
        </div>
        {blocked ? (
          <Badge variant="outline" className={cn(tripDetailUi.tagReject, 'shrink-0 gap-1')}>
            <AlertTriangle className="h-3 w-3" />
            已阻塞
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(tripDetailUi.tagConfirm, 'shrink-0')}>
            {readiness.displayLabelZh}
          </Badge>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground">{meta}</p>

      <DimensionMiniBars dimensions={readiness.dimensions} />

      {readiness.topPriority?.title ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px]">
          <span className="text-muted-foreground shrink-0">优先处理：</span>
          <Link
            to={priorityHref}
            className="min-w-0 font-medium text-foreground underline-offset-2 hover:underline line-clamp-1"
          >
            {readiness.topPriority.title}
          </Link>
          {readiness.topPriority.estimatedScoreLift != null ? (
            <span className="tabular-nums text-muted-foreground">
              +{readiness.topPriority.estimatedScoreLift} 分
            </span>
          ) : null}
        </div>
      ) : readiness.whyNotReady ? (
        <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{readiness.whyNotReady}</p>
      ) : null}

      {readiness.potentialScoreLift != null && readiness.potentialScoreLift > 0 ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          处理优先项预计 +{readiness.potentialScoreLift} 分
        </p>
      ) : null}

      <Button variant="link" className={cn(tripDetailUi.linkInline, 'mt-2 h-auto p-0')} asChild>
        <Link to={reportPath}>
          查看准备报告
          <ChevronRight className="ml-0.5 inline h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
