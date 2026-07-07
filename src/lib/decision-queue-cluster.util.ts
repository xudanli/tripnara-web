import { resolveDecisionSpaceProblemTemplate } from '@/lib/decision-space-problem-template.util';
import {
  inferDecisionProblemScope,
  isGenericTravelBufferTitle,
} from '@/lib/decision-problem-queue-context.util';
import { resolveDecisionProblemQueueDisplay } from '@/lib/decision-problem-queue-display.util';
import type { DecisionProblemSummary } from '@/types/decision-problem';

export type DecisionQueueProcessingKind =
  | 'must_confirm'
  | 'batchable'
  | 'auto_fixable'
  | 'depends_on'
  | 'may_auto_resolve';

export interface DecisionQueueClusterDependency {
  kind: 'depends_on' | 'affects' | 'may_resolve';
  label: string;
  targetClusterId?: string;
}

export interface DecisionQueueCluster {
  id: string;
  title: string;
  dayBadge: string | null;
  dayNumbers: number[];
  problemIds: string[];
  representativeProblemId: string;
  problems: DecisionProblemSummary[];
  processingKind: DecisionQueueProcessingKind;
  processingLabel: string;
  dependencies: DecisionQueueClusterDependency[];
  /** 处理本决策后预计可连带解决的同源问题数 */
  mayResolveCount: number;
}

const PROCESSING_LABEL: Record<DecisionQueueProcessingKind, string> = {
  must_confirm: '必须确认',
  batchable: '可批量处理',
  auto_fixable: '可由 AI 自动修正',
  depends_on: '依赖其他决策',
  may_auto_resolve: '上游调整后可能消失',
};

const CLUSTER_TITLE_BY_KIND: Record<string, string> = {
  route: '路线与转场',
  daily_load: '当日节奏与时间压力',
  reservation: '预约与门控',
  weather: '天气与安全',
  generic: '行程调整',
};

function primaryDay(problem: DecisionProblemSummary): number {
  const display = resolveDecisionProblemQueueDisplay(problem);
  return display.dayNumbers[0] ?? problem.affectedDayNumbers?.[0] ?? 999;
}

function clusterKindKey(problem: DecisionProblemSummary): string {
  const template = resolveDecisionSpaceProblemTemplate({ problem }).kind;
  const title = problem.title.trim();
  if (isGenericTravelBufferTitle(title) || /缓冲|节奏|时间压力/u.test(title)) {
    return 'daily_load';
  }
  return template;
}

function clusterTitle(dayNumbers: number[], kind: string, problems: DecisionProblemSummary[]): string {
  const kindLabel = CLUSTER_TITLE_BY_KIND[kind] ?? CLUSTER_TITLE_BY_KIND.generic;
  const day = dayNumbers[0];
  if (day && day < 999) {
    return `第 ${day} 天 · ${kindLabel}`;
  }
  if (problems.length === 1) {
    return resolveDecisionProblemQueueDisplay(problems[0]!).issueTitle;
  }
  return kindLabel;
}

function inferProcessingKind(problem: DecisionProblemSummary, groupSize: number): DecisionQueueProcessingKind {
  const enforcement = String(problem.primaryEnforcement ?? '').toUpperCase();
  const executionMode = String(problem.actionability?.executionMode ?? '').toUpperCase();
  const workflow = String(problem.workflowStatus ?? problem.status ?? '').toUpperCase();

  if (workflow.includes('WAIT') || workflow.includes('BLOCKED')) return 'depends_on';
  if (executionMode === 'AUTO') return 'auto_fixable';
  if (enforcement === 'BLOCK' || enforcement === 'REQUIRE_CONFIRMATION') return 'must_confirm';
  if (groupSize >= 2 && (enforcement === 'WARN' || enforcement === 'REQUIRE_ADJUSTMENT')) {
    return 'batchable';
  }
  if (enforcement === 'INFORM' || enforcement === 'ADVISORY') return 'may_auto_resolve';
  return 'must_confirm';
}

