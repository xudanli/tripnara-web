import type { RecruitmentPostCard } from '@/types/match-square';

/** PRD 3.15 §2 · 前端展示「锁死阵容」入口 */
export function canShowForceLockEntry(post: RecruitmentPostCard): boolean {
  if (post.sovereignLock) return false;
  if (post.status !== 'active') return false;

  const { slotsFilled, slotsNeeded } = post.teamStatus;
  return slotsFilled >= 1 && slotsFilled < slotsNeeded;
}
