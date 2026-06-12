import type { RecruitmentPostCard, TeamSlot, TeamStatus } from '@/types/match-square';

export type TeamRosterCounts = {
  filled: number;
  total: number;
  remaining: number;
};

/** 从 teamStatus / 拼图槽位推导「已占位 / 总名额」 */
export function resolveTeamRosterCounts(
  teamStatus?: TeamStatus | null,
  slots?: TeamSlot[]
): TeamRosterCounts | null {
  if (teamStatus) {
    const { slotsFilled, slotsNeeded, slotsRemaining } = teamStatus;
    const remaining =
      typeof slotsRemaining === 'number'
        ? slotsRemaining
        : Math.max(0, slotsNeeded - slotsFilled);

    // slotsNeeded = 还需招募的队员数（不含队长）
    if (slotsFilled + remaining === 1 + slotsNeeded && slotsNeeded >= 0) {
      return { filled: slotsFilled, total: 1 + slotsNeeded, remaining };
    }

    // slotsNeeded = 全队总名额（含队长）
    if (slotsFilled + remaining === slotsNeeded && slotsNeeded > 0) {
      return { filled: slotsFilled, total: slotsNeeded, remaining };
    }

    if (remaining > 0) {
      return { filled: slotsFilled, total: slotsFilled + remaining, remaining };
    }

    const total = Math.max(slotsNeeded, slotsFilled, 1);
    return { filled: slotsFilled, total, remaining: Math.max(0, total - slotsFilled) };
  }

  if (slots?.length) {
    const filled = slots.filter((s) => s.kind === 'captain' || s.kind === 'filled').length;
    const total = slots.length;
    return { filled, total, remaining: Math.max(0, total - filled) };
  }

  return null;
}

/** 列表 / 详情 · 「1/5 · 缺 4 人」或「5/5 · 已满员」 */
export function formatTeamRosterLabel(
  post: Pick<RecruitmentPostCard, 'teamStatus' | 'status'>,
  slots?: TeamSlot[]
): string | null {
  const counts = resolveTeamRosterCounts(post.teamStatus, slots);
  if (!counts) return null;

  const ratio = `${counts.filled}/${counts.total}`;

  if (counts.remaining <= 0) {
    return post.status === 'closed' || counts.filled >= counts.total
      ? `${ratio} · 已满员`
      : `${ratio} · 名额已满`;
  }

  return `${ratio} · 缺 ${counts.remaining} 人`;
}

/** 招募是否已满员（结束招募 ≠ 组队成功，需单独判断） */
export function isRecruitmentTeamFull(
  post: Pick<RecruitmentPostCard, 'teamStatus' | 'teamPuzzle' | 'teamSlots'>
): boolean {
  const slots = post.teamPuzzle?.slots ?? post.teamSlots;
  const counts = resolveTeamRosterCounts(post.teamStatus, slots);
  if (counts) return counts.remaining <= 0;
  const remaining = post.teamStatus?.slotsRemaining;
  return typeof remaining === 'number' && remaining <= 0;
}

export function resolveRecruitmentClosureCopy(
  post: Pick<RecruitmentPostCard, 'teamStatus' | 'teamPuzzle' | 'teamSlots' | 'status'>
): {
  teamFull: boolean;
  title: string;
  description: string;
  remaining: number;
} {
  const slots = post.teamPuzzle?.slots ?? post.teamSlots;
  const counts = resolveTeamRosterCounts(post.teamStatus, slots);
  const remaining = counts?.remaining ?? post.teamStatus?.slotsRemaining ?? 0;
  const teamFull = isRecruitmentTeamFull(post);

  if (teamFull) {
    return {
      teamFull: true,
      remaining: 0,
      title: '招募已结束 · 组队成功',
      description: '车队已满员，你仍可查看当时的车队拼图与行程信息。',
    };
  }

  return {
    teamFull: false,
    remaining: Math.max(0, remaining),
    title: '招募已结束',
    description:
      remaining > 0
        ? `队长提前结束招募，车队尚缺 ${remaining} 人。你仍可查看招募详情与已通过队员。`
        : '队长已结束招募，不再接收新申请。你仍可查看招募详情。',
  };
}
