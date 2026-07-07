import { cn } from '@/lib/utils';
import {
  resolveDecisionResolutionActiveStep,
  type DecisionResolutionStepId,
} from '@/lib/decision-action-display.util';
import type { DecisionResolutionCtaPhase } from '@/lib/decision-resolution.util';

const STEPS: Array<{ id: DecisionResolutionStepId; label: string }> = [
  { id: 'select', label: '选择方式' },
  { id: 'confirm', label: '确认结论' },
  { id: 'apply', label: '应用到行程' },
];

function stepIndex(id: DecisionResolutionStepId): number {
  return STEPS.findIndex((step) => step.id === id);
}

export interface DecisionResolutionStepBarProps {
  phase: DecisionResolutionCtaPhase;
  className?: string;
}

/** 决策写路径 · 三步进度（底栏上方） */
export function DecisionResolutionStepBar({ phase, className }: DecisionResolutionStepBarProps) {
  const active = resolveDecisionResolutionActiveStep(phase);
  const activeIdx = stepIndex(active);

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label="决策进度">
      {STEPS.map((step, index) => {
        const done = index < activeIdx || (phase === 'done' && index <= activeIdx);
        const current =
          step.id === active ||
          (step.id === 'confirm' && active === 'apply' && phase === 'apply');
        const confirmed = phase === 'apply' && step.id === 'confirm';
        const isCurrent = current && !done && phase !== 'done';

        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  done || confirmed
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {done || confirmed ? '✓' : index + 1}
              </span>
              <span
                className={cn(
                  'max-w-full truncate text-center text-[11px]',
                  isCurrent || confirmed ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={cn(
                  'mb-3 h-px w-2 shrink-0 sm:w-4',
                  index < activeIdx ? 'bg-primary/50' : 'bg-border',
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
