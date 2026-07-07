import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  buildPlanDiffView,
  type PlanDiffCounterfactualRowInput,
} from '@/lib/decision-space-plan-diff-view.util';
import type { PlanningDecisionImpactScope } from '@/dto/frontend-planning-decision-pack.types';
import { planDiffViewFromInspector } from '@/lib/planning-decision-inspector-adapter.util';
import type { PlanningDecisionInspectorPlanDiff } from '@/dto/frontend-planning-decision-inspector.types';
import type { GatewayDecisionPreviewResult } from '@/lib/unified-gateway-response.util';
import type { ItineraryDiffEntry } from '@/types/feasibility-repair';
import { DecisionCheckerEmpty } from '@/components/plan-studio/workbench/decision-checker/decision-checker-ui';
import { DecisionSpaceNumberedSection } from './decision-space-tab-ui';
import { PlanDiffComparisonTable } from './PlanDiffComparisonTable';
import { PlanDiffDualTimeline } from './PlanDiffDualTimeline';
import { PlanDiffScopeChips, PlanDiffUnchangedList } from './PlanDiffScopeChips';

export interface DecisionSpacePlanDiffPanelProps {
  preview?: GatewayDecisionPreviewResult | null;
  itineraryDiff?: ItineraryDiffEntry[];
  mutationLines?: string[];
  comparison?: { before: string; after: string };
  optionLetter?: string;
  optionTitle?: string;
  /** decision-inspector.planDiff — BFF 优先于 preview 拼装 */
  inspectorPlanDiff?: PlanningDecisionInspectorPlanDiff | null;
  /** BFF tabEmptyState.planDiff — 禁止 fixture 占位 */
  tabEmpty?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  /** 带 optionId 的 inspector 内联 preview 较慢时的提示 */
  loadingMessage?: string;
  /** BFF planDiff 缺失时 — decisionPack.counterfactualRows 降级 */
  counterfactualRows?: PlanDiffCounterfactualRowInput[];
  impactScope?: PlanningDecisionImpactScope;
  unchangedHints?: string[];
  className?: string;
}

/** 决策检查器 · 计划差异 Tab */
export function DecisionSpacePlanDiffPanel({
  preview,
  itineraryDiff,
  mutationLines = [],
  comparison,
  optionLetter = 'A',
  optionTitle,
  inspectorPlanDiff,
  tabEmpty = false,
  emptyMessage,
  loading = false,
  loadingMessage = '正在计算计划差异，复杂行程约需 20–25 秒…',
  counterfactualRows,
  impactScope,
  unchangedHints,
  className,
}: DecisionSpacePlanDiffPanelProps) {
  const view = useMemo(() => {
    if (tabEmpty) return null;
    if (inspectorPlanDiff?.changeRows?.length) {
      return planDiffViewFromInspector(inspectorPlanDiff, optionLetter);
    }
    return buildPlanDiffView({
      preview,
      itineraryDiff,
      mutationLines,
      comparison,
      optionLetter,
      optionTitle,
      counterfactualRows,
      impactScope,
      unchangedHints,
    });
  }, [
    tabEmpty,
    inspectorPlanDiff,
    preview,
    itineraryDiff,
    mutationLines,
    comparison,
    optionLetter,
    optionTitle,
    counterfactualRows,
    impactScope,
    unchangedHints,
  ]);

  if (loading && !view) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <DecisionCheckerEmpty>{loadingMessage}</DecisionCheckerEmpty>
      </div>
    );
  }

  if (tabEmpty || !view) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '请先选择方案'}
      </DecisionCheckerEmpty>
    );
  }

  if (!view.changes.length && !view.timelines.length && !view.scopeChips.length) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '当前方案暂无可展示的计划差异。'}
      </DecisionCheckerEmpty>
    );
  }

  const sectionBadge = view.optionBadge ?? `方案 ${view.optionLetter}`;
  const sectionSubtitle = view.optionTitle?.trim();

  return (
    <div className={cn('space-y-2 rounded-lg border border-border/60 bg-card p-2', className)}>
      <DecisionSpaceNumberedSection
        compact
        index={1}
        title={`将写入的变更 · ${sectionBadge}`}
        subtitle={sectionSubtitle}
      >
        <PlanDiffComparisonTable compact rows={view.changes} />
      </DecisionSpaceNumberedSection>

      <DecisionSpaceNumberedSection compact index={2} title="影响范围">
        <PlanDiffScopeChips compact chips={view.scopeChips} />
      </DecisionSpaceNumberedSection>

      <DecisionSpaceNumberedSection compact index={3} title="不会变化">
        <PlanDiffUnchangedList compact items={view.unchangedItems} />
      </DecisionSpaceNumberedSection>

      <DecisionSpaceNumberedSection compact index={4} title="前后时间轴对比">
        <PlanDiffDualTimeline compact optionLetter={view.optionLetter} tracks={view.timelines} />
      </DecisionSpaceNumberedSection>

      {view.summaryLine ? (
        <footer className="rounded-md border border-gate-allow-border/50 bg-gate-allow/10 px-2 py-1.5 text-center text-[10px] font-medium leading-snug text-gate-allow-foreground">
          {view.summaryLine}
        </footer>
      ) : null}
    </div>
  );
}
