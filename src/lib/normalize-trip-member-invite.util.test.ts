import { describe, expect, it } from 'vitest';
import {
  normalizeAcceptTripMemberInviteResponse,
  normalizeMemberOnboardingDraft,
  normalizeMemberOnboardingSubmitResponse,
  normalizeTripMemberInviteContext,
} from './normalize-trip-member-invite.util';

describe('normalize-trip-member-invite.util', () => {
  it('normalizes invite context snake_case', () => {
    const ctx = normalizeTripMemberInviteContext({
      invite_code: 'abc123',
      trip_id: 't1',
      role_slot: 'PAYER',
      trip_name: '冰岛',
      onboarding_completed: false,
    });
    expect(ctx.inviteCode).toBe('abc123');
    expect(ctx.tripId).toBe('t1');
    expect(ctx.roleSlot).toBe('PAYER');
    expect(ctx.tripName).toBe('冰岛');
    expect(ctx.onboardingCompleted).toBe(false);
  });

  it('normalizes accept response', () => {
    const res = normalizeAcceptTripMemberInviteResponse({
      trip_id: 't1',
      collaborator_id: 'c1',
      role_slot: 'PRIMARY_CONTACT',
      already_accepted: true,
    });
    expect(res.tripId).toBe('t1');
    expect(res.collaboratorId).toBe('c1');
    expect(res.roleSlot).toBe('PRIMARY_CONTACT');
    expect(res.alreadyAccepted).toBe(true);
  });

  it('normalizes onboarding draft', () => {
    const draft = normalizeMemberOnboardingDraft(
      {
        invite_token: 'x',
        trip_id: 't1',
        role_slot: 'PAYER',
        display_name: '张三',
        trip_role: 'PAYER',
        core_wishes: ['看极光'],
      },
      'x',
    );
    expect(draft?.tripId).toBe('t1');
    expect(draft?.roleSlot).toBe('PAYER');
    expect(draft?.displayName).toBe('张三');
    expect(draft?.coreWishes[0]).toBe('看极光');
  });

  it('normalizes submit response homePath fallback', () => {
    const res = normalizeMemberOnboardingSubmitResponse({ trip_id: 't1' }, 'code99');
    expect(res.homePath).toBe('/member/code99/home');
    expect(res.status).toBe('SUBMITTED');
  });
});
