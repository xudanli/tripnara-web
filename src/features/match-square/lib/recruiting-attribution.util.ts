import type {
  RecruitingAttribution,
  RecruitingPrimaryReason,
  RecruitmentApplicationCard,
  RecruitmentPostCard,
  ReviewApplicationAttributionContext,
} from '@/types/match-square';
import { computeApplicantPostCompatibility } from './match-enrichment';
import { computeMbtiSynergy } from './match-engine/mbti-synergy';

const REASON_LABELS: Record<RecruitingPrimaryReason, string> = {
  COMPATIBILITY_MATCH: '兼容性匹配',
  SKILL_REQUIREMENT: '技能需求',
  SCHEDULE_ALIGNMENT: '时间协调',
  BUDGET_ALIGNMENT: '预算匹配',
  PERSONA_FIT: '个性匹配',
  CAPTAIN_PREFERENCE: '队长偏好',
  SLOT_REQUIREMENT: '岗位需求',
  TEAM_BALANCE: '团队平衡',
  EXTERNAL_FACTOR: '外部因素',
  GOVERNANCE: '治理规则',
  REPUTATION_SCORE: '信用评分',
  PAST_COLLABORATION: '过往合作',
};

const SIGNAL_LABELS: Record<string, string> = {
  MBTI_COMPATIBILITY: 'MBTI 兼容性',
  SKILL_MATCH: '技能匹配',
  TIME_AVAILABILITY: '时间可用性',
  BUDGET_FIT: '预算匹配',
  TEAM_BALANCE: '团队平衡',
  REPUTATION: '信用评分',
  COMPATIBILITY: '总体兼容性',
};

export function getRecruitingReasonLabel(reason: string): string {
  return REASON_LABELS[reason as RecruitingPrimaryReason] ?? reason;
}

export function getRecruitingSignalLabel(key: string): string {
  return SIGNAL_LABELS[key] ?? key.replace(/_/g, ' ');
}

function mbtiCompatibilityLevel(
  applicantMbti: string,
  captainMbti: string
): 'high' | 'medium' | 'low' {
  const synergy = computeMbtiSynergy(captainMbti, applicantMbti);
  const normalized = Math.min(1, synergy / 15);
  if (normalized > 0.7) return 'high';
  if (normalized > 0.4) return 'medium';
  return 'low';
}

function mbtiCompatibilityScore(applicantMbti: string, captainMbti: string): number {
  return Math.min(1, computeMbtiSynergy(captainMbti, applicantMbti) / 15);
}

function extractSkillsFromBrief(
  application: RecruitmentApplicationCard
): string[] {
  const brief = application.decisionBrief;
  if (!brief) return [];
  const skills: string[] = [];
  if (brief.suggestedSceneRoleLabel?.trim()) {
    skills.push(brief.suggestedSceneRoleLabel.trim());
  }
  if (brief.suggestedSceneRoleAnchor?.trim()) {
    skills.push(brief.suggestedSceneRoleAnchor.trim());
  }
  return skills;
}

function resolveRequiredSkills(post: RecruitmentPostCard): string[] {
  const fromSlots =
    post.teamPuzzle?.slots
      ?.filter((s) => s.kind === 'open' && s.roleLabel)
      .map((s) => s.roleLabel!)
      .filter(Boolean) ?? [];
  if (fromSlots.length) return fromSlots;
  return post.teamSlots?.filter((s) => s.kind === 'open').map((s) => s.label).filter(Boolean) ?? [];
}

function assessBudgetFit(
  post: RecruitmentPostCard
): 'perfect' | 'acceptable' | 'poor' {
  if (!post.budgetRange?.minCents && !post.budgetRange?.maxCents) {
    return 'acceptable';
  }
  return 'acceptable';
}

function assessTimeAvailability(
  application: RecruitmentApplicationCard,
  post: RecruitmentPostCard
): 'excellent' | 'good' | 'poor' {
  if (application.warnings.some((w) => w.includes('时间') || w.includes('档期'))) {
    return 'poor';
  }
  if (application.highlights.some((h) => h.includes('节奏') || h.includes('同频'))) {
    return 'excellent';
  }
  if (post.startDate && post.endDate) return 'good';
  return 'good';
}

