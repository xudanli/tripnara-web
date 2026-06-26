/**
 * Participant Portal 业务错误 → 成员端 UI 文案
 */

import { isGate1ApiError } from '@/api/gate1-common';
import {
  resolveGate1UiErrorGuide,
  type Gate1UiErrorGuide,
} from '@/lib/gate1-errors';

export type ParticipantPortalErrorKind =
  | Gate1UiErrorGuide['kind']
  | 'invite_expired'
  | 'consent_required'
  | 'preferences_locked'
  | 'proposal_stale'
  | 'participant_terminal';

export interface ParticipantPortalErrorGuide extends Gate1UiErrorGuide {
  kind: ParticipantPortalErrorKind;
}

const CODE_RULES: Record<string, Omit<ParticipantPortalErrorGuide, 'kind'> & { kind: ParticipantPortalErrorKind }> = {
  INVITE_EXPIRED: {
    kind: 'invite_expired',
    title: '邀请已过期',
    description: '此邀请链接已失效。如需重新加入，请联系邀请方重新发送。',
  },
  PARTICIPANT_INVITE_EXPIRED: {
    kind: 'invite_expired',
    title: '邀请已过期',
    description: '此邀请链接已失效。如需重新加入，请联系邀请方重新发送。',
  },
  CONSENT_REQUIRED: {
    kind: 'consent_required',
    title: '需先完成知情同意',
    description: '请先完成必要授权后再继续填写偏好或提交反馈。',
  },
  CONSENT_INCOMPLETE: {
    kind: 'consent_required',
    title: '同意项不完整',
    description: 'Gate 1 须同时同意「基础服务」与「人工协助分析」才能继续。',
  },
  PREFERENCES_LOCKED: {
    kind: 'preferences_locked',
    title: '偏好暂不可编辑',
    description: '当前项目阶段不允许修改偏好，请等待顾问通知或查看待办事项。',
  },
  PROPOSAL_VERSION_STALE: {
    kind: 'proposal_stale',
    title: '方案已更新',
    description: '顾问发布了新版本方案，请刷新页面后重新查看并提交反馈。',
  },
  PROPOSAL_FEEDBACK_INVALIDATED: {
    kind: 'proposal_stale',
    title: '反馈已失效',
    description: '方案版本已变更，您之前的反馈不再有效，请重新提交。',
  },
  PARTICIPANT_WITHDRAWN: {
    kind: 'participant_terminal',
    title: '已退出项目',
    description: '您已撤回授权，无法继续操作此项目。',
  },
  PARTICIPANT_DECLINED: {
    kind: 'participant_terminal',
    title: '已拒绝参与',
    description: '您已拒绝本次邀请，如需重新加入请联系邀请方。',
  },
};

const MESSAGE_RULES: Array<{ match: RegExp; guide: ParticipantPortalErrorGuide }> = [
  {
    match: /invite.*expir|邀请.*过期|token.*expir/i,
    guide: CODE_RULES.INVITE_EXPIRED,
  },
  {
    match: /consent.*required|未完成.*同意|canSubmitPreferences/i,
    guide: CODE_RULES.CONSENT_REQUIRED,
  },
  {
    match: /BASE_SERVICE.*HUMAN_ASSISTED|human assisted.*required/i,
    guide: CODE_RULES.CONSENT_INCOMPLETE,
  },
  {
    match: /proposal.*version|INVALIDATED|方案.*更新|反馈.*失效/i,
    guide: CODE_RULES.PROPOSAL_FEEDBACK_INVALIDATED,
  },
  {
    match: /withdrawn|已退出|已撤回/i,
    guide: CODE_RULES.PARTICIPANT_WITHDRAWN,
  },
  {
    match: /declined|已拒绝/i,
    guide: CODE_RULES.PARTICIPANT_DECLINED,
  },
];

function extractErrorCode(error: unknown): string | undefined {
  const err = error as { response?: { data?: unknown }; code?: string };
  if (typeof err.code === 'string' && err.code) return err.code;

  const data = err.response?.data;
  if (!data || typeof data !== 'object') return undefined;

  const record = data as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;

  const nested = record.error;
  if (nested && typeof nested === 'object' && 'code' in nested) {
    const code = (nested as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }

  return undefined;
}

export function resolveParticipantPortalErrorGuide(error: unknown): ParticipantPortalErrorGuide {
  const code = extractErrorCode(error);
  if (code && CODE_RULES[code]) {
    return CODE_RULES[code];
  }

  const base = resolveGate1UiErrorGuide(error);
  const msg = isGate1ApiError(error) ? error.message : error instanceof Error ? error.message : '';

  for (const rule of MESSAGE_RULES) {
    if (rule.match.test(msg)) {
      return rule.guide;
    }
  }

  return base as ParticipantPortalErrorGuide;
}