function buildDependencies(
  cluster: Omit<DecisionQueueCluster, 'dependencies' | 'mayResolveCount'>,
  allClusters: Omit<DecisionQueueCluster, 'dependencies' | 'mayResolveCount'>[],
): DecisionQueueClusterDependency[] {
  const deps: DecisionQueueClusterDependency[] = [];
  const day = cluster.dayNumbers[0];

  if (day && day > 1) {
    const priorDay = allClusters.find(
      (other) =>
        other.id !== cluster.id &&
        other.dayNumbers[0] === day - 1 &&
        other.processingKind === 'must_confirm',
    );
    if (priorDay) {
      deps.push({
        kind: 'depends_on',
        label: `依赖：${priorDay.title}需先确认`,
        targetClusterId: priorDay.id,
      });
    }
  }

  const sameDayBuffer = allClusters.find(
    (other) =>
      other.id !== cluster.id &&
      other.dayNumbers[0] === day &&
      other.title.includes('节奏') &&
      cluster.title.includes('预约'),
  );
  if (sameDayBuffer) {
    deps.push({
      kind: 'affects',
      label: '会影响：当日午餐到达时间',
      targetClusterId: sameDayBuffer.id,
    });
  }

  if (cluster.problems.length >= 2) {
    deps.push({
      kind: 'may_resolve',
      label: `可能连带解决 ${cluster.problems.length - 1} 项同源问题`,
    });
  }

  return deps.slice(0, 3);
}

function pickRepresentative(problems: DecisionProblemSummary[]): DecisionProblemSummary {
  const score = (item: DecisionProblemSummary) => {
    switch (item.primaryEnforcement) {
      case 'BLOCK':
        return 0;
      case 'REQUIRE_ADJUSTMENT':
        return 1;
      case 'REQUIRE_CONFIRMATION':
        return 2;
      default:
        return 3;
    }
  };
  return [...problems].sort((a, b) => score(a) - score(b))[0]!;
}

