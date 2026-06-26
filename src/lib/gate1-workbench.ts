/**
 * Advisor Workbench · 待办、下一动作与项目优先级（客户端回退逻辑）
 * @see docs/prd/advisor-workspace-prd.md §6
 * @see docs/api/advisor-workspace-frontend-integration.md §4
 */

import type {
  Gate1AdvisorDashboard,
  Gate1ExperimentStatus,
  Gate1MetricsResponse,
  Gate1ProjectListRow,
  Gate1ProjectSummary,
} from '@/types/gate1';
import { gate1ExperimentStatusLabel } from '@/lib/gate1-display';

export { projectDetailHref, resolveAdvisorProjectHref } from '@/lib/advisor-routes';

export type Gate1WorkbenchActionKind =
  | 'baseline'
  | 'members'
  | 'conflicts'
  | 'candidates'
  | 'decision'
  | 'readiness'
  | 'plan-b'
  | 'outcome'
  | 'wait';

export interface Gate1WorkbenchTodo {
  projectId: string;
  projectTitle: string;
  cohort: Gate1ProjectSummary['cohort'];
  experimentStatus: Gate1ExperimentStatus;
  actionKind: Gate1WorkbenchActionKind;
  actionLabel: string;
  reason: string;
  priority: number;
  tab?: string;
}

export interface Gate1WorkbenchFunnel {
  status: Gate1ExperimentStatus;
  label: string;
  count: number;
}

const STATUS_PRIORITY: Partial<Record<Gate1ExperimentStatus, number>> = {
  ADVISOR_DECIDING: 100,
  DRAFT: 90,
  COLLECTING: 70,
  READY: 65,
  BASELINE_READY: 60,
  ACTIVE: 55,
  ANALYZING: 40,
  COMPLETED: 20,
  WITHDRAWN: 0,
};

const FUNNEL_ORDER: Gate1ExperimentStatus[] = [
  'DRAFT',
  'BASELINE_READY',
  'COLLECTING',
  'ANALYZING',
  'ADVISOR_DECIDING',
  'READY',
  'ACTIVE',
  'COMPLETED',
  'WITHDRAWN',
];

/** 根据实验状态推断顾问下一动作（列表级，无 per-project 细粒度 API） */
export function inferGate1NextAction(project: Gate1ProjectSummary): {
  actionKind: Gate1WorkbenchActionKind;
  actionLabel: string;
  reason: string;
  tab: string;
} {
  switch (project.experimentStatus) {
    case 'DRAFT':
      return {
        actionKind: 'baseline',
        actionLabel: '确认 Baseline',
        reason: '项目尚未建立可追踪的 Baseline',
        tab: 'baseline',
      };
    case 'BASELINE_READY':
      return {
        actionKind: 'members',
        actionLabel: '邀请成员',
        reason: 'Baseline 已确认，需启动成员收集',
        tab: 'members',
      };
    case 'COLLECTING':
      return {
        actionKind: 'members',
        actionLabel: '跟进成员填写',
        reason: '成员偏好与约束尚未全部完成',
        tab: 'members',
      };
    case 'ANALYZING':
      return {
        actionKind: 'wait',
        actionLabel: '等待人工分析交付',
        reason: 'TripNARA 团队正在生成冲突报告与候选方案',
        tab: 'conflicts',
      };
    case 'ADVISOR_DECIDING':
      return {
        actionKind: 'decision',
        actionLabel: '审阅并提交决策',
        reason: '冲突与候选方案已发布，等待顾问决策',
        tab: 'decision',
      };
    case 'READY':
      return {
        actionKind: 'readiness',
        actionLabel: '检查 Readiness 与 Plan B',
        reason: '方案已定，需确认可执行性与预案',
        tab: 'readiness',
      };
    case 'ACTIVE':
      return {
        actionKind: 'plan-b',
        actionLabel: '行中监控与事件记录',
        reason: '行程执行中，关注 Plan B 与异常',
        tab: 'plan-b',
      };
    case 'COMPLETED':
      return {
        actionKind: 'outcome',
        actionLabel: '完成 Outcome 复盘',
        reason: '项目已结束，需关闭决策与结果闭环',
        tab: 'outcome',
      };
    case 'WITHDRAWN':
    default:
      return {
        actionKind: 'wait',
        actionLabel: '已退出 · 只读',
        reason: '项目已退出实验',
        tab: 'overview',
      };
  }
}

