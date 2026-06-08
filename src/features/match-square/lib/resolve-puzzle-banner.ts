import type { ViewerPuzzleMatch } from '@/types/match-square';

/** 灵魂拼图置顶横幅最低契合度门槛 */
export const SOUL_PIECE_SCORE_THRESHOLD = 80;

export const SOFT_PUZZLE_BANNER =
  '🧩 尝试补位？点击查看你们的互补指南';

export type PuzzleBannerTone = 'soul' | 'soft';

export type PuzzleBanner = {
  tone: PuzzleBannerTone;
  message: string;
};

/** 按契合度决定拼图横幅文案，避免低分仍显示「灵魂拼图」 */
export function resolvePuzzleBanner(
  viewerPuzzleMatch: ViewerPuzzleMatch | null | undefined,
  compatibilityPercent: number | null | undefined
): PuzzleBanner | null {
  if (!viewerPuzzleMatch?.isSoulPiece) return null;

  const score = compatibilityPercent ?? 0;
  if (score >= SOUL_PIECE_SCORE_THRESHOLD) {
    return {
      tone: 'soul',
      message: viewerPuzzleMatch.headline || '你正是本队缺少的灵魂拼图',
    };
  }

  return {
    tone: 'soft',
    message: SOFT_PUZZLE_BANNER,
  };
}
