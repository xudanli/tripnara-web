import type {
  PlanningDecisionCluster,
  PlanningDecisionClusterSummary,
  PlanningDecisionDiagnostic,
  PlanningDecisionImpactScope,
  PlanningDecisionPack,
  PlanningDecisionPackOption,
} from '@/dto/frontend-planning-decision-pack.types';

/** 推荐选项：显式 recommended → 否则首项 */
export function pickRecommendedOption(
  options: PlanningDecisionPackOption[] | undefined | null,
): PlanningDecisionPackOption | null {
  if (!options?.length) return null;
  return options.find((option) => option.recommended) ?? options[0] ?? null;
}

/** 拓扑排序决策簇（dependsOn 前置） */
export function sortDecisionClusters<T extends { id: string; dependsOn?: string[] }>(
  clusters: T[],
): T[] {
  if (clusters.length <= 1) return [...clusters];
  const byId = new Map(clusters.map((cluster) => [cluster.id, cluster]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: T[] = [];

  function visit(cluster: T) {
    if (visited.has(cluster.id)) return;
    if (visiting.has(cluster.id)) return;
    visiting.add(cluster.id);
    for (const depId of cluster.dependsOn ?? []) {
      const dep = byId.get(depId);
      if (dep) visit(dep);
    }
    visiting.delete(cluster.id);
    visited.add(cluster.id);
    sorted.push(cluster);
  }

  for (const cluster of clusters) visit(cluster);
  return sorted;
}

export function sortDecisionClusterSummaries(
  summaries: PlanningDecisionClusterSummary[],
): PlanningDecisionClusterSummary[] {
  return sortDecisionClusters(summaries);
}

/** 单选项 impact 摘要行 */
export function summarizeOptionImpact(option: PlanningDecisionPackOption): string[] {
  return summarizeImpactScope(option.impactScope);
}

export function summarizeImpactScope(scope: PlanningDecisionImpactScope | undefined): string[] {
  if (!scope) return [];
  const lines: string[] = [];
  if (scope.scope) lines.push(`范围：${scope.scope}`);
  if (scope.affectedDays?.length) {
    lines.push(`影响第 ${scope.affectedDays.join('、')} 天`);
  }
  if (scope.itemIds?.length) lines.push(`修改 ${scope.itemIds.length} 个行程项`);
  if (scope.candidateIds?.length) lines.push(`涉及 ${scope.candidateIds.length} 个候选`);
  if (scope.placeIds?.length) lines.push(`涉及 ${scope.placeIds.length} 个地点`);
  return lines;
}

/** decisionPack 内诊断总数 */
export function diagnosticCountFromPack(pack: PlanningDecisionPack | null | undefined): number {
  if (pack?.diagnostics?.length) return pack.diagnostics.length;
  if (!pack?.decisionClusters?.length) return 0;
  return pack.decisionClusters.reduce((sum, cluster) => sum + (cluster.diagnosticCount ?? 0), 0);
}

export function isTripConflictsOption(option: PlanningDecisionPackOption): boolean {
  return option.action?.payload?.source === 'trip_conflicts';
}

export function optionKindLabel(kind: string): string {
  switch (String(kind).toUpperCase()) {
    case 'SHIFT_EARLIER':
      return '提前出发';
    case 'SHORTEN_STAY':
      return '缩短停留';
    case 'SHIFT_LATER':
      return '顺延行程';
    case 'ACCEPT_RISK':
      return '保持原计划';
    default:
      return kind;
  }
}

export interface TripConflictDiagnosticInput {
  id: string;
  title: string;
  message?: string;
  dayIndex?: number | null;
  priority?: string;
}

function severityFromPriority(priority?: string): PlanningDecisionDiagnostic['severity'] {
  if (priority === 'must_handle') return 'block';
  if (priority === 'suggest_adjust') return 'warn';
  return 'info';
}

function diagnosticKey(item: { id: string; conflictId?: string }): string {
  return item.conflictId ?? item.id;
}

/**
 * 合并 decisionPack.diagnostics 与 GET /trips/:id/conflicts；
 * pack 项优先，冲突项按 conflictId/id 去重补全。
 */
export function mergeDiagnosticsWithTripConflicts(
  packDiagnostics: PlanningDecisionDiagnostic[] | undefined,
  tripConflicts: TripConflictDiagnosticInput[] | undefined,
): PlanningDecisionDiagnostic[] {
  const merged = new Map<string, PlanningDecisionDiagnostic>();

  for (const diagnostic of packDiagnostics ?? []) {
    merged.set(diagnosticKey(diagnostic), diagnostic);
  }

  for (const conflict of tripConflicts ?? []) {
    const key = diagnosticKey({ id: conflict.id, conflictId: conflict.id });
    if (merged.has(key)) continue;
    merged.set(key, {
      id: conflict.id,
      conflictId: conflict.id,
      source: 'trip_conflicts',
      title: conflict.title,
      message: conflict.message,
      dayIndex: conflict.dayIndex ?? undefined,
      severity: severityFromPriority(conflict.priority),
    });
  }

  return [...merged.values()];
}

export function mergePackDiagnosticsWithTripConflicts(
  pack: PlanningDecisionPack | null | undefined,
  tripConflicts: TripConflictDiagnosticInput[] | undefined,
): PlanningDecisionDiagnostic[] {
  return mergeDiagnosticsWithTripConflicts(pack?.diagnostics, tripConflicts);
}

export function clusterDiagnosticTotal(
  clusters: PlanningDecisionCluster[] | PlanningDecisionClusterSummary[] | undefined,
): number {
  if (!clusters?.length) return 0;
  return clusters.reduce((sum, cluster) => sum + (cluster.diagnosticCount ?? 0), 0);
}
