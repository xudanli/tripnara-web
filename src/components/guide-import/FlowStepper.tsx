import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exploreUi } from '@/features/exploration/explore-ui';

export interface FlowStepItem {
  id: string;
  label: string;
}

interface FlowStepperProps {
  steps: readonly FlowStepItem[];
  currentStepId: string;
  /** 无障碍：nav 的 aria-label */
  navLabel: string;
  className?: string;
  compact?: boolean;
}

export function flowStepIndex(steps: readonly FlowStepItem[], currentStepId: string): number {
  const idx = steps.findIndex((s) => s.id === currentStepId);
  return idx >= 0 ? idx : 0;
}

export function FlowStepper({ steps, currentStepId, navLabel, className, compact }: FlowStepperProps) {
  const stepIdx = flowStepIndex(steps, currentStepId);

  return (
    <nav aria-label={navLabel} className={cn('overflow-x-auto', className)}>
      <ol className="flex items-center gap-1 min-w-max list-none p-0 m-0">
        {steps.map((step, idx) => {
          const done = idx < stepIdx;
          const active = idx === stepIdx;
          const stepStatus = done ? '已完成' : active ? '当前步骤' : '待完成';
          return (
            <li key={step.id} className="flex items-center" aria-current={active ? 'step' : undefined}>
              <div
                className={cn(
                  'flex items-center gap-2 px-2 py-1 rounded-lg whitespace-nowrap',
                  compact ? 'text-[11px]' : 'text-xs',
                  active && exploreUi.stepActive,
                  done && exploreUi.stepDone,
                  !active && !done && exploreUi.stepPending,
                )}
                aria-label={`第 ${idx + 1} 步：${step.label}（${stepStatus}）`}
              >
                <span
                  className={cn(
                    'rounded-full flex items-center justify-center font-semibold border flex-shrink-0',
                    compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]',
                    active && exploreUi.stepDotActive,
                    done && exploreUi.stepDotDone,
                    !active && !done && exploreUi.stepDotPending,
                  )}
                  aria-hidden
                >
                  {done ? <Check className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> : idx + 1}
                </span>
                <span className={cn(active && exploreUi.stepUnderline)} aria-hidden>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn('h-px bg-border flex-shrink-0', compact ? 'w-4 mx-0.5' : 'w-6 mx-0.5')}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only">
        当前位于第 {stepIdx + 1} 步，共 {steps.length} 步：{steps[stepIdx]?.label}
      </p>
    </nav>
  );
}
