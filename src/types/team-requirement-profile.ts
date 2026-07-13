import type { MemberOnboardingDraft } from '@/types/member-onboarding';

/** 已提交的成员 Onboarding 画像（顾问可读，含隐私过滤字段） */
export interface MemberOnboardingProfile extends Omit<MemberOnboardingDraft, 'privateNotes'> {
  userId: string;
  memberId?: string;
  /** 后端不返回原文；归一化后恒为空字符串 */
  privateNotes?: string;
  /** 后端按 privateNotesAuth 脱敏后给顾问的内容（邮箱/电话脱敏 + 200 字截断） */
  advisorVisiblePrivateNotes?: string | null;
}

export type TeamRequirementInfoGapReason =
  | 'onboarding_not_started'
  | 'onboarding_in_progress'
  | 'onboarding_not_submitted';

export interface TeamRequirementPendingMember {
  userId: string;
  displayName: string;
  role?: string;
  reason: TeamRequirementInfoGapReason;
}

export interface MemberOnboardingProfilesResponse {
  tripId: string;
  profiles: MemberOnboardingProfile[];
  pendingMembers?: TeamRequirementPendingMember[];
  generatedAt?: string;
  /** 数据来源：bff 为正式接口；trip_metadata 为 BFF 404 降级 */
  source?: 'bff' | 'trip_metadata';
}

export interface TeamRequirementMemberView {
  userId: string;
  displayName: string;
  roleLabel?: string;
  submitted: boolean;
  coreWishes: string[];
  hardConstraints: { must: string; avoid: string };
  pace: {
    preference: MemberOnboardingDraft['pacePreference'];
    preferenceLabel: string;
    earlyRiser: boolean;
    maxDailyWalkKm?: number;
  };
  lodging: string;
  diet: { restrictions: string; healthNotes: string };
  spending: {
    level: MemberOnboardingDraft['personalSpendingLevel'];
    levelLabel: string;
    notes: string;
  };
  splitGroup: {
    accept: MemberOnboardingDraft['acceptSplitGroup'];
    acceptLabel: string;
    notes: string;
  };
  privateConcern: {
    hasNotes: boolean;
    advisorVisible: boolean;
    summary?: string;
    auth: MemberOnboardingDraft['privateNotesAuth'];
  };
}

export type TeamSpreadSeverity = 'aligned' | 'mixed' | 'divergent';

export interface TeamSpreadInsight {
  label: string;
  summary: string;
  severity: TeamSpreadSeverity;
  detail?: string;
}

export interface TeamConflictItem {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source: 'onboarding' | 'friction' | 'both';
}

export interface TeamInfoGapItem {
  userId: string;
  displayName: string;
  role?: string;
  reason: TeamRequirementInfoGapReason;
  reasonLabel: string;
}

export interface TeamPrivacySummary {
  analystOnlyCount: number;
  sanitizedToAdvisorCount: number;
  totalWithPrivateNotes: number;
}

/** 顾问可用于规划的团队需求画像（聚合后） */
export interface TeamRequirementProfile {
  tripId: string;
  completionRate: number;
  submittedCount: number;
  expectedCount: number;
  members: TeamRequirementMemberView[];
  paceSpread: TeamSpreadInsight;
  spendingSpread: TeamSpreadInsight;
  splitWillingness: TeamSpreadInsight;
  potentialConflicts: TeamConflictItem[];
  informationGaps: TeamInfoGapItem[];
  privacySummary: TeamPrivacySummary;
  generatedAt?: string;
}
