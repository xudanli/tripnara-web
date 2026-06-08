import type { RecruitmentPostCard } from '@/types/match-square';
import type { SovereignForceLockPreview } from '@/types/sovereign-force-lock';
import { canShowForceLockEntry } from './resolve-force-lock-visibility';

/** Mock / 本地兜底 — preview 接口不可用时 */
export function buildForceLockPreviewFromPost(post: RecruitmentPostCard): SovereignForceLockPreview {
  const { slotsFilled, slotsNeeded } = post.teamStatus;
  const canForceLock = canShowForceLockEntry(post);
  const openSlots = Math.max(0, slotsNeeded - slotsFilled);

  const droppedOpenSlots = (post.teamPuzzle?.slots ?? post.teamSlots ?? [])
    .filter((slot) => slot.kind === 'open')
    .map((slot, index) => ({
      slotIndex: slot.slotIndex ?? index,
      slotId: slot.id,
      roleLabel: slot.roleLabel ?? slot.label,
      deficitTag: slot.deficitDimension ?? 'preference',
    }));

  const previousSplitBase = 1 + slotsNeeded;
  const actualSplitBase = 1 + slotsFilled;

  return {
    postId: post.id,
    canForceLock,
    blockReason: canForceLock
      ? null
      : post.sovereignLock
        ? '已执行过强制成团'
        : post.status !== 'active'
          ? '招募未处于进行中'
          : slotsFilled < 1
            ? '至少需要 1 名已通过队员'
            : '当前已满员',
    currentCrew: [],
    droppedOpenSlots,
    physicalDeficits: openSlots > 0 ? [`开放拼图位 ${openSlots} 个将被裁剪`] : [],
    resilienceScore: Math.max(35, 100 - openSlots * 15),
    vaultRecalc: {
      previousSplitBase,
      actualSplitBase,
      budgetPerPersonCents: post.budgetRange?.maxCents ?? post.budgetRange?.minCents ?? null,
      summaryLine: `公摊基数由 ${previousSplitBase} 人缩编为 ${actualSplitBase} 人`,
    },
    pendingApplicationsToReject: 0,
    confirmHeadline: '确认锁死当前阵容？',
    confirmLines: [
      `将 ${slotsNeeded} 人编制缩编为 ${slotsFilled + 1} 人（含队长）`,
      '所有待审批入队申请将被拒绝',
      '招募状态变为 closed，并尝试实例化 Active Trip',
    ],
  };
}
