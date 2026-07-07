import type { DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { PlanningConflictItem } from '@/lib/planning-conflicts.util';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export type DecisionSpaceProblemTemplateKind =
  | 'reservation'
  | 'route'
  | 'daily_load'
  | 'weather'
  | 'generic';

export interface DecisionSpaceProblemTemplateView {
  kind: DecisionSpaceProblemTemplateKind;
  /** 行动区上方一句引导 */
  guidance: string;
  actionSectionTitle: string;
  /** 是否展示内嵌预约凭证区（选上传类 action 时常显） */
  supportsReservationEvidence: boolean;
}

function haystack(input: {
  problem?: DecisionProblemSummary | null;
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  conflict?: PlanningConflictItem | null;
}): string {
  const issue = input.conflict?.issue;
  return [
    input.problem?.semanticKey,
    input.problem?.title,
    input.problem?.affectedScopeSummary,
    input.detail?.semanticKey,
    input.detail?.title,
    input.detail?.description,
    input.conflict?.title,
    input.conflict?.message,
    input.conflict?.semanticKey,
    issue?.issueKind,
    issue?.title,
    issue?.message,
    input.problem?.canonicalView?.rfc001Problem.semanticCapability,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function resolveDecisionSpaceProblemTemplate(input: {
  problem?: DecisionProblemSummary | null;
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  conflict?: PlanningConflictItem | null;
}): DecisionSpaceProblemTemplateView {
  const text = haystack(input);
  const issueKind = input.conflict?.issue?.issueKind ?? '';

  if (
    issueKind.startsWith('poi_access_') ||
    /预约|预订|reservation|poi_access|凭证|blue.?lagoon|蓝湖/.test(text)
  ) {
    return {
      kind: 'reservation',
      guidance: '热门景点需提前预约。完成预订后可上传确认号，或选择改期 / 替代体验。',
      actionSectionTitle: '选择处理方式',
      supportsReservationEvidence: true,
    };
  }

  if (
    /excessive_daily_load|日负荷|驾驶.*小时|daily.?load|拆天/.test(text)
  ) {
    return {
      kind: 'daily_load',
      guidance: '当日行程强度过高。建议优先拆天或调整住宿，兼顾安全与节奏。',
      actionSectionTitle: '选择调整方式',
      supportsReservationEvidence: false,
    };
  }

  if (
    /road_segment_unavailable|不可达|绕行|拆段|换路线|1916|segment/.test(text) ||
    input.conflict?.category === 'transport'
  ) {
    return {
      kind: 'route',
      guidance: '当前路线存在可达性或距离风险。对比各方案对时间与核心体验的影响后再确认。',
      actionSectionTitle: '选择修复方式',
      supportsReservationEvidence: false,
    };
  }

  if (/weather_activity_prohibited|天气|大风|涨潮|safetravel/.test(text)) {
    return {
      kind: 'weather',
      guidance: '受天气或安全条件影响。请关注官方公告，必要时改期或替换户外活动。',
      actionSectionTitle: '选择应对方式',
      supportsReservationEvidence: false,
    };
  }

  return {
    kind: 'generic',
    guidance: '请选择一项处理方式，确认后应用到行程。',
    actionSectionTitle: '选择处理方式',
    supportsReservationEvidence: false,
  };
}
