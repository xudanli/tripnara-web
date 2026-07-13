import type { MemberOnboardingDraft } from '@/types/member-onboarding';
import type { HighRiskAlert } from '@/types/trip-decision-profiling';
import type {
  MemberOnboardingProfilesResponse,
  MemberOnboardingProfile,
  TeamConflictItem,
  TeamInfoGapItem,
  TeamPrivacySummary,
  TeamRequirementMemberView,
  TeamRequirementProfile,
  TeamSpreadInsight,
  TeamSpreadSeverity,
} from '@/types/team-requirement-profile';

const PACE_LABELS: Record<MemberOnboardingDraft['pacePreference'], string> = {
  relaxed: '轻松',
  moderate: '适中',
  active: '高强度',
};

const SPENDING_LABELS: Record<MemberOnboardingDraft['personalSpendingLevel'], string> = {
  budget: '节省',
  moderate: '适中',
  premium: '品质优先',
};

const SPLIT_LABELS: Record<MemberOnboardingDraft['acceptSplitGroup'], string> = {
  yes: '接受',
  no: '不接受',
  depends: '视情况',
};

const GAP_REASON_LABELS: Record<TeamInfoGapItem['reason'], string> = {
  onboarding_not_started: '尚未开始填写',
  onboarding_in_progress: '填写中，未提交',
  onboarding_not_submitted: '已填写但未提交',
};

export interface BuildTeamRequirementProfileInput {
  response: MemberOnboardingProfilesResponse;
  collaborators?: Array<{ userId: string; displayName?: string | null; role?: string }>;
  frictionAlerts?: HighRiskAlert[];
}

function nonEmptyWishes(wishes: string[]): string[] {
  return wishes.map((w) => w.trim()).filter(Boolean);
}

function resolveHasPrivateNotes(profile: MemberOnboardingProfile): boolean {
  if (profile.privateNotes?.trim()) return true;
  if (profile.advisorVisiblePrivateNotes?.trim()) return true;
  // 后端不返回 privateNotes 原文；ANALYST_ONLY 表示成员已提交私密信息
  if (profile.privateNotesAuth === 'ANALYST_ONLY') return true;
  return false;
}