export function buildGate1WorkbenchTodos(projects: Gate1ProjectSummary[]): Gate1WorkbenchTodo[] {
  return projects
    .map((project) => {
      const next = inferGate1NextAction(project);
      if (next.actionKind === 'wait' && project.experimentStatus === 'WITHDRAWN') {
        return null;
      }
      return {
        projectId: project.id,
        projectTitle: project.title,
        cohort: project.cohort,
        experimentStatus: project.experimentStatus,
        actionKind: next.actionKind,
        actionLabel: next.actionLabel,
        reason: next.reason,
        priority: STATUS_PRIORITY[project.experimentStatus] ?? 0,
        tab: next.tab,
      };
    })
    .filter((item): item is Gate1WorkbenchTodo => item != null)
    .sort((a, b) => b.priority - a.priority);
}

export function buildGate1LifecycleFunnel(projects: Gate1ProjectSummary[]): Gate1WorkbenchFunnel[] {
  const counts = new Map<Gate1ExperimentStatus, number>();
  for (const project of projects) {
    counts.set(project.experimentStatus, (counts.get(project.experimentStatus) ?? 0) + 1);
  }
  return FUNNEL_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
    status,
    label: gate1ExperimentStatusLabel(status),
    count: counts.get(status) ?? 0,
  }));
}

/** 需优先处理：顾问决策中、草稿、临出发 READY、收集中 */
export function filterGate1HighPriorityProjects(projects: Gate1ProjectSummary[]): Gate1ProjectSummary[] {
  return projects.filter((p) => {
    if (p.experimentStatus === 'ADVISOR_DECIDING' || p.experimentStatus === 'DRAFT') {
      return true;
    }
    if (p.experimentStatus === 'READY' && p.cohort === 'NEAR_DEPARTURE') {
      return true;
    }
    if (p.experimentStatus === 'COLLECTING') {
      return true;
    }
    return false;
  });
}

export function countGate1AwaitingAnalysis(projects: Gate1ProjectSummary[]): number {
  return projects.filter((p) => p.experimentStatus === 'ANALYZING').length;
}

export function gate1MetricsHeadline(metrics: Gate1MetricsResponse | undefined): {
  label: string;
  value: string;
}[] {
  if (!metrics) return [];
  const { participation, value, commercial, productization } = metrics;
  return [
    {
      label: '重要决策改变率',
      value: formatRate(value.materialChangeRate),
    },
    {
      label: '邀请接受率',
      value: formatRate(participation.invitationAcceptRate),
    },
    {
      label: '偏好填写率',
      value: formatRate(participation.preferenceFillRate),
    },
    {
      label: '下一单意愿',
      value: formatRate(commercial.secondOrderRate),
    },
    {
      label: '已完成项目',
      value: productization.completedProjects?.toString() ?? '—',
    },
  ];
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return 'N/A';
  return `${Math.round(rate * 100)}%`;
}

export function gate1DashboardHeadline(
  dashboard: Gate1AdvisorDashboard | undefined,
): { label: string; value: string }[] {
  if (!dashboard) return [];
  const { gate1Summary } = dashboard;
  return [
    { label: '项目总数', value: String(gate1Summary.totalProjects) },
    { label: '进行中', value: String(gate1Summary.activeProjects) },
    {
      label: '重要决策改变率',
      value: formatRate(gate1Summary.materialChangeRate),
    },
    { label: '下一单意愿', value: formatRate(gate1Summary.nextOrderRate) },
    { label: '人工工时', value: `${gate1Summary.totalHumanHours}h` },
  ];
}

export function buildFunnelFromDashboard(
  funnel: Partial<Record<Gate1ExperimentStatus, number>> | undefined,
): Gate1WorkbenchFunnel[] {
  if (!funnel) return [];
  return FUNNEL_ORDER.filter((status) => (funnel[status] ?? 0) > 0).map((status) => ({
    status,
    label: gate1ExperimentStatusLabel(status),
    count: funnel[status] ?? 0,
  }));
}

/** 将旧列表行映射为待办（API 不可用时的回退） */
export function listRowToSummary(row: Gate1ProjectListRow): Gate1ProjectSummary {
  return {
    id: row.id,
    title: row.title,
    cohort: row.cohort,
    experimentStatus: row.experimentStatus,
    destination: row.destination ?? undefined,
    updatedAt: row.updatedAt,
  };
}
