import { cn } from '@/lib/utils';
import type { CausalStoryChainNode } from '@/types/causal-trace';

export interface CausalStoryStepItem {
  key: string;
  label: string;
  description: string;
}

export function resolveCausalStoryNodeLabel(node: CausalStoryChainNode): string {
  const title = node.title?.trim();
  const type = node.type?.trim();
  if (title && title.length <= 12) return title;
  if (type === 'WEATHER') return '天气影响';
  if (type === 'TRAVEL_TIME' || type === 'ROUTE') return '通行耗时';
  if (type === 'RESERVATION' || type === 'BOOKING') return '预约风险';
  if (type === 'RISK') return '风险';
  if (type === 'DECISION' || type === 'CONFLICT') return '决策冲突';
  return title?.slice(0, 12) ?? '因果因子';
}

function CausalStoryStepperRow({
  label,
  description,
  isLast,
}: {
  label: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <div className="flex w-3 shrink-0 flex-col items-center">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/55" aria-hidden />
        {!isLast ? <span className="my-0.5 w-px flex-1 min-h-3 bg-border/80" aria-hidden /> : null}
      </div>
      <div className={cn('min-w-0 flex-1', isLast ? 'pb-0' : 'pb-3')}>
        <p className="text-[11px] leading-snug text-foreground">{description}</p>
        <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export interface CausalStoryFactorListProps {
  nodes: CausalStoryChainNode[];
  /** 链末追加一步（如系统建议），与设计稿「决策冲突」节点同类 */
  trailingStep?: { label: string; description: string } | null;
  className?: string;
}

/**
 * 因果链 · 设计稿竖向 stepper
 * 结论 toast 在上；此处仅展示「事实 → 标签」逐步推导，无阴影、无卡片框
 */
export function CausalStoryFactorList({
  nodes,
  trailingStep,
  className,
}: CausalStoryFactorListProps) {
  const steps: CausalStoryStepItem[] = nodes
    .map((node) => {
      const description = (node.description || node.title).trim();
      if (!description) return null;
      return {
        key: node.nodeId,
        label: resolveCausalStoryNodeLabel(node),
        description,
      };
    })
    .filter(Boolean) as CausalStoryStepItem[];

  if (trailingStep?.description.trim()) {
    steps.push({
      key: 'trailing-intervention',
      label: trailingStep.label,
      description: trailingStep.description.trim(),
    });
  }

  if (!steps.length) return null;

  return (
    <div className={cn('pt-0.5', className)}>
      {steps.map((step, index) => (
        <CausalStoryStepperRow
          key={step.key}
          label={step.label}
          description={step.description}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
