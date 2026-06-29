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
}

export function CollabNegotiationProgressTimeline({
  task,
  detail,
  className,
}: CollabNegotiationProgressTimelineProps) {
  const activeStep = resolveNegotiationStageStep(task, detail);
  const activeIndex = resolveNegotiationStageIndex(activeStep);

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
                    className={cn(
                      'h-0.5 flex-1',
                      done || current ? 'bg-primary' : 'bg-border',
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
                <StepDot done={done} current={current} stepId={step.id} />
                {index < NEGOTIATION_STAGE_STEPS.length - 1 ? (
                  <span
                    className={cn(
                      'h-0.5 flex-1',
                      done ? 'bg-primary' : 'bg-border',
                    )}
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

function StepDot({
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