function hasScheduleConflict(application: RecruitmentApplicationCard): boolean {
  return application.warnings.some(
    (w) => w.includes('时间冲突') || w.includes('档期') || w.includes('schedule')
  );
}

function computeRoleBalance(
  post: RecruitmentPostCard,
  approvedApplications: RecruitmentApplicationCard[],
  applicant: RecruitmentApplicationCard
): number {
  const roles = new Map<string, number>();
  for (const app of approvedApplications) {
    const role = app.targetSlotLabel ?? app.applicantCardTitle;
    if (role) roles.set(role, (roles.get(role) ?? 0) + 1);
  }
  const applicantRole = applicant.targetSlotLabel ?? applicant.applicantCardTitle;
  if (applicantRole) roles.set(applicantRole, (roles.get(applicantRole) ?? 0) + 1);

  const openSlots = post.teamPuzzle?.slots?.filter((s) => s.kind === 'open').length ?? 1;
  const total = Math.max(approvedApplications.length + 1, openSlots + approvedApplications.length);
  if (total <= 1) return 1;

  const maxCount = Math.max(...roles.values(), 1);
  return Math.max(0, 1 - maxCount / total);
}

function skillMatchScore(required: string[], applicant: string[]): number {
  if (!required.length) return 0.7;
  if (!applicant.length) return 0.5;
  const matchCount = required.filter((s) =>
    applicant.some((a) => a.includes(s) || s.includes(a))
  ).length;
  return matchCount / required.length;
}

/** 审批时自动收集归因上下文（方案 A） */
export function buildReviewAttributionContext(
  application: RecruitmentApplicationCard,
  post: RecruitmentPostCard,
  approvedApplications: RecruitmentApplicationCard[] = [],
  manualOverrides: Partial<ReviewApplicationAttributionContext> = {}
): ReviewApplicationAttributionContext {
  const compatibilityPercent = computeApplicantPostCompatibility(application, post);
  const compatibilityScore = compatibilityPercent / 100;

  const applicantMbti = application.applicantMbtiType?.trim() || 'INTJ';
  const captainMbti = post.captainMbtiType?.trim() || 'INTJ';

  const requiredSkills = manualOverrides.requiredSkills ?? resolveRequiredSkills(post);
  const applicantSkills =
    manualOverrides.applicantSkills ??
    extractSkillsFromBrief(application).length
      ? extractSkillsFromBrief(application)
      : application.targetSlotLabel
        ? [application.targetSlotLabel]
        : [];

  const roleBalance = computeRoleBalance(post, approvedApplications, application);

  const base: ReviewApplicationAttributionContext = {
    compatibilityScore,
    mbtiCompatibility: mbtiCompatibilityLevel(applicantMbti, captainMbti),
    requiredSkills,
    applicantSkills,
    scheduleConflict: hasScheduleConflict(application),
    timeAvailability: assessTimeAvailability(application, post),
    budgetFit: assessBudgetFit(post),
    slotRequirement: application.targetSlotLabel ?? undefined,
    teamBalance: {
      genderBalance: 0.5,
      ageBalance: 0.5,
      roleBalance,
    },
    reputationScore:
      application.applicantReputationStars != null
        ? Math.round(application.applicantReputationStars * 20)
        : undefined,
    pastCollaboration: false,
  };

  return { ...base, ...manualOverrides };
}

export function recruitingSignalBarColor(score: number): string {
  if (score > 0.7) return 'bg-gate-allow-foreground';
  if (score > 0.4) return 'bg-amber-500';
  return 'bg-gate-reject-foreground';
}

export function recruitingConfidenceBadgeVariant(
  level: RecruitingAttribution['confidence']
): 'default' | 'secondary' | 'outline' {
  if (level === 'HIGH') return 'default';
  if (level === 'MEDIUM') return 'secondary';
  return 'outline';
}

export function recruitingSuccessLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    EXCELLENT: '优秀',
    GOOD: '良好',
    ACCEPTABLE: '可接受',
    POOR: '较差',
    FAILED: '失败',
  };
  return labels[level] ?? level;
}

