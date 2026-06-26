import { ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTripFeasibilityReport } from '@/hooks/useTripFeasibilityReport';
import {
  feasibilityVerdictGateClasses,
  feasibilityVerdictIcon,
  feasibilityVerdictToGate,
  verdictAccentBorder,
} from '@/lib/feasibility-ui';
import { getGateStatusLabel } from '@/lib/gate-status';
import {
  FeasibilityScoreBlock,
  FeasibilitySummaryChips,
} from './feasibility-ui';

interface FeasibilitySummaryCardProps {
  tripId: string;
  onViewReport?: () => void;
  onRevalidate?: () => void;
  className?: string;
}

export function FeasibilitySummaryCard({
  tripId,
  onViewReport,
  onRevalidate,
  className,
}: FeasibilitySummaryCardProps) {
  const { data, loading, revalidateFull } = useTripFeasibilityReport(tripId);

  const handleRevalidate = async () => {
    await revalidateFull();
    onRevalidate?.();
  };

  if (loading && !data) {
    return (
      <Card className={cn('border border-border bg-muted/25', className)}>
        <CardContent className="py-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const Icon = feasibilityVerdictIcon(data.verdict.status);
  const gateLabel = getGateStatusLabel(feasibilityVerdictToGate(data.verdict.status));

  return (
    <Card
      className={cn(
        'border border-border border-l-[3px] bg-muted/25',
        verdictAccentBorder(data.verdict.status),
        onViewReport && 'cursor-pointer',
        className,
      )}
      onClick={onViewReport}
      data-tour="feasibility-summary"
    >
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
                feasibilityVerdictGateClasses(data.verdict.status),
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">可执行性</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-medium border',
                    feasibilityVerdictGateClasses(data.verdict.status),
                  )}
                >
                  {gateLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {data.verdict.headline}
              </p>
            </div>
          </div>
        </div>

        {data.isStale && (
          <p className="text-[11px] text-gate-confirm-foreground bg-gate-confirm/50 border border-gate-confirm-border rounded-md px-2.5 py-1.5 leading-relaxed">
            报告已过期 · 验证 {data.verifiedForTripVersion ?? '—'} / 当前{' '}
            {data.currentTripVersion ?? '—'}
          </p>
        )}

        <FeasibilityScoreBlock score={data.overallScore} compact />

        <FeasibilitySummaryChips
          mustHandle={data.summary.mustHandle}
          suggestAdjust={data.summary.suggestAdjust}
          pendingConfirm={data.summary.pendingConfirm}
        />

        <div
          className="flex flex-wrap items-center gap-2 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {onViewReport && (
            <Button
              size="sm"
              variant="default"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewReport();
              }}
            >
              查看报告
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleRevalidate();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            重新验证
          </Button>
          {onViewReport && (
            <button
              type="button"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground ml-auto transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onViewReport();
              }}
            >
              完整报告
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
