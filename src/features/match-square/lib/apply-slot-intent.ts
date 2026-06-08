import type { RecruitmentPostCard, TeamSlot } from '@/types/match-square';
import { compactPuzzleSlotLabel } from './compact-puzzle-slot-label';
import { resolveTeamSlots, type ViewerSlotProfile } from './slot-filling';

export type ApplySlotIntent = {
  slotIndex: number;
  slotId: string;
  /** UI 展示文案 */
  label: string;
  /** 提交给后端的 roleLabel（与 teamPuzzle.slots[].roleLabel 对齐） */
  roleLabel?: string;
  aiRationale?: string;
  recommended: boolean;
  matchScore: number;
};

const AUTO_SLOT_VALUE = 'auto';

export { AUTO_SLOT_VALUE };

function scoreSlotForViewer(slot: TeamSlot, viewer?: ViewerSlotProfile | null): number {
  if (!viewer) return slot.highlightForViewer ? 10 : 0;

  let score = 0;
  const haystack = [slot.label, slot.roleLabel, slot.aiRationale].filter(Boolean).join(' ');

  if (slot.highlightForViewer) score += 50;
  if (typeof slot.viewerMatchScore === 'number') score += slot.viewerMatchScore;

  if (viewer.mbtiType && haystack.includes(viewer.mbtiType)) score += 35;
  if (viewer.personaTitle && haystack.includes(viewer.personaTitle)) score += 20;
  if (viewer.canDrive && /开车|驾驶|司机|换胎|老司机/i.test(haystack)) score += 25;
  if (viewer.likesPhoto && /摄影|拍照|出片|视觉|UX|UI|设计/i.test(haystack)) score += 20;
  if (/E人|气氛组|ENFP|ESFP/i.test(haystack) && viewer.mbtiType?.startsWith('E')) score += 15;
  if (/ISFJ|互补|SJ|守护/i.test(haystack) && viewer.mbtiType?.includes('SJ')) score += 15;

  return score;
}

/** 申请弹窗 — 开放补位 + 系统推荐排序 */
export function resolveApplySlotIntents(
  post: RecruitmentPostCard,
  viewer?: ViewerSlotProfile | null
): ApplySlotIntent[] {
  return resolveTeamSlots(post, viewer)
    .filter((slot) => slot.kind === 'open')
    .map((slot, index) => {
      const matchScore = scoreSlotForViewer(slot, viewer);
      return {
        slotIndex: slot.slotIndex ?? index + 1,
        slotId: slot.id,
        label: compactPuzzleSlotLabel(slot.label),
        roleLabel: slot.roleLabel ?? slot.label,
        aiRationale: slot.aiRationale ?? undefined,
        recommended: Boolean(slot.highlightForViewer) || matchScore >= 30,
        matchScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function pickDefaultApplySlotId(intents: ApplySlotIntent[]): string {
  if (!intents.length) return AUTO_SLOT_VALUE;
  const top = intents[0];
  if (top.recommended && top.matchScore >= 20) return top.slotId;
  return AUTO_SLOT_VALUE;
}

export function resolveApplySlotPayload(
  intents: ApplySlotIntent[],
  selectedSlotId: string | null
): {
  targetSlotIndex?: number;
  targetSlotId?: string;
  targetSlotLabel?: string;
} {
  if (!selectedSlotId || selectedSlotId === AUTO_SLOT_VALUE) return {};
  const intent = intents.find((item) => item.slotId === selectedSlotId);
  if (!intent) return {};
  return {
    targetSlotIndex: intent.slotIndex,
    targetSlotId: intent.slotId,
    targetSlotLabel: intent.roleLabel ?? intent.label,
  };
}
