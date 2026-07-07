import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanGatePipelineStep } from '@/types/plan-gate';
import { planGateCard, planGateSectionTitle } from '../plan-gate-ui';
import { WorkbenchCtreProgressBand } from '@/features/agent/ctre';

const FALLBACK_PIPELINE = [
  '合并决策结果',
  '重排行程结构',
  '计算路线与时间',
  '检查预算与成员',
  '执行提交前验证',
] as const;

export interface PlanGateGeneratingStepProps {
  loadingStage?: string;
  pipelineSteps?: PlanGatePipelineStep[];
  tripId?: string;
}

function resolveStepUiStatus(status: PlanGatePipelineStep['status']) {
  switch (status) {
    case 'completed':
      return { icon: 'done' as const, label: '已完成' };
    case 'running':
      return { icon: 'active' as const, label: '进行中' };
    case 'failed':
      return { icon: 'pending' as const, label: '失败' };
    default:
      return { icon: 'pending' as const, label: '等待中' };
  }
}

export function PlanGateGeneratingStep({
  loadingStage,
  pipelineSteps = [],
  tripId,
}: PlanGateGeneratingStepProps) {
  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    if (pipelineSteps.length > 0) return;
    const timer = window.setInterval(() => {
      setFallbackIndex((prev) => Math.min(prev + 1, FALLBACK_PIPELINE.length - 1));
    }, 2800);
    return () => window.clearInterval(timer);
  }, [pipelineSteps.length]);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className={planGateCard}>
        <h3 className={planGateSectionTitle}>正在生成方案草案</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {loadingStage || '系统正在合并决策并构建完整行程…'}
        </p>

        <ol className="mt-4 space-y-2">
          {pipelineSteps.length > 0
            ? pipelineSteps.map((step, index) => {
                const ui = resolveStepUiStatus(step.status);
                return (
                  <li
                    key={`${step.id}-${index}`}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                      ui.icon === 'done' && 'border-border/40 bg-muted/15 text-muted-foreground',
                      ui.icon === 'active' && 'border-primary/25 bg-primary/5 text-foreground',
                      ui.icon === 'pending' && 'border-border/30 bg-background text-muted-foreground/60',
                    )}
                  >
                    {ui.icon === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground" />
                    ) : ui.icon === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span className="font-medium">{index + 1}.</span>
                    <span>{step.label}</span>
                    <span className="ml-auto text-[10px]">{ui.label}</span>
                  </li>
                );
              })
            : FALLBACK_PIPELINE.map((label, index) => {
                const icon =
                  index < fallbackIndex ? 'done' : index === fallbackIndex ? 'active' : 'pending';
                const statusLabel =
                  index < fallbackIndex ? '已完成' : index === fallbackIndex ? '进行中' : '等待中';
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                      icon === 'done' && 'border-border/40 bg-muted/15 text-muted-foreground',
                      icon === 'active' && 'border-primary/25 bg-primary/5 text-foreground',
                      icon === 'pending' && 'border-border/30 bg-background text-muted-foreground/60',
                    )}
                  >
                    {icon === 'done' ? (
                      <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground" />
                    ) : icon === 'active' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span className="font-medium">{index + 1}.</span>
                    <span>{label}</span>
                    <span className="ml-auto text-[10px]">{statusLabel}</span>
                  </li>
                );
              })}
        </ol>
      </div>

      {tripId ? (
        <WorkbenchCtreProgressBand tripId={tripId} active className="mt-2" />
      ) : null}
    </div>
  );
}
