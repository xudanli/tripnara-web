import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NEGOTIATION_STAGE_STEPS,
  resolveNegotiationStageIndex,
  resolveNegotiationStageStep,
  type NegotiationStageStepId,
} from '@/lib/collab-negotiation-stage';
import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';

interface CollabNegotiationProgressTimelineProps {
  task: DomainNegotiationTask;
  detail: PreferenceRoundDetail | null;
  className?: string;
  variant?: 'compact' | 'stage';
}

export function CollabNegotiationProgressTimeline({
  task,
  detail,
  className,
  variant = 'compact',
}: CollabNegotiationProgressTimelineProps) {
  const activeStep = resolveNegotiationStageStep(task, detail);
  const activeIndex = resolveNegotiationStageIndex(activeStep);

  if (variant === 'stage') {
    return (
      <nav className={cn('w-full', className)} aria-label="协商进度">
        <ol className="flex items-start justify-between gap-0">
          {NEGOTIATION_STAGE_STEPS.map((step, index) => {
            const done = index < activeIndex;
            const current = step.id === activeStep;
            return (
              <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {index > 0 ? (
                    <span
                      className={cn('h-px flex-1', done || current ? 'bg-primary' : 'bg-border')}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                  <StageStepCircle
                    stepNumber={index + 1}
                    done={done}
                    current={current}
                    stepId={step.id}
                  />
                  {index < NEGOTIATION_STAGE_STEPS.length - 1 ? (
                    <span
                      className={cn('h-px flex-1', done ? 'bg-primary' : 'bg-border')}
                      aria-hidden
                    />
                  ) : (
                    <span className="flex-1" aria-hidden />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 px-0.5 text-center text-[10px] leading-tight sm:text-[11px]',
                    current ? 'font-semibold text-primary' : done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav className={cn('w-full', className)} aria-label="协商进度">
      <ol className="flex items-start justify-between gap-1">
        {NEGOTIATION_STAGE_STEPS.map((step, index) => {
          const done = index < activeIndex;
          const current = step.id === activeStep;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <span
                    className={cn('h-0.5 flex-1', done || current ? 'bg-primary' : 'bg-border')}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <CompactStepDot done={done} current={current} stepId={step.id} />
                {index < NEGOTIATION_STAGE_STEPS.length - 1 ? (
                  <span
                    className={cn('h-0.5 flex-1', done ? 'bg-primary' : 'bg-border')}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>
              <span
                className={cn(
                  'mt-1.5 hidden text-center text-[10px] leading-tight sm:block',
                  current ? 'font-medium text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StageStepCircle({
  stepNumber,
  done,
  current,
  stepId,
}: {
  stepNumber: number;
  done: boolean;
  current: boolean;
  stepId: NegotiationStageStepId;
}) {
  return (
    <span
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
        done && 'bg-primary text-primary-foreground',
        current && !done && 'bg-primary text-primary-foreground ring-4 ring-primary/15',
        !done && !current && 'border border-border bg-muted/30 text-muted-foreground',
      )}
      aria-current={current ? 'step' : undefined}
      title={stepId}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : stepNumber}
    </span>
  );
}

function CompactStepDot({
  done,
  current,
  stepId,
}: {
  done: boolean;
  current: boolean;
  stepId: NegotiationStageStepId;
}) {
  return (
    <span
      className={cn(
        'relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2',
        done && 'border-primary bg-primary',
        current && 'border-primary bg-primary/15',
        !done && !current && 'border-muted-foreground/40 bg-background',
        current && 'animate-pulse',
      )}
      aria-current={current ? 'step' : undefined}
      title={stepId}
    >
      {done ? <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" /> : null}
    </span>
  );
}
