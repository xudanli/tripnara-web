import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { DecisionGuardianWarningBanner } from '@/components/decision-problems/decision-space/DecisionGuardianWarningBanner';
import { CausalStoryFactorList } from '@/components/decision-problems/decision-space/CausalStoryFactorList';
import type { ExecuteCausalInsightView } from '@/lib/execute-causal-insight.util';

export interface ExecuteCausalInsightPanelProps {
  insight: ExecuteCausalInsightView | null;
  loading?: boolean;
  className?: string;
}

/** 行中 · 强风/风险因果链（复用规划阶段 stepper） */
export function ExecuteCausalInsightPanel({
  insight,
  loading = false,
  className,
}: ExecuteCausalInsightPanelProps) {
  if (loading && !insight) {
    return (
      <div className={cn('flex items-center justify-center gap-2 py-6 text-[10px] text-muted-foreground', className)}>
        <Spinner className="h-3.5 w-3.5" />
        正在加载因果链…
      </div>
    );
  }

  if (!insight) return null;

  const chain = insight.causalStory.chain ?? [];

  return (
    <div className={cn('space-y-2', className)}>
      <DecisionGuardianWarningBanner
        className="rounded-md px-2 py-1.5"
        headline={insight.guardianHeadline}
        primaryEnforcement={insight.primaryEnforcement}
      />

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-[10px] text-muted-foreground">
          <Spinner className="h-3 w-3" />
          刷新因果链…
        </div>
      ) : null}

      {chain.length ? (
        <CausalStoryFactorList
          className="px-0.5"
          nodes={chain}
          trailingStep={insight.trailingStep}
        />
      ) : null}

      {insight.isDemo ? (
        <p className="text-[9px] text-muted-foreground">演示数据 · 当前无 BFF causalInsight</p>
      ) : null}
    </div>
  );
}
