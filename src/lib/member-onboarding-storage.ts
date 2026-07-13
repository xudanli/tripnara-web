import type { MemberOnboardingDraft, MemberOnboardingStepId } from '@/types/member-onboarding';

const STORAGE_PREFIX = 'tripnara_member_onboarding:';

function storageKey(token: string): string {
  return `${STORAGE_PREFIX}${token}`;
}

export function createEmptyMemberOnboardingDraft(token: string): MemberOnboardingDraft {
  return {
    inviteToken: token,
    displayName: '',
    tripRole: 'MEMBER',
    coreWishes: ['', '', ''],
    mustExperience: '',
    avoidExperience: '',
    pacePreference: 'moderate',
    earlyRiser: false,
    lodgingPreference: '',
    dietRestrictions: '',
    healthNotes: '',
    personalSpendingLevel: 'moderate',
    personalSpendingNotes: '',
    acceptSplitGroup: 'depends',
    splitGroupNotes: '',
    privateNotes: '',
    privateNotesAuth: 'SANITIZED_TO_ADVISOR',
    currentStepId: 'role',
    updatedAt: new Date().toISOString(),
  };
}

export function readMemberOnboardingDraft(token: string): MemberOnboardingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return null;
    return JSON.parse(raw) as MemberOnboardingDraft;
  } catch {
    return null;
  }
}

export function writeMemberOnboardingDraft(draft: MemberOnboardingDraft): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    storageKey(draft.inviteToken),
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
  );
}

export function clearMemberOnboardingDraft(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(token));
}

export function validateMemberOnboardingStep(
  stepId: MemberOnboardingStepId,
  draft: MemberOnboardingDraft,
): string | null {
  switch (stepId) {
    case 'role':
      if (!draft.displayName.trim()) return '请填写你的姓名或昵称';
      return null;
    case 'core-wish': {
      const filled = draft.coreWishes.filter((w) => w.trim()).length;
      if (filled < 1) return '请至少选择 1 项核心愿望';
      return null;
    }
    case 'review':
      return validateMemberOnboardingStep('role', draft)
        ?? validateMemberOnboardingStep('core-wish', draft);
    default:
      return null;
  }
}
