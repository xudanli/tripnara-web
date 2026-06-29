/**
 * 决策闭环 Panel：路政 Banner + 判决书 + 弃选表 + 方案对比。
 * 规划气泡：`part="banner"` 在 answer 上方；`part="verdict"` 在 answer 下方。
 */

import { RoadConstraintBanner } from '@/components/decision-closure/RoadConstraintBanner';
import { DecisionVerdictCard } from '@/components/decision-closure/DecisionVerdictCard';
import { RejectedPlansTable } from '@/components/decision-closure/RejectedPlansTable';
import { AlternativesComparisonTable } from '@/components/decision-closure/AlternativesComparisonTable';
import {
  hasAlternativesRows,
  hasDecisionVerdictCard,
  hasRejectedPlansRows,
  panelHasDecisionClosureContent,
  shouldShowRoadBanner,
} from '@/lib/decision-closure-l1';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';
import { cn } from '@/lib/utils';

export type DecisionClosureL1Part = 'banner' | 'verdict' | 'both';

export interface DecisionClosureL1PanelProps {
  optimization?: RouteRunExplainOptimization | null;
  /** 规划气泡：banner 与 verdict+表 分开展示 */
  part?: DecisionClosureL1Part;
  className?: string;
  /** 判决书折叠默认展开 */
  defaultOpen?: boolean;
  /** 弃选表 / 对比表 `<details>` 默认展开（debug 可开） */
  detailsDefaultOpen?: boolean;
  /** @deprecated 使用 detailsDefaultOpen；保留兼容 debugUiDefaults */
  tier?: 'L1' | 'L2';
}

function verdictBlockHasContent(opt: RouteRunExplainOptimization): boolean {
  return (
    hasDecisionVerdictCard(opt) ||
    hasRejectedPlansRows(opt.decision_verdict) ||
    hasAlternativesRows(opt.alternatives) ||
    !!opt.meta_decision_audit?.trim() ||
    !!opt.decision_verdict?.monte_carlo_summary?.total_samples
  );
}

function DecisionClosureVerdictBlock({
  optimization,
  className,
  defaultOpen,
  detailsDefaultOpen,
}: {
  optimization: RouteRunExplainOptimization;
  className?: string;
  defaultOpen?: boolean;
  detailsDefaultOpen?: boolean;
}) {
  if (!verdictBlockHasContent(optimization)) return null;

  return (
    <div className={cn('decision-closure-verdict space-y-2', className)}>
      <DecisionVerdictCard optimization={optimization} defaultOpen={defaultOpen} />
      <RejectedPlansTable
        optimization={optimization}
        defaultOpen={detailsDefaultOpen}
      />
      <AlternativesComparisonTable
        optimization={optimization}
        defaultOpen={detailsDefaultOpen}
      />
    </div>
  );
}

export function DecisionClosureL1Panel({
  optimization,
  part = 'both',
  className,
  defaultOpen,
  detailsDefaultOpen = false,
  tier,
}: DecisionClosureL1PanelProps) {
  const opt = optimization ?? undefined;
  if (!opt) return null;

  const tablesOpen = detailsDefaultOpen ?? tier === 'L2';

  if (part === 'banner') {
    if (!shouldShowRoadBanner(opt.world_constraint_materialization)) return null;
    return (
      <RoadConstraintBanner
        materialization={opt.world_constraint_materialization}
        className={className}
      />
    );
  }

  if (part === 'verdict') {
    return (
      <DecisionClosureVerdictBlock
        optimization={opt}
        className={className}
        defaultOpen={defaultOpen}
        detailsDefaultOpen={tablesOpen}
      />
    );
  }

  if (!panelHasDecisionClosureContent(opt)) return null;

  return (
    <div className={cn('decision-closure-panel space-y-2', className)}>
      <RoadConstraintBanner materialization={opt.world_constraint_materialization} />
      <DecisionClosureVerdictBlock
        optimization={opt}
        defaultOpen={defaultOpen}
        detailsDefaultOpen={tablesOpen}
      />
    </div>
  );
}
