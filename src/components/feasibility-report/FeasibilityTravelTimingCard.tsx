import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { priorityAccentBorder } from '@/lib/feasibility-ui';
import {
  isUltraLongDriveIssue,
  type FeasibilityTravelTimingViewModel,
} from '@/lib/feasibility-travel-timing';
import type { FeasibilityIssueDto } from '@/types/trip-feasibility-report';

function formatTravelDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `约 ${h}h${m}min` : `约 ${h} 小时`;
}

function statusToneClasses(tone: FeasibilityTravelTimingViewModel['statusTone']): string {
  switch (tone) {
    case 'too_early':
      return 'border-gate-suggest-border bg-gate-suggest/25 text-gate-suggest-foreground';
    case 'tight':
      return 'border-gate-suggest-border/80 bg-gate-suggest/15 text-muted-foreground';
    case 'missing_times':
      return 'border-gate-confirm-border bg-gate-confirm/30 text-gate-confirm-foreground';
    default:
      return 'border-border bg-muted/40 text-muted-foreground';
  }
}

interface FeasibilityTravelTimingCardProps {
  issue: FeasibilityIssueDto;
  view: FeasibilityTravelTimingViewModel;
  onNavigateToSchedule: () => void;
  onOpenQuickEdit: () => void;
  onLoadRepairs?: () => void;
  repairLoading?: boolean;
}

export function FeasibilityTravelTimingCard({
  issue,
  view,
  onNavigateToSchedule,
  onOpenQuickEdit,
  onLoadRepairs,
  repairLoading,
}: FeasibilityTravelTimingCardProps) {
  const ultraLongDrive = isUltraLongDriveIssue(issue, view);
  const quickEditPrimary =
    !ultraLongDrive && issue.uiHints?.primaryAction === 'adjust_time';
  const repairPrimary =
    ultraLongDrive || issue.uiHints?.primaryAction === 'open_repair';
  const routeMeta = [
    view.travelDistanceLabel,
    view.travelMinutes > 0 ? formatTravelDuration(view.travelMinutes) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 overflow-hidden border-l-[3px]',
        priorityAccentBorder(issue.priority),
      )}
    >
      <div className="px-4 py-3 space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {ultraLongDrive ? '长途驾驶' : '交通衔接'}
        </p>

        <div className="space-y-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex flex-col items-center shrink-0 pt-1">
              <span className="h-2 w-2 rounded-full bg-foreground/70" />
              <span className="w-px flex-1 min-h-[24px] bg-border my-1" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug truncate">
                {view.fromPlaceLabel}
              </p>
              {view.departAtLabel && (
                <p className="text-xs font-mono-brand text-muted-foreground mt-0.5">
                  {view.departAnchorKind === 'car_pickup' ? '取车' : view.departAnchorKind === 'checkout' ? '退房' : '出发'}{' '}
                  {view.departAtLabel}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pl-0.5 text-xs text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono-brand">{routeMeta || '路程待确认'}</span>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <div className="flex flex-col items-center shrink-0 pt-1">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug truncate">
                {view.toPlaceLabel}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs font-mono-brand text-muted-foreground">
                {view.arriveAtLabel && <span>约 {view.arriveAtLabel} 抵达</span>}
                {view.activityStartLabel && <span>开始 {view.activityStartLabel}</span>}
                {view.suggestedTimeLabel && (
                  <span className="text-gate-suggest-foreground">
                    建议 {view.suggestedTimeLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <p
          className={cn(
            'text-xs leading-relaxed rounded-md border px-3 py-2',
            statusToneClasses(view.statusTone),
          )}
        >
          {view.statusMessage}
        </p>

        <div className="flex flex-wrap gap-2">
          {repairPrimary && onLoadRepairs && (
            <Button
              size="sm"
              variant="default"
              disabled={repairLoading}
              onClick={onLoadRepairs}
            >
              {repairLoading ? '加载方案中…' : '查看拆段方案'}
            </Button>
          )}
          <Button
            size="sm"
            variant={repairPrimary ? 'outline' : quickEditPrimary ? 'outline' : 'default'}
            onClick={onNavigateToSchedule}
          >
            在时间轴调整
          </Button>
          {!ultraLongDrive && (
            <Button
              size="sm"
              variant={quickEditPrimary ? 'default' : 'outline'}
              onClick={onOpenQuickEdit}
            >
              快速改时间
            </Button>
          )}
          {!repairPrimary && onLoadRepairs && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={repairLoading}
              onClick={onLoadRepairs}
            >
              生成调整建议
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
