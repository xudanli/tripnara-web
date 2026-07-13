import type { MemberOnboardingStepId } from '@/types/member-onboarding';

export interface MemberOnboardingStepDef {
  id: MemberOnboardingStepId;
  label: string;
  title: string;
  subtitle: string;
}

export const MEMBER_ONBOARDING_STEPS: readonly MemberOnboardingStepDef[] = [
  {
    id: 'role',
    label: '身份角色',
    title: '身份与角色',
    subtitle: '确认你在本次行程中的身份。无需填写总预算或编排行程。',
  },
  {
    id: 'core-wish',
    label: '核心愿望',
    title: '本次核心愿望',
    subtitle: '点选 1～3 项即可，无需长篇描述。',
  },
  {
    id: 'experience',
    label: '体验活动',
    title: '想体验与不想体验',
    subtitle: '点选标签即可，几乎不用打字。',
  },
  {
    id: 'pace',
    label: '体力节奏',
    title: '体力与节奏',
    subtitle: '点选节奏与步行上限。',
  },
  {
    id: 'lodging',
    label: '住宿',
    title: '住宿偏好',
    subtitle: '点选住宿特点即可。',
  },
  {
    id: 'diet-health',
    label: '饮食健康',
    title: '饮食与健康限制',
    subtitle: '点选饮食与健康标签，必要时补一句。',
  },
  {
    id: 'spending',
    label: '消费',
    title: '个人消费偏好',
    subtitle: '点选档位即可，补充说明可选。',
  },
  {
    id: 'grouping',
    label: '分组',
    title: '是否接受分组',
    subtitle: '点选你的态度，补充说明可选。',
  },
  {
    id: 'private-notes',
    label: '私密想法',
    title: '私密想法',
    subtitle: '点选顾虑类型即可；选「暂无补充」可跳过输入。',
  },
  {
    id: 'review',
    label: '确认',
    title: '信息确认',
    subtitle: '请核对以下内容，提交后顾问将据此设计行程。',
  },
] as const;

export function memberOnboardingStepIndex(stepId: MemberOnboardingStepId): number {
  return MEMBER_ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
}

export function memberOnboardingStepDef(stepId: MemberOnboardingStepId): MemberOnboardingStepDef {
  return MEMBER_ONBOARDING_STEPS.find((s) => s.id === stepId) ?? MEMBER_ONBOARDING_STEPS[0];
}

export function nextMemberOnboardingStepId(
  stepId: MemberOnboardingStepId,
): MemberOnboardingStepId | null {
  const idx = memberOnboardingStepIndex(stepId);
  if (idx < 0 || idx >= MEMBER_ONBOARDING_STEPS.length - 1) return null;
  return MEMBER_ONBOARDING_STEPS[idx + 1].id;
}

export function prevMemberOnboardingStepId(
  stepId: MemberOnboardingStepId,
): MemberOnboardingStepId | null {
  const idx = memberOnboardingStepIndex(stepId);
  if (idx <= 0) return null;
  return MEMBER_ONBOARDING_STEPS[idx - 1].id;
}

export function memberOnboardingPath(token: string, stepId: MemberOnboardingStepId): string {
  return `/member/${encodeURIComponent(token)}/onboarding/${stepId}`;
}

export function memberHomePath(token: string): string {
  return `/member/${encodeURIComponent(token)}/home`;
}

export function unifiedInvitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`;
}
