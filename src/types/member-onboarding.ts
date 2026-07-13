/**
 * 成员接受邀请后的 10 步偏好采集
 * submit → trip.metadata.memberOnboardingProfiles[userId]
 */

export type MemberOnboardingStepId =
  | 'role'
  | 'core-wish'
  | 'experience'
  | 'pace'
  | 'lodging'
  | 'diet-health'
  | 'spending'
  | 'grouping'
  | 'private-notes'
  | 'review';

/** 邀请表 roleSlot，accept 后写入 TripCollaborator */
export type TripMemberRoleSlot =
  | 'PAYER'
  | 'PRIMARY_CONTACT'
  | 'FINAL_CONFIRMER'
  | 'ADVISOR'
  | 'LEADER'
  | 'MEMBER'
  | 'GUARDIAN'
  | string;

/** onboarding 表单可选角色（客户端表达） */
export type MemberTripRole =
  | 'MEMBER'
  | 'PAYER'
  | 'FINAL_CONFIRMER'
  | 'GUARDIAN'
  | 'PRIMARY_CONTACT';

export interface MemberOnboardingDraft {
  inviteToken: string;
  tripId?: string;
  /** 来自 invite.roleSlot，accept 后应与 collaborator 一致 */
  roleSlot?: TripMemberRoleSlot;
  displayName: string;
  tripRole: MemberTripRole;
  guardianFor?: string;
  coreWishes: string[];
  mustExperience: string;
  avoidExperience: string;
  pacePreference: 'relaxed' | 'moderate' | 'active';
  earlyRiser: boolean;
  maxDailyWalkKm?: number;
  lodgingPreference: string;
  dietRestrictions: string;
  healthNotes: string;
  personalSpendingLevel: 'budget' | 'moderate' | 'premium';
  personalSpendingNotes: string;
  acceptSplitGroup: 'yes' | 'no' | 'depends';
  splitGroupNotes: string;
  privateNotes: string;
  privateNotesAuth: 'ANALYST_ONLY' | 'SANITIZED_TO_ADVISOR';
  currentStepId?: MemberOnboardingStepId;
  completedAt?: string;
  updatedAt?: string;
}

export interface MemberOnboardingSubmitResponse {
  tripId: string;
  memberId?: string;
  status: 'SUBMITTED';
  /** 固定 /member/{code}/home */
  homePath: string;
}

export interface AcceptTripMemberInviteResponse {
  tripId: string;
  memberId?: string;
  collaboratorId?: string;
  roleSlot?: TripMemberRoleSlot;
  alreadyAccepted?: boolean;
}

export interface TripMemberInviteContext {
  inviteCode: string;
  tripId: string;
  label?: string;
  roleSlot?: TripMemberRoleSlot;
  tripName?: string;
  destination?: string;
  roleHint?: string;
  expired?: boolean;
  accepted?: boolean;
  onboardingRequired?: boolean;
  onboardingCompleted?: boolean;
}
