import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
  PLAN_GATE_STEPS,
  planGateStepActive,
  planGateStepDone,
  planGateStepItem,
  planGateStepPending,
  planGateStepTrack,
  resolvePlanGateStepIndex,
} from './plan-gate-ui';
import type { PlanGateWizardStep } from '@/hooks/usePlanGateFlow';

export interface PlanGateStepHeaderProps {
  activeStep: PlanGateWizardStep;
  className?: string;
}

export function PlanGateStepHeader({ activeStep, className }: PlanGateStepHeaderProps) {
  const currentIndex = resolvePlanGateStepIndex(activeStep);

  return (
    <div className={cn('shrink-0 border-b border-border/60 bg-muted/10 px-5 py-3', className)}>
      <div className={planGateStepTrack}>
        {PLAN_GATE_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <div key={step.id} className="flex shrink-0 items-center gap-1">
              <div
                className={cn(
                  planGateStepItem,
                  done && planGateStepDone,
                  active && planGateStepActive,
                  !done && !active && planGateStepPending,
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full text-[9px]',
                    done && 'bg-primary text-primary-foreground',
                    active && 'bg-primary/15 text-foreground',
                    !done && !active && 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : index + 1}
                </span>
                {step.label}
              </div>
              {index < PLAN_GATE_STEPS.length - 1 ? (
                <span className="text-[10px] text-muted-foreground/50" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
