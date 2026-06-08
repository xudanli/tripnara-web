import type { MatchFlashPayload, RecruitmentPostCard } from '@/types/match-square';
import type { ViewerSlotProfile } from './slot-filling';

export const MATCH_FLASH_THRESHOLD = 88;

export function pickMatchFlashCandidate(
  items: RecruitmentPostCard[]
): RecruitmentPostCard | null {
  const eligible = items.filter(
    (p) => (p.compatibilityPercent ?? 0) >= MATCH_FLASH_THRESHOLD && p.status === 'active'
  );
  if (!eligible.length) return null;
  return eligible.sort(
    (a, b) => (b.compatibilityPercent ?? 0) - (a.compatibilityPercent ?? 0)
  )[0];
}

export function buildMatchFlashPayload(
  post: RecruitmentPostCard,
  viewer?: ViewerSlotProfile | null
): MatchFlashPayload {
  const pct = post.compatibilityPercent ?? MATCH_FLASH_THRESHOLD;
  const captainShort = post.captainCardTitle.replace(/型|者/g, '').slice(0, 8);
  const vehicleHint = viewer?.vehicleLabel ? `（${viewer.vehicleLabel}）` : '';
  const photoHint = viewer?.likesPhoto ? '、喜欢拍照' : '';

  const skills: string[] = [];
  if (viewer?.canDrive) skills.push('会开车');
  if (viewer?.likesPhoto) skills.push('会拍照');
  const skillLine = skills.length
    ? `队长 ${captainShort} 缺的正是「${skills.join(' + ')}」，与你的 Profile${vehicleHint}${photoHint} 高度重合。`
    : `你与 ${captainShort} 在消费弹性与行程节奏上高度同频。`;

  return {
    postId: post.id,
    compatibilityPercent: pct,
    verdictTitle: '算法发现：你与这个车队存在「宿命级同频」',
    verdictBody: `你们是平台极其罕见的低冲突组合：消费弹性高、深度松弛派。${skillLine}`,
    rarityTag: '0 吵架风险组合',
    ctaPrimary: '闪速补位',
    ctaSecondary: '勾搭一下',
  };
}

export type PlazaFeedItem =
  | { kind: 'post'; post: RecruitmentPostCard }
  | { kind: 'flash'; post: RecruitmentPostCard; flash: MatchFlashPayload };

/** 在第 1 与第 2 张卡片之间插入 Match Flash */
export function buildPlazaFeedWithFlash(
  items: RecruitmentPostCard[],
  viewer?: ViewerSlotProfile | null
): PlazaFeedItem[] {
  if (items.length < 2) {
    return items.map((post) => ({ kind: 'post', post }));
  }

  const flashPost = pickMatchFlashCandidate(items);
  if (!flashPost) {
    return items.map((post) => ({ kind: 'post', post }));
  }

  const flash = buildMatchFlashPayload(flashPost, viewer);
  const rest = items.filter((p) => p.id !== flashPost.id);
  const first = rest[0] ?? items[0];

  const feed: PlazaFeedItem[] = [{ kind: 'post', post: first }];
  feed.push({ kind: 'flash', post: flashPost, flash });
  rest.slice(1).forEach((post) => feed.push({ kind: 'post', post }));

  return feed;
}
