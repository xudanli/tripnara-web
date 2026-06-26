import type { SilentVoteIntensity, SilentVoteStatus } from '@/types/silent-votes';

export const SILENT_VOTE_STATUS_LABEL: Record<SilentVoteStatus, string> = {
  draft: '草稿',
  open: '进行中',
  closed: '已关闭',
};

export const SILENT_VOTE_INTENSITY_LABEL: Record<SilentVoteIntensity, string> = {
  1: '无所谓',
  2: '略在意',
  3: '一般',
  4: '比较在意',
  5: '非常在意',
};

export const SILENT_VOTE_INTENSITY_QUESTION = '你有多在意最终采用这个方案？';

export const SILENT_VOTE_K_ANON_THRESHOLD = 3;

export function kAnonymityHint(submittedCount: number, eligibleCount: number): string {
  return `已有 ${submittedCount}/${eligibleCount} 人投票，满 ${SILENT_VOTE_K_ANON_THRESHOLD} 人后将展示分布`;
}

export function participationLabel(submittedCount: number, eligibleCount: number): string {
  const rate = eligibleCount > 0 ? Math.round((submittedCount / eligibleCount) * 100) : 0;
  return `${submittedCount}/${eligibleCount} 人已投票（${rate}%）`;
}
