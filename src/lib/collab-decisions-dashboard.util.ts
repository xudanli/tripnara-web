import type { DomainNegotiationTask } from '@/types/domain-negotiation-task';
import type { PreferenceRoundDetail } from '@/types/process-fairness';
import type { SilentVoteDetail } from '@/types/silent-votes';
import type { CollabDecisionStats } from '@/hooks/useCollabOverview';
import type { HighRiskAlert } from '@/types/trip-decision-profiling';
import {
  resolveNegotiationStageIndex,
  resolveNegotiationStageStep,
} from '@/lib/collab-negotiation-stage';

export type DecisionQueueDomainFilter =
  | 'all'
  | 'budget'
  | 'accommodation'
  | 'pace'
  | 'activities'
  | 'transport';

export type DecisionQueuePriorityFilter = 'all' | '高' | '中' | '低';

export const DECISION_QUEUE_DOMAIN_FILTERS: Array<{ value: DecisionQueueDomainFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'budget', label: '预算' },
  { value: 'accommodation', label: '住宿' },
  { value: 'pace', label: '节奏' },
  { value: 'activities', label: '活动' },
  { value: 'transport', label: '交通' },
];

export const DECISION_QUEUE_PRIORITY_FILTERS: DecisionQueuePriorityFilter[] = ['all', '高', '中', '低'];

function priorityFromTask(task: DomainNegotiationTask): DecisionQueuePriorityFilter {
  if (task.status === 'in_discussion') return '高';
  if (task.crossLevel === 'high') return '高';
  if (task.crossLevel === 'medium') return '中';
  return '低';
}

export function matchesDecisionQueueDomainFilter(
  task: DomainNegotiationTask,
  filter: DecisionQueueDomainFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'accommodation') return task.domain === 'accommodation';
  if (filter === 'activities') return task.domain === 'activities';
  if (filter === 'transport') {
    return task.domain === 'main_transport' || task.domain === 'local_transport';
  }
  if (filter === 'pace') {
    return (
      task.domain === 'destination_route' ||
      /节奏|出发|早起|强度/.test(task.title)
    );
  }
  if (filter === 'budget') {
    return (
      task.domain === 'dining' ||
      task.domain === 'shopping' ||
      /预算|消费|花费/.test(task.title)
    );
  }
  return true;
}

export function matchesDecisionQueuePriorityFilter(
  task: DomainNegotiationTask,
  filter: DecisionQueuePriorityFilter,
): boolean {
  if (filter === 'all') return true;
  return priorityFromTask(task) === filter;
}

export function filterDecisionQueueTasks(
  tasks: DomainNegotiationTask[],
  domainFilter: DecisionQueueDomainFilter,
  priorityFilter: DecisionQueuePriorityFilter,
): DomainNegotiationTask[] {
  return tasks.filter(
    (task) =>
      matchesDecisionQueueDomainFilter(task, domainFilter) &&
      matchesDecisionQueuePriorityFilter(task, priorityFilter),
  );
}

export function resolveQueueStageLabel(
  task: DomainNegotiationTask,
  openVoteTitles: Set<string>,
): string {
  if (openVoteTitles.has(task.title)) return '静默投票中';
  if (task.status === 'in_discussion') return '选项讨论中';
  if (task.status === 'consensus_reached') return '已达成共识';
  return '未启动';
}

export function estimateNegotiationProgress(
  task: DomainNegotiationTask,
  detail?: PreferenceRoundDetail | null,
): number {
  if (task.status === 'consensus_reached') return 100;
  if (task.status === 'pending') return 12;
  if (!detail) return 28;
  const stepIndex = resolveNegotiationStageIndex(resolveNegotiationStageStep(task, detail));
  return Math.min(95, 30 + stepIndex * 14);
}

export interface DecisionAiSummaryView {
  text: string;
  prefix?: string;
  highlights?: string[];
  suffix?: string;
}

export function buildDecisionAiSummaryView(input: {
  stats: CollabDecisionStats;
  tasks: DomainNegotiationTask[];
  alerts?: HighRiskAlert[];
}): DecisionAiSummaryView {
  const { stats, tasks, alerts } = input;
  const active = tasks.filter((t) => t.status !== 'consensus_reached');
  const hot = active
    .filter((t) => t.status === 'in_discussion' || t.crossLevel === 'high')
    .slice(0, 3)
    .map((t) => t.title.replace(/是否.*/, '').trim() || t.title);

  if (hot.length >= 2) {
    const highlights = hot.slice(0, 3);
    return {
      text: `关键分歧集中在${highlights.join('、')}，建议优先聚焦这三项议题以加速达成共识。`,
      prefix: '关键分歧集中在',
      highlights,
      suffix: '，建议优先聚焦这三项议题以加速达成共识。',
    };
  }

  if (alerts && alerts.length > 0) {
    const highlights = [...new Set(alerts.slice(0, 3).map((a) => a.domainLabel))];
    return {
      text: `团队分歧主要集中在${highlights.join('、')}，建议先对齐高优先级议题再推进投票。`,
      prefix: '团队分歧主要集中在',
      highlights,
      suffix: '，建议先对齐高优先级议题再推进投票。',
    };
  }

  if (stats.inVoting > 0) {
    return {
      text: `有 ${stats.inVoting} 项投票进行中，建议在截止前完成意向表达并汇总妥协方案。`,
    };
  }

  if (stats.pending + stats.inNegotiation === 0) {
    return {
      text: '当前无待决议题，团队决策进展良好，可继续完善行程细节。',
    };
  }

  return {
    text: `共有 ${stats.pending + stats.inNegotiation} 项待决议题，${stats.inNegotiation} 项正在协商中，建议从决策队列选择一项进入主舞台。`,
  };
}

export function buildDecisionAiSummary(input: {
  stats: CollabDecisionStats;
  tasks: DomainNegotiationTask[];
  alerts?: HighRiskAlert[];
}): string {
  return buildDecisionAiSummaryView(input).text;
}

export function buildAiConflictPoints(input: {
  tasks: DomainNegotiationTask[];
  alerts?: HighRiskAlert[];
  openVote?: SilentVoteDetail | null;
}): string[] {
  const points: string[] = [];
  const { tasks, alerts, openVote } = input;

  for (const alert of alerts ?? []) {
    points.push(`${alert.domainLabel}：${alert.memberAName} vs ${alert.memberBName}`);
  }

  for (const task of tasks.filter((t) => t.status === 'in_discussion').slice(0, 2)) {
    points.push(`${task.title}（${task.statusLabel}）`);
  }

  if (openVote) {
    points.push(`投票「${openVote.title}」待更多成员表达倾向`);
  }

  if (points.length === 0) {
    points.push('体验 vs 安全', '预算 vs 品质', '体力差异');
  }

  return points.slice(0, 4);
}

export function buildAiNextSteps(input: {
  activeTask?: DomainNegotiationTask | null;
  openVote?: SilentVoteDetail | null;
}): string[] {
  const steps: string[] = [];
  const { activeTask, openVote } = input;

  if (activeTask?.status === 'in_discussion') {
    steps.push('先对比方案 B 与 C 的预算与体力影响');
    steps.push('汇总讨论动态中的主要顾虑');
  } else {
    steps.push('从决策队列选择一项高优先级议题');
  }

  if (openVote && !openVote.myBallotSubmitted) {
    steps.push('提交你的投票意向');
  } else {
    steps.push('必要时发起静默投票打破僵局');
  }

  steps.push('与 Nara 讨论生成 2–3 个妥协方案');
  return steps.slice(0, 4);
}
