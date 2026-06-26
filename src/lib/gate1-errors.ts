/**
 * Gate 1 业务错误 → UI 建议（PRD §8 / 接口文档 §8）
 */

import { isGate1ApiError } from '@/api/gate1-common';

export type Gate1UiErrorKind =
  | 'baseline_required'
  | 'sanitization_required'
  | 'human_minutes_required'
  | 'readiness_red_open'
  | 'decision_validation'
  | 'unauthorized'
  | 'invite_invalid'
  | 'not_found'
  | 'generic';

export interface Gate1UiErrorGuide {
  kind: Gate1UiErrorKind;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const MESSAGE_RULES: Array<{ match: RegExp; guide: Gate1UiErrorGuide }> = [
  {
    match: /baseline must be confirmed|baseline.*未确认|先完成 baseline/i,
    guide: {
      kind: 'baseline_required',
      title: '需先完成 Baseline',
      description: '在发布 TripNARA 输出前，顾问须提交并确认 Baseline 记录。',
      actionLabel: '前往 Baseline',
    },
  },
  {
    match: /sanitiz|脱敏.*未审核|privacy/i,
    guide: {
      kind: 'sanitization_required',
      title: '脱敏约束未审核',
      description: '存在私密约束时，须先完成隐私分析与脱敏审核，再发布冲突或方案。',
      actionLabel: '前往隐私流程',
    },
  },
  {
    match: /human minutes|人工工时|humanMinutes/i,
    guide: {
      kind: 'human_minutes_required',
      title: '需填写人工工时',
      description: '发布人工协助输出前须记录 humanMinutes。',
      actionLabel: '补录工时',
    },
  },
  {
    match: /red finding|readiness.*red|未关闭.*RED/i,
    guide: {
      kind: 'readiness_red_open',
      title: 'Readiness 存在未关闭 RED',
      description: '所有 RED finding 须关闭或经顾问确认接受风险后才能发布。',
      actionLabel: '查看 Readiness',
    },
  },
  {
    match: /materialChange|changeTypes|changeEvidence|文案润色/i,
    guide: {
      kind: 'decision_validation',
      title: '决策记录校验失败',
      description:
        '勾选「重要决策改变」时须填写 changeTypes 与 changeEvidence；仅文案修改请勿勾选。',
    },
  },
  {
    match: /secondOrderIntent.*VERBAL|VERBAL.*secondOrderProvided/i,
    guide: {
      kind: 'decision_validation',
      title: '第二单意愿不一致',
      description: '口头意愿（VERBAL）不可同时标记为已提供第二单。',
    },
  },
];

export function resolveGate1UiErrorGuide(error: unknown): Gate1UiErrorGuide {
  if (isGate1ApiError(error)) {
    if (error.statusCode === 401) {
      return {
        kind: 'unauthorized',
        title: '请先登录',
        description: '顾问与运营接口需要有效 JWT。',
        actionLabel: '去登录',
        actionHref: '/login',
      };
    }
    if (error.statusCode === 403) {
      return {
        kind: 'invite_invalid',
        title: '邀请已失效',
        description: '链接可能已过期、被撤销或无权访问。',
      };
    }
    if (error.statusCode === 404) {
      return {
        kind: 'not_found',
        title: '未找到',
        description: '项目或邀请不存在，请确认链接是否正确。',
      };
    }

    const msg = error.message;
    for (const rule of MESSAGE_RULES) {
      if (rule.match.test(msg)) {
        return rule.guide;
      }
    }
  }

  return {
    kind: 'generic',
    title: '操作失败',
    description: error instanceof Error ? error.message : '请稍后重试',
  };
}

/** null 比率显示 N/A，勿与 0 混淆（接口文档 §6.1） */
export function formatGate1MetricRate(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${Math.round(value * 1000) / 10}%`;
}
