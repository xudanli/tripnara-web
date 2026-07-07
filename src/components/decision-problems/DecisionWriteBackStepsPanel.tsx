import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  advanceWriteBackStepStatuses,
  buildDecisionWriteBackSteps,
  type DecisionWriteBackStep,
} from '@/lib/decision-write-back-steps.util';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import type { ApplyDecisionProblemResponse } from '@/generated/unified-decision-contracts';
import type { PlanningDecisionExecutionStep } from '@/types/planning-decision-pack';

export interface DecisionWriteBackStepsPanelProps {
  phase: 'idle' | 'applying' | 'done';
  itineraryDiff?: ItineraryDiffEntry[];
  memberNotifyCount?: number;
  applyResult?: ApplyDecisionProblemResponse | null;
  tripVersionAfter?: string | null;
  executionSteps?: PlanningDecisionExecutionStep[];
  className?: string;
  onUndo?: () => void;
}

function StepIcon({ status }: { status: DecisionWriteBackStep['status'] }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-3.5 w-3.5 text-gate-allow-foreground" />;
  }
  if (status === 'running') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />;
}

/** 决策写回后 · 系统动作步骤反馈 */
export function DecisionWriteBackStepsPanel({
  phase,
  itineraryDiff,
  memberNotifyCount,
  applyResult,
  tripVersionAfter,
  executionSteps,
  className,
  onUndo,
}: DecisionWriteBackStepsPanelProps) {
  const baseSteps = useMemo(
    () =>
      buildDecisionWriteBackSteps({
        phase,
        itineraryDiff,
        memberNotifyCount,
        applyResult,
        tripVersionAfter,
        executionSteps,
      }),
    [phase, itineraryDiff, memberNotifyCount, applyResult, tripVersionAfter, executionSteps],
  );

  const [animatedSteps, setAnimatedSteps] = useState(baseSteps);

  useEffect(() => {
    if (phase !== 'done') {
      setAnimatedSteps(baseSteps);
      return;
    }

    setAnimatedSteps(advanceWriteBackStepStatuses(baseSteps, 0));
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      if (index >= baseSteps.length) {
        setAnimatedSteps(baseSteps.map((step) => ({ ...step, status: 'done' as const })));
        window.clearInterval(timer);
        return;
      }
      setAnimatedSteps(advanceWriteBackStepStatuses(baseSteps, index));
    }, 420);

    return () => window.clearInterval(timer);
  }, [phase, baseSteps]);

  if (phase === 'idle') return null;

  return (
    <section className={cn('rounded-xl border border-border/60 bg-card/70 px-3 py-2.5', className)}>
      <p className="text-xs font-semibold text-foreground">
        {phase === 'applying' ? '正在写入行程…' : '写回完成'}
      </p>
      <ul className="mt-2 space-y-1.5">
        {animatedSteps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-[11px]">
            <StepIcon status={step.status} />
            <span
              className={cn(
                step.status === 'done'
                  ? 'text-foreground'
                  : step.status === 'running'
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
      {phase === 'done' && onUndo ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-7 px-2 text-[11px] text-muted-foreground"
          onClick={onUndo}
        >
          撤销本次调整
        </Button>
      ) : null}
    </section>
  );
}
