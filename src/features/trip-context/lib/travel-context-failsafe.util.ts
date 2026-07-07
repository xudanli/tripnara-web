import type { ContextFailSafeKind } from '../context/TripTravelContext';

export function classifyTravelContextError(err: unknown): ContextFailSafeKind | null {
  const code = (err as { code?: string })?.code;
  if (!code) return null;

  if (code === 'REVISION_CONFLICT') return 'REVISION_CONFLICT';
  if (code === 'CONSTRAINT_BLOCKED' || code === 'CONSTRAINT_VIOLATION') {
    return 'CONSTRAINT_BLOCKED';
  }
  if (
    code === 'STALE_FACTS' ||
    code === 'EVIDENCE_STALE' ||
    code === 'FACTS_STALE'
  ) {
    return 'STALE_FACTS';
  }
  if (
    code === 'AUTHORITY_BLOCKED' ||
    code === 'AUTHORITY_CHAIN' ||
    code === 'APPROVAL_REQUIRED'
  ) {
    return 'AUTHORITY_BLOCKED';
  }
  return null;
}

export const HARNESS_FAIL_SAFE_SCENARIOS: Array<{
  kind: ContextFailSafeKind;
  title: string;
  description: string;
}> = [
  {
    kind: 'REVISION_CONFLICT',
    title: 'Revision 冲突',
    description: '协作者更新了行程，本地版本过期。有效方案保持不变。',
  },
  {
    kind: 'WRITE_FAILED',
    title: '写入失败',
    description: 'Intent 提交失败（网络或服务端错误）。',
  },
  {
    kind: 'CONSTRAINT_BLOCKED',
    title: '约束未通过',
    description: '修改违反硬约束，未写入行程。',
  },
  {
    kind: 'STALE_FACTS',
    title: '证据过期',
    description: '部分事实数据陈旧，需刷新后再决策。',
  },
  {
    kind: 'AUTHORITY_BLOCKED',
    title: '决策权未满足',
    description: '需要行程所有者或指定审批人确认。',
  },
];

export function buildHarnessFailSafeState(
  kind: ContextFailSafeKind,
): import('../context/TripTravelContext').ContextFailSafeState {
  const scenario = HARNESS_FAIL_SAFE_SCENARIOS.find((s) => s.kind === kind);
  const preserveEffectivePlan =
    kind === 'REVISION_CONFLICT' ||
    kind === 'CONSTRAINT_BLOCKED' ||
    kind === 'STALE_FACTS' ||
    kind === 'AUTHORITY_BLOCKED';

  const messages: Record<ContextFailSafeKind, { title: string; message: string }> = {
    REVISION_CONFLICT: {
      title: '行程刚刚发生了新的变化',
      message: '你当前看到的版本已不是最新状态。请先查看最新变化后再重试。',
    },
    WRITE_FAILED: {
      title: '这次修改没有完成',
      message: '当前行程保持不变，请稍后重试。',
    },
    CONSTRAINT_BLOCKED: {
      title: '修改未通过约束检查',
      message: '该调整与当前硬约束冲突。有效行程未被修改。',
    },
    STALE_FACTS: {
      title: '部分依据信息可能已过期',
      message: '监控或证据数据需要刷新。在确认前请勿自动应用 AI 建议。',
    },
    AUTHORITY_BLOCKED: {
      title: '需要更高权限才能应用',
      message: '此变更超出当前用户的决策权链。请邀请行程所有者确认。',
    },
  };

  const copy = messages[kind];
  return {
    kind,
    title: scenario?.title ?? copy.title,
    message: scenario?.description ?? copy.message,
    preserveEffectivePlan,
  };
}