function memberToView(
  profile: MemberOnboardingProfile,
  roleLabel?: string,
): TeamRequirementMemberView {
  const hasPrivate = resolveHasPrivateNotes(profile);
  const advisorVisible =
    hasPrivate &&
    profile.privateNotesAuth === 'SANITIZED_TO_ADVISOR' &&
    Boolean(profile.advisorVisiblePrivateNotes?.trim());

  return {
    userId: profile.userId,
    displayName: profile.displayName || '成员',
    roleLabel,
    submitted: Boolean(profile.completedAt),
    coreWishes: nonEmptyWishes(profile.coreWishes),
    hardConstraints: {
      must: profile.mustExperience.trim(),
      avoid: profile.avoidExperience.trim(),
    },
    pace: {
      preference: profile.pacePreference,
      preferenceLabel: PACE_LABELS[profile.pacePreference],
      earlyRiser: profile.earlyRiser,
      maxDailyWalkKm: profile.maxDailyWalkKm,
    },
    lodging: profile.lodgingPreference.trim(),
    diet: {
      restrictions: profile.dietRestrictions.trim(),
      healthNotes: profile.healthNotes.trim(),
    },
    spending: {
      level: profile.personalSpendingLevel,
      levelLabel: SPENDING_LABELS[profile.personalSpendingLevel],
      notes: profile.personalSpendingNotes.trim(),
    },
    splitGroup: {
      accept: profile.acceptSplitGroup,
      acceptLabel: SPLIT_LABELS[profile.acceptSplitGroup],
      notes: profile.splitGroupNotes.trim(),
    },
    privateConcern: {
      hasNotes: hasPrivate,
      advisorVisible,
      summary: advisorVisible ? profile.advisorVisiblePrivateNotes?.trim() : undefined,
      auth: profile.privateNotesAuth,
    },
  };
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function spreadSeverity(distinctCount: number): TeamSpreadSeverity {
  if (distinctCount <= 1) return 'aligned';
  if (distinctCount === 2) return 'mixed';
  return 'divergent';
}

function buildPaceSpread(members: TeamRequirementMemberView[]): TeamSpreadInsight {
  const submitted = members.filter((m) => m.submitted);
  const prefs = uniqueValues(submitted.map((m) => m.pace.preference));
  const severity = spreadSeverity(prefs.length);
  const labels = submitted.map((m) => `${m.displayName}：${m.pace.preferenceLabel}`);
  const walkRange = submitted
    .map((m) => m.pace.maxDailyWalkKm)
    .filter((km): km is number => typeof km === 'number');

  let detail: string | undefined;
  if (walkRange.length >= 2) {
    const min = Math.min(...walkRange);
    const max = Math.max(...walkRange);
    if (max - min >= 3) {
      detail = `日步行量 ${min}–${max} km`;
    }
  }

  const earlyCount = submitted.filter((m) => m.pace.earlyRiser).length;
  if (earlyCount > 0 && earlyCount < submitted.length) {
    detail = detail
      ? `${detail}；早起偏好不一致`
      : '部分成员偏好早起，部分不接受';
  }

  if (severity === 'aligned') {
    return {
      label: '体力节奏',
      summary: submitted.length ? `团队节奏一致（${PACE_LABELS[prefs[0]!]}）` : '暂无提交数据',
      severity,
      detail,
    };
  }

  return {
    label: '体力节奏',
    summary: `节奏差异：${prefs.map((p) => PACE_LABELS[p]).join(' / ')}`,
    severity,
    detail: detail ?? labels.join('；'),
  };
}

function buildSpendingSpread(members: TeamRequirementMemberView[]): TeamSpreadInsight {
  const submitted = members.filter((m) => m.submitted);
  const levels = uniqueValues(submitted.map((m) => m.spending.level));
  const severity = spreadSeverity(levels.length);

  if (severity === 'aligned') {
    return {
      label: '消费倾向',
      summary: submitted.length
        ? `消费档位一致（${SPENDING_LABELS[levels[0]!]}）`
        : '暂无提交数据',
      severity,
    };
  }

  return {
    label: '消费倾向',
    summary: `消费差异：${levels.map((l) => SPENDING_LABELS[l]).join(' / ')}`,
    severity,
    detail: submitted.map((m) => `${m.displayName}：${m.spending.levelLabel}`).join('；'),
  };
}

function buildSplitWillingness(members: TeamRequirementMemberView[]): TeamSpreadInsight {
  const submitted = members.filter((m) => m.submitted);
  const accepts = uniqueValues(submitted.map((m) => m.splitGroup.accept));
  const severity = spreadSeverity(accepts.length);
  const hasNo = accepts.includes('no');
  const hasYes = accepts.includes('yes');

  if (severity === 'aligned') {
    return {
      label: '分流意愿',
      summary: submitted.length
        ? `全员${SPLIT_LABELS[accepts[0]!]}分流`
        : '暂无提交数据',
      severity,
    };
  }

  return {
    label: '分流意愿',
    summary: hasNo && hasYes ? '存在不接受分流的成员' : '分流态度不完全一致',
    severity: hasNo && hasYes ? 'divergent' : severity,
    detail: submitted.map((m) => `${m.displayName}：${m.splitGroup.acceptLabel}`).join('；'),
  };
}

function detectOnboardingConflicts(members: TeamRequirementMemberView[]): TeamConflictItem[] {
  const conflicts: TeamConflictItem[] = [];
  const submitted = members.filter((m) => m.submitted);

  const active = submitted.filter((m) => m.pace.preference === 'active');
  const relaxed = submitted.filter((m) => m.pace.preference === 'relaxed');
  if (active.length > 0 && relaxed.length > 0) {
    conflicts.push({
      id: 'pace-active-vs-relaxed',
      title: '体力节奏冲突',
      description: `${active.map((m) => m.displayName).join('、')} 偏好高强度，与 ${relaxed.map((m) => m.displayName).join('、')} 的轻松节奏可能难以同日安排。`,
      severity: 'high',
      source: 'onboarding',
    });
  }

  const splitNo = submitted.filter((m) => m.splitGroup.accept === 'no');
  const splitYes = submitted.filter((m) => m.splitGroup.accept === 'yes');
  if (splitNo.length > 0 && splitYes.length > 0) {
    conflicts.push({
      id: 'split-yes-vs-no',
      title: '分流安排冲突',
      description: `${splitYes.map((m) => m.displayName).join('、')} 接受分流，但 ${splitNo.map((m) => m.displayName).join('、')} 明确不接受，需提前协商替代方案。`,
      severity: 'high',
      source: 'onboarding',
    });
  }

  const budget = submitted.filter((m) => m.spending.level === 'budget');
  const premium = submitted.filter((m) => m.spending.level === 'premium');
  if (budget.length > 0 && premium.length > 0) {
    conflicts.push({
      id: 'spending-budget-vs-premium',
      title: '消费预期差异',
      description: `${premium.map((m) => m.displayName).join('、')} 倾向品质消费，与 ${budget.map((m) => m.displayName).join('、')} 的节省取向需在住宿/餐饮上平衡。`,
      severity: 'medium',
      source: 'onboarding',
    });
  }

  const avoids = submitted
    .filter((m) => m.hardConstraints.avoid)
    .map((m) => ({ name: m.displayName, avoid: m.hardConstraints.avoid }));
  const musts = submitted
    .filter((m) => m.hardConstraints.must)
    .map((m) => ({ name: m.displayName, must: m.hardConstraints.must }));

  for (const must of musts) {
    for (const avoid of avoids) {
      if (must.name === avoid.name) continue;
      const mustLower = must.must.toLowerCase();
      const avoidLower = avoid.avoid.toLowerCase();
      if (
        mustLower &&
        avoidLower &&
        (mustLower.includes(avoidLower) || avoidLower.includes(mustLower))
      ) {
        conflicts.push({
          id: `constraint-${must.name}-${avoid.name}`,
          title: '体验偏好冲突',
          description: `${must.name} 希望「${must.must}」，但 ${avoid.name} 希望避免「${avoid.avoid}」。`,
          severity: 'medium',
          source: 'onboarding',
        });
      }
    }
  }

  return conflicts;
}

function frictionSeverity(level: HighRiskAlert['level']): TeamConflictItem['severity'] {
  if (level === 'red') return 'high';
  if (level === 'yellow') return 'medium';
  return 'low';
}

function frictionToConflicts(alerts: HighRiskAlert[]): TeamConflictItem[] {
  return alerts.map((alert) => ({
    id: `friction-${alert.id}`,
    title: `${alert.domainLabel}摩擦`,
    description: `${alert.memberAName} 与 ${alert.memberBName}：${alert.summary}${alert.recommendedStrategy ? `（建议：${alert.recommendedStrategy}）` : ''}`,
    severity: frictionSeverity(alert.level),
    source: 'friction' as const,
  }));
}

function buildPrivacySummary(members: TeamRequirementMemberView[]): TeamPrivacySummary {
  const withNotes = members.filter((m) => m.privateConcern.hasNotes);
  return {
    totalWithPrivateNotes: withNotes.length,
    analystOnlyCount: withNotes.filter((m) => m.privateConcern.auth === 'ANALYST_ONLY').length,
    sanitizedToAdvisorCount: withNotes.filter((m) => m.privateConcern.advisorVisible).length,
  };
}

function resolveExpectedMemberCount(response: MemberOnboardingProfilesResponse): number {
  const ids = new Set<string>();
  for (const profile of response.profiles) ids.add(profile.userId);
  for (const pending of response.pendingMembers ?? []) ids.add(pending.userId);
  return ids.size;
}

function buildInformationGaps(
  response: MemberOnboardingProfilesResponse,
): TeamInfoGapItem[] {
  const gaps: TeamInfoGapItem[] = [];
  const submittedIds = new Set(response.profiles.filter((p) => p.completedAt).map((p) => p.userId));

  for (const pending of response.pendingMembers ?? []) {
    if (submittedIds.has(pending.userId)) continue;
    gaps.push({
      userId: pending.userId,
      displayName: pending.displayName,
      role: pending.role,
      reason: pending.reason,
      reasonLabel: GAP_REASON_LABELS[pending.reason],
    });
  }

  return gaps;
}

export function buildTeamRequirementProfile(
  input: BuildTeamRequirementProfileInput,
): TeamRequirementProfile {
  const { response, collaborators, frictionAlerts } = input;
  const roleByUserId = new Map(
    (collaborators ?? []).map((c) => [c.userId, c.role ?? undefined]),
  );

  const memberViews: TeamRequirementMemberView[] = response.profiles.map((profile) =>
    memberToView(profile, roleByUserId.get(profile.userId)),
  );

  for (const gap of response.pendingMembers ?? []) {
    if (memberViews.some((m) => m.userId === gap.userId)) continue;
    memberViews.push({
      userId: gap.userId,
      displayName: gap.displayName,
      roleLabel: gap.role,
      submitted: false,
      coreWishes: [],
      hardConstraints: { must: '', avoid: '' },
      pace: {
        preference: 'moderate',
        preferenceLabel: PACE_LABELS.moderate,
        earlyRiser: false,
      },
      lodging: '',
      diet: { restrictions: '', healthNotes: '' },
      spending: { level: 'moderate', levelLabel: SPENDING_LABELS.moderate, notes: '' },
      splitGroup: { accept: 'depends', acceptLabel: SPLIT_LABELS.depends, notes: '' },
      privateConcern: {
        hasNotes: false,
        advisorVisible: false,
        auth: 'SANITIZED_TO_ADVISOR',
      },
    });
  }

  const submittedCount = response.profiles.filter((p) => p.completedAt).length;
  const expectedCount = resolveExpectedMemberCount(response);
  const completionRate =
    expectedCount > 0 ? Math.round((submittedCount / expectedCount) * 100) : 0;

  const onboardingConflicts = detectOnboardingConflicts(memberViews);
  const frictionConflicts = frictionAlerts?.length ? frictionToConflicts(frictionAlerts) : [];
  const potentialConflicts = [...onboardingConflicts, ...frictionConflicts];

  return {
    tripId: response.tripId,
    completionRate,
    submittedCount,
    expectedCount,
    members: memberViews,
    paceSpread: buildPaceSpread(memberViews),
    spendingSpread: buildSpendingSpread(memberViews),
    splitWillingness: buildSplitWillingness(memberViews),
    potentialConflicts,
    informationGaps: buildInformationGaps(response),
    privacySummary: buildPrivacySummary(memberViews),
    generatedAt: response.generatedAt,
  };
}
