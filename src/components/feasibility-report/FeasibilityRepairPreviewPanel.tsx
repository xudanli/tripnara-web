import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ITINERARY_CHANGE_LABEL,
  isPlanClassAction,
} from '@/lib/feasibility-repair-plan-class';
import type { ItineraryDiffEntry, PreviewRepairResponse } from '@/types/feasibility-repair';
import RepairConsensusGate from '@/components/readiness/RepairConsensusGate';
import { FeasibilityGuardianRepairPanel } from './FeasibilityGuardianRepairPanel';
import { resolveFeasibilityGuardianDisplayMode } from '@/lib/feasibility-guardian-display';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import { isSyntheticPlanBRepairOption } from '@/lib/feasibility-proof-plan-b';

function DiffList({ diff }: { diff: ItineraryDiffEntry[] }) {
  if (!diff.length) {
    return (
      <p className="text-xs text-muted-foreground py-3 text-center rounded-md border border-dashed border-border">
        引擎未产生行程结构变化
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {diff.map((row) => (
        <li
          key={row.slotId}
          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs rounded-md border border-border bg-background px-2.5 py-2"
        >
          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
            {ITINERARY_CHANGE_LABEL[row.changeType] ?? row.changeType}
          </Badge>
          <span className="font-mono-brand text-muted-foreground">Day {row.dayNumber}</span>
          {row.changeType === 'time_changed' && (
            <span className="text-foreground">
              {row.before?.title}: {row.before?.time ?? '—'} → {row.after?.time ?? '—'}
            </span>
          )}
          {row.changeType === 'removed' && <span className="text-foreground">{row.before?.title}</span>}
          {row.changeType === 'added' && <span className="text-foreground">{row.after?.title}</span>}
          {row.changeType === 'title_changed' && (
            <span className="text-foreground">
              {row.before?.title} → {row.after?.title}
            </span>
          )}
          {row.changeType === 'moved_day' && (
            <span className="text-foreground">
              {row.after?.title ?? row.before?.title}: Day {row.before?.dayNumber} → Day{' '}
              {row.after?.dayNumber}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface FeasibilityRepairPreviewPanelProps {
  preview: PreviewRepairResponse | null;
  loading?: boolean;
  issue?: FeasibilityIssueDto | null;
  guidanceOption?: FeasibilityRepairOptionDto | null;
  onOpenSchedule?: () => void;
  guardianNegotiation?: GuardianNegotiationResult | null;
  guardianMock?: boolean;
  deferred?: boolean;
  forceConfirmed?: boolean;
  onForceConfirm?: () => void;
  className?: string;
}

export function FeasibilityRepairPreviewPanel({
  preview,
  loading,
  issue,
  guidanceOption,
  onOpenSchedule,
  guardianNegotiation,
  guardianMock,
  deferred,
  forceConfirmed = false,
  onForceConfirm,
  className,
}: FeasibilityRepairPreviewPanelProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3 rounded-lg border border-border bg-muted/20 p-3', className)}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!preview) {
    if (guidanceOption) {
      return (
        <div
          className={cn(
            'rounded-lg border border-border bg-muted/20 px-3 py-4 space-y-3 text-left',
            className,
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-normal">
              手动调整
            </Badge>
            <span className="text-xs font-medium text-foreground">{guidanceOption.label}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {guidanceOption.description?.trim() ||
              '此方案无法自动生成变更预览，请按说明在时间轴完成调整后，再点「重新检查本条」或「重新验证」。'}
          </p>
          {onOpenSchedule ? (
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={onOpenSchedule}>
              去时间轴调整
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-border bg-muted/10 px-3 py-8 text-center',
          className,
        )}
      >
        <p className="text-xs text-muted-foreground">选择左侧方案后，将展示行程变更预览</p>
      </div>
    );
  }

  const showPlanDiff = isPlanClassAction(preview.actionType);
  const guardian = guardianNegotiation ?? preview.guardianNegotiation ?? null;
  const guardianDisplayMode = resolveFeasibilityGuardianDisplayMode({
    issue,
    preview,
    guardian,
    deferred,
  });
  const showGuardianGate =
    guardianDisplayMode === 'full' &&
    deferred &&
    !forceConfirmed &&
    onForceConfirm &&
    guardian?.consensus === 'BLOCKED';

  return (
    <div className={cn('space-y-3 rounded-lg border border-border bg-muted/20 p-3 min-w-0 w-full', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {preview.previewMode === 'decision_engine_dry_run' && (
          <Badge className="text-[10px]">决策引擎预览（未写库）</Badge>
        )}
        {preview.previewMode === 'heuristic' && (
          <Badge variant="secondary" className="text-[10px] font-normal">
            参考预览，应用后可能不同
          </Badge>
        )}
      </div>

      {preview.message && (
        <p className="text-xs text-muted-foreground leading-relaxed">{preview.message}</p>
      )}

      {preview.after.highlights.length > 0 && (
        <p className="text-xs text-foreground leading-relaxed">
          <span className="text-muted-foreground">摘要 · </span>
          {preview.after.highlights.join('；')}
        </p>
      )}

      {showPlanDiff && <DiffList diff={preview.itineraryDiff} />}

      <div className="text-xs text-foreground pt-1 border-t border-border/60">
        当前可执行性{' '}
        <span className="font-mono-brand tabular-nums">{preview.impact.feasibilityScoreBefore}</span>
        {preview.impact.estimated ? (
          <span className="text-muted-foreground">（修复后分数需重新验证）</span>
        ) : preview.impact.feasibilityScoreAfter != null ? (
          <span>
            {' '}
            →{' '}
            <span className="font-mono-brand tabular-nums">
              {preview.impact.feasibilityScoreAfter}
            </span>
          </span>
        ) : null}
      </div>

      {guardian ? (
        <FeasibilityGuardianRepairPanel
          mode={guardianDisplayMode}
          negotiation={guardian}
          issue={issue}
          preview={preview}
          isMock={guardianMock}
        />
      ) : null}

      {deferred && !forceConfirmed && onForceConfirm ? (
        showGuardianGate ? (
          <RepairConsensusGate
            consensus={guardian?.consensus}
            forceConfirmed={forceConfirmed}
            onForceConfirm={onForceConfirm}
          />
        ) : guardianDisplayMode !== 'hidden' ? (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-900 dark:text-amber-100">此修复需先确认</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              系统建议先阅读上方守护者评议后再应用；若你已了解风险，可继续。
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={onForceConfirm}
            >
              仍要修复
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-900 dark:text-amber-100">此修复需先确认</p>
            <p className="mt-1 text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              应用前请确认你接受当前方案调整。
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={onForceConfirm}
            >
              仍要修复
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
