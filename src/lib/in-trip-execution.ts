import { buildCollabCenterPlanStudioUrl } from '@/lib/collab-center-navigation';
import type {
  EnvironmentEventType,
  HandoffMissingCode,
  InTripTravelStatus,
  ThermometerLevel,
  VulnerabilitySeverity,
} from '@/types/in-trip-execution';

/** 后端 TRAVELING 与前端 IN_PROGRESS 互认 */
export function isTripInTravelPhase(status: string | undefined | null): boolean {
  return status === 'IN_PROGRESS' || status === 'TRAVELING';
}

export function normalizeTripStatusFromApi(status: string | undefined | null): TripStatus {
  if (status === 'TRAVELING') return 'IN_PROGRESS';
  if (
    status === 'PLANNING' ||
    status === 'IN_PROGRESS' ||
    status === 'COMPLETED' ||
    status === 'CANCELLED'
  ) {
    return status;
  }
  return 'PLANNING';
}

export function resolveTravelStatusForApi(): InTripTravelStatus {
  return 'TRAVELING';
}

export interface HandoffMissingItemMeta {
  label: string;
  description: string;
  path: (tripId: string) => string;
}

const HANDOFF_MISSING_META: Record<HandoffMissingCode, HandoffMissingItemMeta> = {
  plan_confirmed: {
    label: '锁定行程方案',
    description: '在规划工作台确认并锁定最终方案',
    path: (tripId) => `/dashboard/plan-studio?tripId=${tripId}`,
  },
  budget_intent: {
    label: '设置总预算（L1）',
    description: '明确本次旅行的总预算上限',
    path: (tripId) => `/dashboard/trips/${tripId}/budget`,
  },
  budget_structure: {
    label: '设置预算结构（L2）',
    description: '分配交通、住宿、体验等消费分桶',
    path: (tripId) => `/dashboard/trips/${tripId}/budget`,
  },
  wallet_rule: {
    label: '设置分摊规则（L3）',
    description: '确认谁付、谁垫、如何 AA',
    path: (tripId) => `/dashboard/trips/${tripId}/budget`,
  },
  split_mechanism_locked: {
    label: '锁定分摊共识',
    description: '全员确认分摊机制后方可进入行中',
    path: (tripId) => buildCollabCenterPlanStudioUrl(tripId),
  },
  itinerary_days: {
    label: '完善行程日程',
    description: '至少有一天包含行程项',
    path: (tripId) => `/dashboard/plan-studio?tripId=${tripId}`,
  },
  trip_members: {
    label: '邀请行程成员',
    description: '结伴旅行需至少一名协作者',
    path: (tripId) => `/dashboard/trips/${tripId}?openCollaborators=1`,
  },
  trip_not_found: {
    label: '行程不存在',
    description: '请返回行程列表',
    path: () => '/dashboard/trips',
  },
};

export function getHandoffMissingMeta(code: HandoffMissingCode): HandoffMissingItemMeta {
  return HANDOFF_MISSING_META[code];
}

export function parseProfilingCompletionWarning(warning: string): number | null {
  const match = /^decision_profiling_completion_(\d+)%$/.exec(warning);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function vulnerabilitySeverityLabel(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case 'green':
      return '稳定';
    case 'yellow':
      return '需关注';
    case 'red':
      return '高风险';
  }
}

export function vulnerabilitySeverityClasses(severity: VulnerabilitySeverity): string {
  switch (severity) {
    case 'green':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'yellow':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200';
  }
}

export function thermometerLevelLabel(level: ThermometerLevel): string {
  switch (level) {
    case 'green':
      return '融洽';
    case 'yellow':
      return '轻微疲劳';
    case 'orange':
      return '需关注';
    case 'red':
      return '建议干预';
  }
}

export function thermometerLevelClasses(level: ThermometerLevel): string {
  switch (level) {
    case 'green':
      return 'bg-emerald-500';
    case 'yellow':
      return 'bg-amber-400';
    case 'orange':
      return 'bg-orange-500';
    case 'red':
      return 'bg-red-500';
  }
}

export function buildEnterTravelingPayload(
  existingMetadata?: Record<string, unknown> | null,
): { status: 'TRAVELING'; metadata: Record<string, unknown> } {
  return {
    status: 'TRAVELING',
    metadata: {
      ...(existingMetadata ?? {}),
      planConfirmed: true,
    },
  };
}

export function sumPendingCards(cards: {
  environmentAlerts: number;
  interventions: number;
  experiencePulses: number;
  rebalanceSuggestions: number;
}): number {
  return (
    cards.environmentAlerts +
    cards.interventions +
    cards.experiencePulses +
    cards.rebalanceSuggestions
  );
}

export function environmentEventTypeLabel(type: EnvironmentEventType): string {
  switch (type) {
    case 'weather':
      return '天气';
    case 'traffic':
      return '交通';
    case 'attraction':
      return '景点';
    case 'other':
      return '其他';
  }
}

export function environmentEventStatusLabel(
  status: 'open' | 'voting' | 'resolved' | 'dismissed',
): string {
  switch (status) {
    case 'open':
      return '待查看';
    case 'voting':
      return '投票中';
    case 'resolved':
      return '已锁定';
    case 'dismissed':
      return '已忽略';
  }
}

export function formatExperienceEquivalence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function formatCostDifference(amount: number, currency = 'CNY'): string {
  if (amount === 0) return '费用不变';
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount} ${currency}`;
}
