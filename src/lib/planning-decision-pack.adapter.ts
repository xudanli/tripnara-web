import type { DecisionQueueCluster, DecisionQueueProcessingKind } from '@/lib/decision-queue-cluster.util';
import type { DecisionSpaceResultLayers } from '@/lib/decision-space-result-card.util';
import type {
  PlanningDecisionCluster,
  PlanningDecisionClusterSummary,
  PlanningDecisionCounterfactualRow,
  PlanningDecisionExecutionStep,
  PlanningDecisionPack,
  PlanningDecisionPackOption,
} from '@/types/planning-decision-pack';
import { summarizeOptionImpact } from '@/dto/frontend-planning-decision-card.util';
import type { DecisionWriteBackStep } from '@/lib/decision-write-back-steps.util';

const PROCESSING_KIND_MAP: Record<string, DecisionQueueProcessingKind> = {
  must_confirm: 'must_confirm',
  batchable: 'batchable',
  auto_fixable: 'auto_fixable',
  depends_on: 'depends_on',
  may_auto_resolve: 'may_auto_resolve',
};

function processingKindFromLabel(label?: string): DecisionQueueProcessingKind {
  if (!label) return 'must_confirm';
  if (/自动|AI/i.test(label)) return 'auto_fixable';
  if (/批量/i.test(label)) return 'batchable';
  if (/依赖/i.test(label)) return 'depends_on';
  if (/消失|连带/i.test(label)) return 'may_auto_resolve';
  return 'must_confirm';
}

export function resultLayersFromPlanningOption(
  option: PlanningDecisionPackOption,
): DecisionSpaceResultLayers {
  const normalizedKind = String(option.optionKind).toUpperCase();
  const systemJudgment =
    option.systemJudgment ??
    (normalizedKind === 'ACCEPT_RISK'
      ? '保留原计划将承担上述风险；系统会持续监控条件变化。'
      : undefined);

  return {
    outcomes: option.outcomes ?? [],
    costs: option.costs ?? [],
    impactScope: summarizeOptionImpact(option),
    systemJudgment,
  };
}

export function writeBackStepsFromExecutionSteps(
  steps: PlanningDecisionExecutionStep[] | undefined,
): DecisionWriteBackStep[] {
  if (!steps?.length) return [];
  return steps.map((step) => ({
    id: step.id,
    label: step.label,
    status: step.status === 'failed' ? 'failed' : step.status === 'done' ? 'done' : step.status,
  }));
}

function clusterFromPlanningCluster(cluster: PlanningDecisionCluster): DecisionQueueCluster {
  const processingKind =
    PROCESSING_KIND_MAP[String(cluster.processingKind ?? '').toLowerCase()] ??
    processingKindFromLabel(cluster.processingLabel);

  const representative =
    cluster.options.find((option) => option.recommended) ?? cluster.options[0];
  const problemIds = cluster.options.map((option) => option.id);

  return {
    id: cluster.id,
    title: cluster.title,
    dayBadge: cluster.dayNumbers?.length ? `第 ${cluster.dayNumbers.join('、')} 天` : null,
    dayNumbers: cluster.dayNumbers ?? [],
    problemIds: problemIds.length ? problemIds : [cluster.decisionId],
    representativeProblemId: representative?.id ?? cluster.decisionId,
    problems: [],
    processingKind,
    processingLabel: cluster.processingLabel ?? '必须确认',
    dependencies: (cluster.dependsOn ?? []).map((depId) => ({
      kind: 'depends_on' as const,
      label: `依赖：${depId}`,
      targetClusterId: depId,
    })),
    mayResolveCount: cluster.resolvesCount ?? Math.max(0, cluster.diagnosticCount - 1),
  };
}

function clusterFromSummary(summary: PlanningDecisionClusterSummary): DecisionQueueCluster {
  return {
    id: summary.id,
    title: summary.title,
    dayBadge: summary.dayNumbers?.length ? `第 ${summary.dayNumbers.join('、')} 天` : null,
    dayNumbers: summary.dayNumbers ?? [],
    problemIds: summary.representativeOptionId ? [summary.representativeOptionId] : [summary.id],
    representativeProblemId: summary.representativeOptionId ?? summary.decisionId ?? summary.id,
    problems: [],
    processingKind: processingKindFromLabel(summary.processingLabel),
    processingLabel: summary.processingLabel ?? '必须确认',
    dependencies: (summary.dependsOn ?? []).map((depId) => ({
      kind: 'depends_on' as const,
      label: `依赖：第 ${depId} 天需先确认`,
      targetClusterId: depId,
    })),
    mayResolveCount: summary.resolvesCount ?? 0,
  };
}

/** P1 BFF decisionClusters → 工作台队列簇 */
export function decisionQueueClustersFromPlanningPack(
  pack: PlanningDecisionPack | null | undefined,
): DecisionQueueCluster[] | null {
  if (!pack?.decisionClusters?.length) return null;
  return pack.decisionClusters.map(clusterFromPlanningCluster);
}

export function decisionQueueClustersFromSummaries(
  summaries: PlanningDecisionClusterSummary[] | undefined,
): DecisionQueueCluster[] | null {
  if (!summaries?.length) return null;
  return summaries.map(clusterFromSummary);
}

export function diagnosticCountFromPack(pack: PlanningDecisionPack | null | undefined): number {
  if (pack?.diagnostics?.length) return pack.diagnostics.length;
  if (!pack?.decisionClusters?.length) return 0;
  return pack.decisionClusters.reduce((sum, cluster) => sum + (cluster.diagnosticCount ?? 0), 0);
}

export { isTripConflictsOption, optionKindLabel } from '@/dto/frontend-planning-decision-card.util';

export function counterfactualTableFromRows(
  rows: PlanningDecisionCounterfactualRow[] | undefined,
): Array<{ label: string; before: string; after: string }> {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    label: row.label,
    before: row.before,
    after: row.after,
  }));
}
