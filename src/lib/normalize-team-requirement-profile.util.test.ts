import { describe, expect, it } from 'vitest';
import { normalizeMemberOnboardingProfilesResponse } from './normalize-team-requirement-profile.util';

describe('normalize-team-requirement-profile.util', () => {
  it('normalizes dual camelCase/snake_case envelope from live BFF', () => {
    const res = normalizeMemberOnboardingProfilesResponse(
      {
        tripId: 'trip_live',
        trip_id: 'trip_live',
        profiles: [
          {
            user_id: 'user_1',
            display_name: '张明',
            invite_token: 'INV1',
            trip_role: 'MEMBER',
            core_wishes: ['看极光'],
            must_experience: '特色住宿',
            avoid_experience: '徒步',
            pace_preference: 'relaxed',
            early_riser: false,
            lodging_preference: '双床房',
            diet_restrictions: '',
            health_notes: '',
            personal_spending_level: 'moderate',
            personal_spending_notes: '',
            accept_split_group: 'depends',
            split_group_notes: '',
            private_notes_auth: 'SANITIZED_TO_ADVISOR',
            advisor_visible_private_notes: '希望二人独处',
            completed_at: '2026-07-10T00:00:00.000Z',
          },
        ],
        pendingMembers: [],
        pending_members: [
          {
            user_id: 'user_2',
            display_name: '王磊',
            role: 'MEMBER',
            reason: 'onboarding_in_progress',
          },
        ],
      },
      'trip_fallback',
    );

    expect(res.tripId).toBe('trip_live');
    expect(res.profiles).toHaveLength(1);
    expect(res.profiles[0]?.userId).toBe('user_1');
    expect(res.profiles[0]?.displayName).toBe('张明');
    expect(res.profiles[0]?.privateNotes).toBe('');
    expect(res.profiles[0]?.advisorVisiblePrivateNotes).toBe('希望二人独处');
    expect(res.pendingMembers).toHaveLength(1);
    expect(res.pendingMembers?.[0]?.reason).toBe('onboarding_in_progress');
  });

  it('strips private_notes when backend omits it', () => {
    const res = normalizeMemberOnboardingProfilesResponse(
      {
        profiles: [
          {
            userId: 'u1',
            displayName: '测试',
            inviteToken: 't',
            tripRole: 'MEMBER',
            coreWishes: [''],
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
            privateNotesAuth: 'ANALYST_ONLY',
            completedAt: '2026-07-10T00:00:00.000Z',
          },
        ],
      },
      'trip_x',
    );

    expect(res.profiles[0]?.privateNotes).toBe('');
    expect(res.profiles[0]?.advisorVisiblePrivateNotes).toBeNull();
  });
});
