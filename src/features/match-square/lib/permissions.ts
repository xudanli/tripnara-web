import type { MatchSquareAccess } from '@/types/match-square';
import type { AccountCapabilities } from '@/types/account-governance';
import type { OdysseyOnboardingStatus } from '@/types/odyssey-intake';
import {
  defaultMatchSquareAccessR0,
  deriveMatchSquareAccessFromCapabilities,
  publishingBlockReason,
} from '@/lib/account-governance';

/**
 * Match Square 访问权限（R0：与订阅/入网解耦，公开发布依赖 PublishingPermission）
 */
export function deriveMatchSquareAccess(
  onboarding?: OdysseyOnboardingStatus,
  capabilities?: AccountCapabilities | null
): MatchSquareAccess {
  if (capabilities) {
    return deriveMatchSquareAccessFromCapabilities(capabilities);
  }

  const base = defaultMatchSquareAccessR0();
  if (onboarding?.quizComplete) {
    return { ...base, canApply: true, quizComplete: true };
  }
  return base;
}

export function permissionBlockMessage(
  action: 'post' | 'apply',
  capabilities?: AccountCapabilities | null
): string {
  if (action === 'post') {
    return publishingBlockReason(capabilities?.publishingPermission ?? null);
  }
  return '请完成手机号或邮箱验证后，再申请加入项目。';
}