/** 将同源 open 问题合并为可处理决策集合（客户端投影；BFF cluster SSOT 就绪后替换） */
export function clusterDecisionProblemsForQueue(
  problems: DecisionProblemSummary[],
): DecisionQueueCluster[] {
  const open = problems.filter(
    (problem) => problem.status !== 'RESOLVED' && problem.status !== 'DISMISSED',
  );
  if (!open.length) return [];

  const groups = new Map<string, DecisionProblemSummary[]>();
  for (const problem of open) {
    const day = primaryDay(problem);
    const kind = clusterKindKey(problem);
    const key = day < 999 ? `day-${day}-${kind}` : `kind-${kind}-${problem.id}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(problem);
    groups.set(key, bucket);
  }

  const baseClusters = [...groups.entries()].map(([id, grouped]) => {
    const dayNumbers = [
      ...new Set(grouped.flatMap((p) => inferDecisionProblemScope(p).affectedDayNumbers ?? [])),
    ].sort((a, b) => a - b);
    const representative = pickRepresentative(grouped);
    const kind = clusterKindKey(representative);
    const processingKind = inferProcessingKind(representative, grouped.length);

    return {
      id,
      title: clusterTitle(dayNumbers, kind, grouped),
      dayBadge: dayNumbers.length ? `第 ${dayNumbers.join('、')} 天` : null,
      dayNumbers,
      problemIds: grouped.map((p) => p.id),
      representativeProblemId: representative.id,
      problems: grouped,
      processingKind,
      processingLabel: PROCESSING_LABEL[processingKind],
    };
  });

  baseClusters.sort((a, b) => {
    const dayA = a.dayNumbers[0] ?? 999;
    const dayB = b.dayNumbers[0] ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return a.title.localeCompare(b.title, 'zh');
  });

  return baseClusters.map((cluster) => ({
    ...cluster,
    dependencies: buildDependencies(cluster, baseClusters),
    mayResolveCount: Math.max(0, cluster.problems.length - 1),
  }));
}

function primaryDayForProblem(problem: DecisionProblemSummary): number {
  const display = resolveDecisionProblemQueueDisplay(problem);
  return display.dayNumbers[0] ?? problem.affectedDayNumbers?.[0] ?? 999;
}

function openProblems(items: DecisionProblemSummary[]): DecisionProblemSummary[] {
  return items.filter(
    (problem) => problem.status !== 'RESOLVED' && problem.status !== 'DISMISSED',
  );
}

function problemsForBffCluster(
  bff: DecisionQueueCluster,
  items: DecisionProblemSummary[],
): DecisionProblemSummary[] {
  const open = openProblems(items);
  if (!open.length) return [];

  const byIds = open.filter((problem) => bff.problemIds.includes(problem.id));
  if (byIds.length) return byIds;

  const day = bff.dayNumbers[0];
  if (day != null && day < 999) {
    const sameDay = open.filter((problem) => primaryDayForProblem(problem) === day);
    if (sameDay.length) return sameDay;
  }

  return [];
}

function mergeClusterPair(
  bff: DecisionQueueCluster,
  client: DecisionQueueCluster | undefined,
  items: DecisionProblemSummary[],
): DecisionQueueCluster {
  const problems =
    bff.problems.length > 0
      ? bff.problems
      : client?.problems.length
        ? client.problems
        : problemsForBffCluster(bff, items);

  const problemIds = problems.length
    ? problems.map((problem) => problem.id)
    : bff.problemIds.length
      ? bff.problemIds
      : client?.problemIds ?? [bff.representativeProblemId];

  const representativeProblemId =
    problems.find((problem) => problem.id === bff.representativeProblemId)?.id ??
    client?.representativeProblemId ??
    problems[0]?.id ??
    bff.representativeProblemId;

  const mayResolveCount = Math.max(
    bff.mayResolveCount,
    client?.mayResolveCount ?? 0,
    Math.max(0, problemIds.length - 1),
  );

  const dependencies =
    bff.dependencies.length > 0
      ? bff.dependencies
      : client?.dependencies ?? [];

  return {
    ...bff,
    title: bff.title || client?.title || bff.title,
    dayBadge: bff.dayBadge ?? client?.dayBadge ?? null,
    dayNumbers: bff.dayNumbers.length ? bff.dayNumbers : (client?.dayNumbers ?? []),
    problems,
    problemIds,
    representativeProblemId,
    processingKind: bff.processingKind ?? client?.processingKind ?? 'must_confirm',
    processingLabel: bff.processingLabel || client?.processingLabel || '必须确认',
    dependencies,
    mayResolveCount,
  };
}

/**
 * BFF decisionClusters + 客户端 open problems → 设计稿队列结构。
 * BFF 提供标题/处理类型/依赖；子问题列表来自客户端聚类或同日问题匹配。
 */
export function resolveDecisionQueueClusters(
  items: DecisionProblemSummary[],
  bffClusters?: DecisionQueueCluster[] | null,
): DecisionQueueCluster[] {
  const clientClusters = clusterDecisionProblemsForQueue(items);
  if (!bffClusters?.length) return clientClusters;

  const usedClientIds = new Set<string>();

  const hydrated = bffClusters.map((bff) => {
    const client =
      clientClusters.find((row) => row.id === bff.id && !usedClientIds.has(row.id)) ??
      clientClusters.find(
        (row) =>
          !usedClientIds.has(row.id) &&
          bff.dayNumbers[0] != null &&
          row.dayNumbers[0] === bff.dayNumbers[0],
      ) ??
      clientClusters.find((row) => !usedClientIds.has(row.id));

    if (client) usedClientIds.add(client.id);
    return mergeClusterPair(bff, client, items);
  });

  const trailing = clientClusters.filter((row) => !usedClientIds.has(row.id));
  return [...hydrated, ...trailing].sort((a, b) => {
    const dayA = a.dayNumbers[0] ?? 999;
    const dayB = b.dayNumbers[0] ?? 999;
    if (dayA !== dayB) return dayA - dayB;
    return a.title.localeCompare(b.title, 'zh');
  });
}

export function formatDecisionQueueMergeSummary(input: {
  diagnosticCount: number;
  clusterCount: number;
}): string | null {
  if (input.diagnosticCount <= input.clusterCount) return null;
  return `AI 已将 ${input.diagnosticCount} 项诊断合并为 ${input.clusterCount} 个决策`;
}
