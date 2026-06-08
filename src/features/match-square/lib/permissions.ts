import type { MatchSquareAccess } from '@/types/match-square';
import type { OdysseyOnboardingStatus } from '@/types/odyssey-intake';

export function deriveMatchSquareAccess(
  onboarding: OdysseyOnboardingStatus | undefined
): MatchSquareAccess {
  const quizComplete = onboarding?.quizComplete === true;
  return {
    canBrowse: true,
    canPost: quizComplete,
    canApply: quizComplete,
    quizComplete,
  };
}

export function permissionBlockMessage(action: 'post' | 'apply'): string {
  if (action === 'post') {
    return '完成 Odyssey Premium 入网（MBTI 自选 + 背书 + 行中博弈题）后，才能发起招募帖。';
  }
  return '完成 Odyssey Premium 入网后，才能申请加入队伍。';
}
