import { describe, expect, it } from 'vitest';
import { createDefaultAdvisorTripForm } from './advisor-trip-create.util';
import {
  buildResponsibilityOwnersFromAdvisorForm,
  formatTripMemberRef,
  normalizeTripResponsibilityOwnersResponse,
} from './trip-responsibility.util';

describe('trip-responsibility.util', () => {
  it('maps advisor form to six responsibility owners', () => {
    const form = createDefaultAdvisorTripForm();
    form.primaryContact = { name: '张三', email: 'zhang@example.com' };
    form.finalConfirmer = { name: '王五', phone: '13800000000' };
    form.advisor = { name: '顾问A', userId: 'advisor-1' };
    form.leader = { name: '领队B' };

    const owners = buildResponsibilityOwnersFromAdvisorForm(form);
    expect(owners.planningOwner.userId).toBe('advisor-1');
    expect(owners.emergencyContact.name).toBe('张三');
    expect(owners.onTripLeader.name).toBe('领队B');
    expect(owners.paymentApprover).toEqual(
      expect.objectContaining({ name: '张三' }),
    );
  });

  it('formats member ref for display', () => {
    expect(formatTripMemberRef({ name: '李四', phone: '13900000000' })).toContain('李四');
    expect(formatTripMemberRef({ inviteLabel: '付款人' })).toContain('付款人');
  });

  it('normalizes responsibility owners response with inferred flag', () => {
    const res = normalizeTripResponsibilityOwnersResponse(
      {
        trip_id: 't1',
        inferred: true,
        owners: {
          planning_owner: { name: '顾问A', user_id: 'u1' },
          payment_approver: { name: '付款人' },
        },
      },
      'fallback',
    );
    expect(res.tripId).toBe('t1');
    expect(res.inferred).toBe(true);
    expect(res.owners.planningOwner.name).toBe('顾问A');
    expect(res.owners.planningOwner.userId).toBe('u1');
    expect(res.owners.paymentApprover.name).toBe('付款人');
  });
});
