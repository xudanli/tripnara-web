import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { phaseDisplayLabel } from '@/lib/route-run-async';
import { usePlanningTaskStore } from '@/store/planningTaskStore';
import { Loader2 } from 'lucide-react';

const PIPELINE_STEPS = [
  { key: 'INTENT_COMPILE', label: '意图编译' },
  { key: 'INTAKE', label: '需求接入' },
  { key: 'RESEARCH', label: '数据调研' },
  { key: 'POI_SELECTION', label: '兴趣点选择' },
  { key: 'GATE_EVAL', label: '门禁评估' },
  { key: 'PLAN_GEN', label: '方案生成' },
  { key: 'VERIFY', label: '可执行性验证' },
  { key: 'NARRATE', label: '决策叙事' },
] as const;

function stepIndexForPhase(phase: string): number {
  const upper = phase.trim().toUpperCase();
  let idx = -1;
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    if (PIPELINE_STEPS[i].key === upper || upper.includes(PIPELINE_STEPS[i].key)) {
      idx = i;
    }
  }
  return idx;
}

export type PlanningPipelineProgressProps = {
  className?: string;
  compact?: boolean;
  /** 不传则从全局 store 读取 */
  message?: string;
  currentPhase?: string;
  progressPercentage?: number;
};

export function PlanningPipelineProgress({
  className,
  compact = false,
  message: messageProp,
  currentPhase: phaseProp,
  progressPercentage: progressProp,
}: PlanningPipelineProgressProps) {
  const store = usePlanningTaskStore();
  const message = messageProp ?? store.message;
  const currentPhase = phaseProp ?? store.currentPhase;
  const progressPercentage = progressProp ?? store.progressPercentage;
  const activeIdx = stepIndexForPhase(currentPhase);
  const phaseLabel = phaseDisplayLabel(currentPhase);

  const pct = Math.min(100, Math.max(0, Math.round(progressPercentage || 0)));

  return (
    <div
      className={cn('rounded-lg border border-border/60 bg-muted/30', compact ? 'p-2' : 'p-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-start gap-2">
        <Loader2 className={cn('shrink-0 text-primary animate-spin', compact ? 'h-3.5 w-3.5 mt-0.5' : 'h-4 w-4 mt-0.5')} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className={cn('text-foreground/90', compact ? 'text-xs' : 'text-sm')}>
            {message?.trim() || phaseLabel || '规划师正在处理…'}
            {pct > 0 ? <span className="text-muted-foreground"> · {pct}%</span> : null}
          </p>
          <Progress value={pct} className={cn('h-1.5', compact && 'h-1')} />
          {!compact ? (
            <ul className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
              {PIPELINE_STEPS.filter(
                (s, i, arr) => arr.findIndex((x) => x.label === s.label) === i
              ).map((step, i) => {
                const done = activeIdx >= 0 && i < activeIdx;
                const active =
                  activeIdx >= 0 &&
                  (PIPELINE_STEPS[activeIdx]?.label === step.label ||
                    PIPELINE_STEPS[activeIdx]?.key === step.key);
                return (
                  <li
                    key={step.key}
                    className={cn(
                      done && 'text-foreground/70',
                      active && 'font-medium text-primary'
                    )}
                  >
                    {done ? '✓ ' : active ? '⊙ ' : '○ '}
                    {step.label}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