export function recruitingSuccessLevelColor(level: string): string {
  const colors: Record<string, string> = {
    EXCELLENT: 'bg-gate-allow text-gate-allow-foreground border-gate-allow-border',
    GOOD: 'bg-muted/15 text-muted-foreground border-border',
    ACCEPTABLE: 'bg-amber-100 text-amber-800 border-amber-200',
    POOR: 'bg-orange-100 text-orange-800 border-orange-200',
    FAILED: 'bg-gate-reject text-gate-reject-foreground border-gate-reject-border',
  };
  return colors[level] ?? 'bg-muted text-muted-foreground';
}

export function orderedSignalScores(
  signalScores: Record<string, number>
): Array<{ key: string; label: string; score: number }> {
  const priority = [
    'MBTI_COMPATIBILITY',
    'SKILL_MATCH',
    'TIME_AVAILABILITY',
    'BUDGET_FIT',
    'TEAM_BALANCE',
    'REPUTATION',
    'COMPATIBILITY',
  ];

  const entries = Object.entries(signalScores).map(([key, score]) => ({
    key,
    label: getRecruitingSignalLabel(key),
    score: typeof score === 'number' ? score : 0,
  }));

  return entries.sort((a, b) => {
    const ai = priority.indexOf(a.key);
    const bi = priority.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

/** Mock / dev：由审批上下文合成归因（后端异步返回前的本地预览） */
export function synthesizeAttributionFromContext(
  action: 'approve' | 'reject',
  context: ReviewApplicationAttributionContext
): RecruitingAttribution {
  const mbtiScore =
    context.mbtiCompatibility === 'high'
      ? 0.85
      : context.mbtiCompatibility === 'medium'
        ? 0.55
        : 0.3;

  const skillScore = skillMatchScore(
    context.requiredSkills ?? [],
    context.applicantSkills ?? []
  );

  const timeScore =
    context.scheduleConflict || context.timeAvailability === 'poor'
      ? 0.25
      : context.timeAvailability === 'excellent'
        ? 0.9
        : 0.65;

  const budgetScore =
    context.budgetFit === 'perfect' ? 0.95 : context.budgetFit === 'poor' ? 0.3 : 0.6;

  const teamScore = context.teamBalance?.roleBalance ?? 0.5;
  const reputationScore =
    context.reputationScore != null ? Math.min(1, context.reputationScore / 100) : 0.5;

  const signalScores: Record<string, number> = {
    MBTI_COMPATIBILITY: mbtiScore,
    SKILL_MATCH: skillScore,
    TIME_AVAILABILITY: timeScore,
    BUDGET_FIT: budgetScore,
    TEAM_BALANCE: teamScore,
    REPUTATION: reputationScore,
    COMPATIBILITY: context.compatibilityScore ?? 0.5,
  };

  const scores = Object.values(signalScores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  let primaryReason: RecruitingPrimaryReason = 'COMPATIBILITY_MATCH';
  if (context.captainPreference?.trim()) {
    primaryReason = action === 'reject' ? 'CAPTAIN_PREFERENCE' : 'COMPATIBILITY_MATCH';
  } else if (skillScore >= 0.8) {
    primaryReason = 'SKILL_REQUIREMENT';
  } else if (mbtiScore >= 0.75) {
    primaryReason = 'PERSONA_FIT';
  } else if (context.slotRequirement) {
    primaryReason = 'SLOT_REQUIREMENT';
  } else if (action === 'reject' && timeScore < 0.4) {
    primaryReason = 'SCHEDULE_ALIGNMENT';
  }

  const confidence: RecruitingAttribution['confidence'] =
    avg >= 0.7 ? 'HIGH' : avg >= 0.45 ? 'MEDIUM' : 'LOW';

  return {
    causeType: action === 'reject' && context.governanceFlags?.length ? 'GOVERNANCE' : 'USER_ACTION',
    primaryReason,
    reasonCodes: [primaryReason, action === 'approve' ? 'APPROVED' : 'REJECTED'],
    signalScores,
    confidence,
    metadata: {
      compatibilityScore: context.compatibilityScore,
      skillMatchScore: skillScore,
      scheduleMatchScore: timeScore,
      budgetMatchScore: budgetScore,
    },
  };
}

export { mbtiCompatibilityScore };
