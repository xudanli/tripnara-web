/**
 * Gate 1 展示标签与状态文案
 */

import type {
  Gate1Cohort,
  Gate1ConflictAdvisorFeedback,
  Gate1ConflictFindingActionType,
  Gate1ExperimentStatus,
  Gate1MaterialChangeType,
  Gate1MissingInfoReason,
  Gate1NextActionPriority,
  Gate1ParticipantStatus,
  Gate1PlanBAdvisorPreDecision,
  Gate1ReadinessAdvisorFeedback,
  Gate1ReadinessStatus,
  Gate1RiskLevel,
  Gate1SecondOrderIntent,
  Gate1SourceType,
  Gate1TravelEventType,
} from '@/types/gate1';

export function gate1RiskLevelLabel(level: Gate1RiskLevel): string {
  const map: Record<Gate1RiskLevel, string> = {
    HIGH: '高风险',
    MEDIUM: '中风险',
    LOW: '低风险',
  };
  return map[level] ?? level;
}

export function gate1RiskLevelBadgeVariant(
  level: Gate1RiskLevel,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (level === 'HIGH') return 'destructive';
  if (level === 'MEDIUM') return 'secondary';
  return 'outline';
}

export function gate1NextActionPriorityLabel(priority: Gate1NextActionPriority): string {
  return priority;
}

export function gate1MissingInfoReasonLabel(reason: Gate1MissingInfoReason): string {
  const map: Record<Gate1MissingInfoReason, string> = {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '填写中',
    NEEDS_FOLLOW_UP: '需跟进',
  };
  return map[reason] ?? reason;
}

export function gate1CohortLabel(cohort: Gate1Cohort): string {
  const map: Record<Gate1Cohort, string> = {
    PLANNING: 'Planning · 规划期',
    NEAR_DEPARTURE: 'Near-Departure · 临出发',
    IN_TRIP_RECENT: 'In-Trip / Recent · 行中/近期',
  };
  return map[cohort] ?? cohort;
}

export function gate1ExperimentStatusLabel(status: Gate1ExperimentStatus): string {
  const map: Record<Gate1ExperimentStatus, string> = {
    DRAFT: '草稿',
    BASELINE_READY: 'Baseline 已确认',
    COLLECTING: '成员收集中',
    ANALYZING: '分析中',
    ADVISOR_DECIDING: '顾问决策中',
    READY: '就绪',
    ACTIVE: '旅行中',
    COMPLETED: '已完成',
    WITHDRAWN: '已退出',
  };
  return map[status] ?? status;
}

export function gate1ParticipantStatusLabel(status: Gate1ParticipantStatus): string {
  const map: Record<Gate1ParticipantStatus, string> = {
    INVITED: '已邀请',
    OPENED: '已打开',
    JOINED: '已加入',
    CONSENTED: '已同意',
    IN_PROGRESS: '填写中',
    SUBMITTED: '已提交',
    DECLINED: '已拒绝',
    WITHDRAWN: '已撤回',
    DELETED: '已删除',
  };
  return map[status] ?? status;
}

export function gate1SourceTypeLabel(source: Gate1SourceType, humanAssistedLabel?: string): string {
  if (humanAssistedLabel?.trim()) return humanAssistedLabel;
  const map: Record<Gate1SourceType, string> = {
    HUMAN_ASSISTED: '人工协助',
    AUTOMATED: '自动化',
    HYBRID: '人机协作',
  };
  return map[source] ?? source;
}

export function gate1ReadinessStatusLabel(status: Gate1ReadinessStatus): string {
  const map: Record<Gate1ReadinessStatus, string> = {
    GREEN: '绿 · 就绪',
    YELLOW: '黄 · 待处理',
    RED: '红 · 须关闭',
  };
  return map[status] ?? status;
}

