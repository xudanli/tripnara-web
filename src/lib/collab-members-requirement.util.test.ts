import { describe, expect, it } from 'vitest';
import {
  buildRequirementSummaryCards,
  computeMemberRequirementProgress,
  isRequirementSectionFilled,
} from '@/lib/collab-members-requirement.util';
import type { TeamRequirementMemberView, TeamRequirementProfile } from '@/types/team-requirement-profile';

const submittedMember: TeamRequirementMemberView = {
  userId: 'u1',
  displayName: 'Sherry',
  submitted: true,
  coreWishes: ['看自然奇观'],
  hardConstraints: { must: '看极光', avoid: '长时间驾驶' },
  pace: { preference: 'moderate', preferenceLabel: '适中', earlyRiser: true, maxDailyWalkKm: 8 },
  lodging: '舒适型酒店',
  diet: { restrictions: '', healthNotes: '' },
  spending: { level: 'moderate', levelLabel: '适中', notes: '' },
  splitGroup: { accept: 'yes', acceptLabel: '接受', notes: '' },
  privateConcern: { hasNotes: false, advisorVisible: false, auth: 'SANITIZED_TO_ADVISOR' },
};

const pendingMember: TeamRequirementMemberView = {
  ...submittedMember,
  userId: 'u2',
  displayName: 'Kevin',
  submitted: false,
  coreWishes: [],
  hardConstraints: { must: '', avoid: '' },
  lodging: '',
};

describe('collab-members-requirement.util', () => {
  it('computes section completion for submitted members', () => {
    expect(isRequirementSectionFilled(submittedMember, 'core-wish')).toBe(true);
    expect(isRequirementSectionFilled(submittedMember, 'diet-health')).toBe(false);
    expect(computeMemberRequirementProgress(submittedMember).completionPct).toBe(83);
    expect(computeMemberRequirementProgress(pendingMember).completionPct).toBe(0);
  });

  it('builds summary cards from profile', () => {
    const profile: TeamRequirementProfile = {
      tripId: 't1',
      completionRate: 67,
      submittedCount: 1,
      expectedCount: 2,
      members: [submittedMember, pendingMember],
      paceSpread: { label: '体力节奏', summary: '一致', severity: 'aligned' },
      spendingSpread: { label: '消费倾向', summary: '一致', severity: 'mixed' },
      splitWillingness: { label: '分流意愿', summary: '一致', severity: 'aligned' },
      potentialConflicts: [
        {
          id: 'c1',
          title: '预算冲突',
          description: '差异较大',
          severity: 'high',
          source: 'onboarding',
        },
      ],
      informationGaps: [],
      privacySummary: {
        analystOnlyCount: 0,
        sanitizedToAdvisorCount: 0,
        totalWithPrivateNotes: 0,
      },
    };

    const cards = buildRequirementSummaryCards(profile);
    expect(cards).toHaveLength(4);
    expect(cards[0]?.items[0]).toBe('看自然奇观');
    expect(cards[3]?.items[0]).toBe('预算冲突');
  });
});
