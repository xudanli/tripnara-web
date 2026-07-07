import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { WorkbenchCtreUiOutput } from '../types';
import {
  formatVerifyRoundHeadline,
  formatVerifyRoundRecompileLine,
  formatVerifyRoundRepairLine,
  getKernelIssueClassBadgeClass,
  getKernelVerifyRepairTerminatedLabel,
  isWorkbenchVerifyRepairBlocking,
  isWorkbenchVerifyRepairWarning,
  resolveWorkbenchVerifyRepairRoundDetails,
} from '../workbench-helpers';

export type CtreVerifyRepairLoopPanelProps = {
  ctre: WorkbenchCtreUiOutput;
  compact?: boolean;
  className?: string;
};

export function CtreVerifyRepairLoopPanel({
  ctre,
  compact = true,
  className,
}: CtreVerifyRepairLoopPanelProps) {
  if (ctre.skipped) return null;

  const loop = ctre.kernelVerifyRepairLoop;
  const roundDetails = resolveWorkbenchVerifyRepairRoundDetails(ctre);
  if (!loop && roundDetails.length === 0) return null;

  const blocking = isWorkbenchVerifyRepairBlocking(ctre);
  const warning = isWorkbenchVerifyRepairWarning(ctre);

  return (
    <div
      className={cn(
        'rounded-md border border-border/50 bg-muted/20',
        compact ? 'p-2 space-y-2' : 'p-3 space-y-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('font-medium', compact ? 'text-[11px]' : 'text-xs')}>VERIFY⇄REPAIR 闭环</p>
        {loop?.terminatedReason ? (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] h-5',
              loop.terminatedReason === 'clean' &&
                'border-gate-allow-border/40 text-gate-allow-foreground dark:text-gate-allow-foreground',
              blocking && 'border-gate-reject-border/40 text-gate-reject-foreground dark:text-gate-reject-foreground',
              warning && 'border-amber-500/40 text-amber-700 dark:text-amber-400',
            )}
          >
            {getKernelVerifyRepairTerminatedLabel(loop.terminatedReason)}
          </Badge>
        ) : null}
        {typeof loop?.repairCount === 'number' && typeof loop?.maxRepairs === 'number' ? (
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            修复 {loop.repairCount}/{loop.maxRepairs} 轮
          </span>
        ) : null}
      </div>

      {roundDetails.length > 0 ? (
        <ol className={cn('space-y-2', compact ? 'text-[10px]' : 'text-xs')}>
          {roundDetails.map((round) => {
            const repairLine = formatVerifyRoundRepairLine(round.repair);
            const ctreLine = formatVerifyRoundRecompileLine(round.recompile);
            const issues = round.verify.issues ?? [];

            return (
              <li key={round.round} className="relative pl-3 border-l border-border/60">
                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary/70" />
                <p className="font-medium text-foreground">
                  Round {round.round}{' '}
                  <span className="text-muted-foreground font-normal">
                    {formatVerifyRoundHeadline(round)}
                  </span>
                </p>
                {issues.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {issues.map((issue) => (
                      <li key={`${round.round}-${issue.code}`} className="flex items-start gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1 py-0 h-4 shrink-0',
                            getKernelIssueClassBadgeClass(issue.class),
                          )}
                        >
                          {issue.class}
                        </Badge>
                        <span className="text-muted-foreground leading-snug">
                          {issue.code}: {issue.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : round.verify.issueCount === 0 ? (
                  <p className="mt-0.5 text-gate-allow-foreground dark:text-gate-allow-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 无 issue
                  </p>
                ) : null}
                {repairLine ? (
                  <p className="mt-0.5 text-muted-foreground pl-2 border-l border-border/40">
                    {repairLine}
                  </p>
                ) : null}
                {ctreLine ? (
                  <p className="mt-0.5 text-muted-foreground pl-2 border-l border-border/40">
                    {ctreLine}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : loop?.finalVerify ? (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Circle className="h-3 w-3" />
          最终 VERIFY · {loop.finalVerify.issueCount ?? 0} 项
        </p>
      ) : null}

      {blocking ? (
        <p className="text-[10px] text-gate-reject-foreground dark:text-gate-reject-foreground flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          存在 fatal issue，提交可能阻塞
        </p>
      ) : warning ? (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          已达修复上限，仍有未解冲突
        </p>
      ) : null}
    </div>
  );
}
