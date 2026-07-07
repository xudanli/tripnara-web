import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Check,
  ChevronDown,
  Loader2,
  Minus,
  X,
  AlertTriangle,
  Circle,
} from 'lucide-react';
import type { CtreCompileProgressView, CtrePhaseStatus } from '../types';
import {
  counterIcon,
  formatAffectedDays,
  getCtreCounterRows,
  getCtrePhaseLabel,
  getCtreStatusBadge,
  getCtreTriggerLabel,
  truncateCompileId,
} from '../helpers';

export type CtreCompileProgressPanelProps = {
  progress: CtreCompileProgressView;
  /** 编排总进度 0–100（SSE progress_percentage） */
  orchestrationPercent?: number;
  compact?: boolean;
  className?: string;
  defaultPhasesExpanded?: boolean;
};

function PhaseStatusIcon({ status }: { status: CtrePhaseStatus }) {
  switch (status) {
    case 'done':
      return <Check className="h-3.5 w-3.5 text-gate-allow-foreground" aria-hidden />;
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />;
    case 'failed':
      return <X className="h-3.5 w-3.5 text-gate-reject-foreground" aria-hidden />;
    case 'skipped':
      return <Minus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />;
    default:
      return <Circle className="h-3 w-3 text-muted-foreground/60" aria-hidden />;
  }
}

function CounterStatusIcon({ done, total }: { done: number; total: number }) {
  const kind = counterIcon(done, total);
  if (kind === 'ok') return <Check className="h-3.5 w-3.5 text-gate-allow-foreground shrink-0" aria-hidden />;
  if (kind === 'warn') {
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden />;
  }
  return <Circle className="h-3 w-3 text-muted-foreground/50 shrink-0" aria-hidden />;
}

export function CtreCompileProgressPanel({
  progress,
  orchestrationPercent,
  compact = false,
  className,
  defaultPhasesExpanded = false,
}: CtreCompileProgressPanelProps) {
  const [phasesOpen, setPhasesOpen] = useState(defaultPhasesExpanded);
  const statusBadge = getCtreStatusBadge(progress.status);
  const counterRows = getCtreCounterRows(progress.counters);
  const barValue =
    typeof orchestrationPercent === 'number' && Number.isFinite(orchestrationPercent)
      ? Math.min(100, Math.max(0, Math.round(orchestrationPercent)))
      : Math.min(100, Math.max(0, Math.round(progress.score)));
  const affectedDays = progress.incremental?.merged
    ? formatAffectedDays(progress.incremental.affectedDayIndices)
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-background/80',
        compact ? 'p-2 space-y-2' : 'p-3 space-y-3',
        className,
      )}
      role="region"
      aria-label="CTRE 旅行编译进度"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          CTRE 旅行编译
        </p>
        {progress.trigger === 'repair' ? (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {getCtreTriggerLabel('repair')}
          </Badge>
        ) : null}
        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5', statusBadge.className)}>
          {statusBadge.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
          score {progress.score}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Progress value={barValue} className={cn('flex-1', compact ? 'h-1' : 'h-1.5')} />
          <span className="tabular-nums shrink-0">{barValue}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          trigger: {getCtreTriggerLabel(progress.trigger)} · compileId:{' '}
          {truncateCompileId(progress.compileId)}
        </p>
        {affectedDays ? (
          <p className="text-[10px] text-muted-foreground">{affectedDays}</p>
        ) : null}
      </div>

      {counterRows.length > 0 ? (
        <ul className={cn('space-y-1', compact ? 'text-[10px]' : 'text-xs')}>
          {counterRows.map((row) => (
            <li key={row.key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-muted-foreground">{row.label}</span>
              <span className="tabular-nums font-medium min-w-[3rem]">
                {row.done}/{row.total}
              </span>
              <CounterStatusIcon done={row.done} total={row.total} />
            </li>
          ))}
        </ul>
      ) : null}

      {progress.phases.length > 0 ? (
        <Collapsible open={phasesOpen} onOpenChange={setPhasesOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', phasesOpen && 'rotate-180')}
            />
            阶段明细
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className={cn('mt-2 space-y-1 pl-1', compact ? 'text-[10px]' : 'text-xs')}>
              {progress.phases.map((phase) => (
                <li key={phase.phase} className="flex items-start gap-2 text-muted-foreground">
                  <PhaseStatusIcon status={phase.status} />
                  <span className={cn(phase.status === 'running' && 'text-foreground font-medium')}>
                    {getCtrePhaseLabel(phase.phase)}
                  </span>
                  {phase.summary ? (
                    <span className="text-muted-foreground/80 truncate">— {phase.summary}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

/** 无 progress 时不渲染；Compiler 关闭时 SSE 无字段，调用方传 null 即可 */
export function CtreCompileProgressPanelMaybe({
  progress,
  ...props
}: Partial<CtreCompileProgressPanelProps> & { progress?: CtreCompileProgressView | null }) {
  if (!progress) return null;
  return <CtreCompileProgressPanel progress={progress} {...props} />;
}
