import type { TripMemberInviteContext } from '@/types/member-onboarding';

export type MemberTripPhase = 'onboarding' | 'planning' | 'execution' | 'completion';

export type TripLifecycleStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MemberTripPhaseInput {
  tripStatus?: TripLifecycleStatus;
  inviteContext?: TripMemberInviteContext | null;
}

export function resolveMemberTripPhase(input: MemberTripPhaseInput): MemberTripPhase {
  if (input.inviteContext?.onboardingRequired && !input.inviteContext.onboardingCompleted) {
    return 'onboarding';
  }

  switch (input.tripStatus) {
    case 'IN_PROGRESS':
      return 'execution';
    case 'COMPLETED':
      return 'completion';
    case 'CANCELLED':
      return 'planning';
    case 'PLANNING':
    default:
      return 'planning';
  }
}

export const MEMBER_TRIP_PHASE_LABELS: Record<MemberTripPhase, string> = {
  onboarding: '完善偏好',
  planning: '规划阶段',
  execution: '行中阶段',
  completion: '行程结束',
};

export const MEMBER_TRIP_PHASE_HINTS: Record<MemberTripPhase, string> = {
  onboarding: '完成 10 步偏好采集，顾问才能准确设计方案。',
  planning: '顾问主导设计；你只需确认与个人相关的安排。',
  execution: '关注今日安排与待你确认项；重大变更会单独推送。',
  completion: '欢迎反馈满意度，帮助顾问更新你的偏好画像。',
};
