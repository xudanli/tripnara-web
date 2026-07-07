import type { DecisionSpaceCollaborationContext } from '@/lib/decision-space-collaboration.util';
import type { DecisionOption } from '@/types/decision-problem';
import type { SilentVoteDetail } from '@/types/silent-votes';

export interface SilentVoteCreateDraft {
  title?: string;
  question?: string;
  options?: Array<{ id: string; label: string }>;
  autoOpen?: boolean;
}

export interface DecisionSpaceVoteDeepLink {
  voteId: string | null;
}

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase();
}

function topicsOverlap(left: string, right: string): boolean {
  const a = normalizeTopic(left);
  const b = normalizeTopic(right);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function resolveOptionLabel(option: Pick<DecisionOption, 'id' | 'label' | 'title'>, index: number): string {
  const label = option.label?.trim() || option.title?.trim();
  if (label) return label;
  return `方案 ${String.fromCharCode(65 + index)}`;
}

/** 从当前决策问题预填创建投票表单 */
export function buildDecisionSpaceVoteCreateDraft(
  context: DecisionSpaceCollaborationContext,
  options: Pick<DecisionOption, 'id' | 'label' | 'title'>[],
): SilentVoteCreateDraft {
  const title = context.problem?.title ?? context.conflict?.title ?? '方案选择';
  const question =
    context.conflict?.message?.trim() ||
    context.problem?.affectedScopeSummary?.trim() ||
    '请匿名选择更倾向的方案';

  const voteOptions = options.slice(0, 6).map((option, index) => ({
    id: option.id || `opt-${String.fromCharCode(97 + index)}`,
    label: resolveOptionLabel(option, index),
  }));

  return {
    title,
    question,
    autoOpen: true,
    options: voteOptions.length >= 2 ? voteOptions : undefined,
  };
}

/** @deprecated 决策空间「发起投票」现直接打开创建弹窗；保留供深链/列表场景 */
export function resolveDecisionSpaceVoteDeepLink(
  context: DecisionSpaceCollaborationContext,
  votes: Pick<SilentVoteDetail, 'id' | 'title' | 'status'>[],
): DecisionSpaceVoteDeepLink {
  const openVotes = votes.filter((vote) => vote.status === 'open');
  const topicTitle = context.problem?.title ?? context.conflict?.title ?? '';

  if (topicTitle) {
    const matched = openVotes.find((vote) => topicsOverlap(vote.title, topicTitle));
    if (matched) return { voteId: matched.id };
  }

  return { voteId: openVotes[0]?.id ?? null };
}