export function gate1MaterialChangeTypeLabel(type: Gate1MaterialChangeType): string {
  const map: Record<Gate1MaterialChangeType, string> = {
    ROUTE: '路线',
    ACTIVITY: '活动',
    ACCOMMODATION: '住宿',
    TRANSPORT: '交通',
    SPLIT: '分流',
    BUDGET: '预算层级',
    BUFFER: '缓冲',
    BOOKING: '预约',
    PLAN_B: 'Plan B',
  };
  return map[type] ?? type;
}

export function gate1ConflictActionLabel(action: Gate1ConflictFindingActionType): string {
  const map: Record<Gate1ConflictFindingActionType, string> = {
    CONFIRM: '确认冲突',
    DISMISS: '驳回',
    RESOLVE: '标记已解决',
  };
  return map[action] ?? action;
}

export function gate1ConflictFeedbackLabel(feedback: Gate1ConflictAdvisorFeedback): string {
  const map: Record<Gate1ConflictAdvisorFeedback, string> = {
    VALUABLE: '有价值',
    NOT_VALUABLE: '无价值',
    KNOWN: '已知',
    ERROR: '错误',
    NEEDS_DISCUSSION: '需沟通',
  };
  return map[feedback] ?? feedback;
}

export function gate1ReadinessFeedbackLabel(feedback: Gate1ReadinessAdvisorFeedback): string {
  const map: Record<Gate1ReadinessAdvisorFeedback, string> = {
    USEFUL: '有用',
    KNOWN: '已知',
    ERROR: '错误',
    NOT_APPLICABLE: '不适用',
  };
  return map[feedback] ?? feedback;
}

/** 校验顾问决策表单（配合 POST /advisor/projects/:id/decision） */
export function validateGate1DecisionForm(input: {
  materialChange: boolean;
  changeTypes?: Gate1MaterialChangeType[];
  changeEvidence?: string;
}): string | null {
  if (input.materialChange) {
    if (!input.changeTypes?.length) {
      return '勾选「重要决策改变」时须选择至少一项改变类型';
    }
    if (!input.changeEvidence?.trim()) {
      return '请填写改变证据说明';
    }
  } else if (input.changeTypes?.length) {
    return '未发生重要改变时不应填写 changeTypes';
  }
  return null;
}

export const GATE1_MATERIAL_CHANGE_TYPES: Gate1MaterialChangeType[] = [
  'ROUTE',
  'ACTIVITY',
  'ACCOMMODATION',
  'TRANSPORT',
  'SPLIT',
  'BUDGET',
  'BUFFER',
  'BOOKING',
  'PLAN_B',
];

export function gate1PlanBPreDecisionLabel(decision: Gate1PlanBAdvisorPreDecision): string {
  const map: Record<Gate1PlanBAdvisorPreDecision, string> = {
    PENDING: '待确认',
    ACCEPTED: '已接受',
    REJECTED: '已拒绝',
  };
  return map[decision] ?? decision;
}

export function gate1TravelEventTypeLabel(type: Gate1TravelEventType): string {
  const map: Record<Gate1TravelEventType, string> = {
    INCIDENT: '异常事件',
    CHANGE: '行程变更',
    PLAN_B_ACTIVATION: 'Plan B 触发',
    OTHER: '其他',
  };
  return map[type] ?? type;
}

export function gate1SecondOrderIntentLabel(intent: Gate1SecondOrderIntent): string {
  const map: Record<Gate1SecondOrderIntent, string> = {
    VERBAL: '口头意愿',
    CONFIRMED: '书面确认',
    PROVIDED: '已提供第二单',
  };
  return map[intent] ?? intent;
}

export function readinessStatusBadgeVariant(
  status: Gate1ReadinessStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'GREEN') return 'default';
  if (status === 'YELLOW') return 'secondary';
  return 'destructive';
}

/** Outcome 提交校验：VERBAL 不可与 secondOrderProvided 同时为 true */
export function validateGate1OutcomeForm(input: {
  secondOrderIntent?: Gate1SecondOrderIntent;
  secondOrderProvided?: boolean;
}): string | null {
  if (input.secondOrderIntent === 'VERBAL' && input.secondOrderProvided === true) {
    return '口头意愿不可同时标记为已提供第二单';
  }
  return null;
}
