import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { WorkbenchCtreUiOutput } from '../types';
import { CtreCompileProgressPanelMaybe } from './CtreCompileProgressPanel';
import { CtreVerifyRepairLoopPanel } from './CtreVerifyRepairLoopPanel';
import { shouldShowWorkbenchVerifyRepairPanel } from '../workbench-helpers';
import { getCtreSkippedReasonCopy } from '../constants';

export type WorkbenchCtrePanelProps = {
  ctre: WorkbenchCtreUiOutput | null;
  /** async task 进行中的 currentStage（92–94% CTRE/VERIFY 文案） */
  currentStage?: string;
  active?: boolean;
  compact?: boolean;
  className?: string;
};

export function WorkbenchCtrePanel({
  ctre,
  currentStage,
  active = false,
  compact = true,
  className,
}: WorkbenchCtrePanelProps) {
  if (ctre?.skipped) {
    const skipCopy = getCtreSkippedReasonCopy(ctre.reason) ?? ctre.reason;
    return skipCopy ? (
      <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>{skipCopy}</p>
    ) : null;
  }

  const showBody = ctre && shouldShowWorkbenchVerifyRepairPanel(ctre);
  const showStageOnly = active && !showBody && Boolean(currentStage?.trim());

  if (!showBody && !showStageOnly) return null;

  const isKernelStage =
    currentStage &&
    /CTRE|VERIFY|RE-VERIFY|REPAIR|Kernel/i.test(currentStage);

  return (
    <div className={cn('space-y-2', className)}>
      {showStageOnly ? (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2 py-1.5',
            compact ? 'text-[10px]' : 'text-xs',
          )}
        >
          {active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" /> : null}
          <span className={cn('text-muted-foreground', isKernelStage && 'text-foreground font-medium')}>
            {currentStage}
          </span>
        </div>
      ) : null}

      {ctre?.progress ? (
        <CtreCompileProgressPanelMaybe progress={ctre.progress} compact={compact} />
      ) : null}

      {ctre ? <CtreVerifyRepairLoopPanel ctre={ctre} compact={compact} /> : null}

      {active && currentStage?.trim() && showBody && isKernelStage ? (
        <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
          {currentStage}
        </p>
      ) : null}
    </div>
  );
}
