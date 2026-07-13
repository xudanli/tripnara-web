import { describe, expect, it } from 'vitest';
import {
  normalizeInviteLabel,
  normalizeOnboardingRole,
  normalizeParticipantRole,
  normalizeRoleSlot,
  roleSlotLabel,
  roleSlotToMemberTripRole,
  unifiedRoleLabel,
} from './trip-member-roles.util';
import { resolveMemberTripPhase } from './member-trip-phase.util';

describe('trip-member-roles.util', () => {
  it('maps portal payer role', () => {
    expect(normalizeParticipantRole('PAYER')).toBe('PAYER');
    expect(unifiedRoleLabel('PAYER')).toBe('付款人');
  });

  it('maps invite label 主联系人', () => {
    expect(normalizeInviteLabel('主联系人')).toBe('PRIMARY_CONTACT');
  });

  it('maps onboarding guardian', () => {
    expect(normalizeOnboardingRole('GUARDIAN')).toBe('GUARDIAN');
  });

  it('maps roleSlot PAYER to onboarding tripRole', () => {
    expect(normalizeRoleSlot('PAYER')).toBe('PAYER');
    expect(roleSlotToMemberTripRole('PRIMARY_CONTACT')).toBe('PRIMARY_CONTACT');
    expect(roleSlotLabel('FINAL_CONFIRMER')).toBe('最终确认人');
  });
});

describe('member-trip-phase.util', () => {
  it('returns onboarding when not completed', () => {
    expect(
      resolveMemberTripPhase({
        tripStatus: 'PLANNING',
        inviteContext: {
          inviteCode: 'x',
          tripId: 't1',
          onboardingRequired: true,
          onboardingCompleted: false,
        },
      }),
    ).toBe('onboarding');
  });

  it('returns execution for IN_PROGRESS', () => {
    expect(
      resolveMemberTripPhase({
        tripStatus: 'IN_PROGRESS',
        inviteContext: {
          inviteCode: 'x',
          tripId: 't1',
          onboardingCompleted: true,
        },
      }),
    ).toBe('execution');
  });
});
