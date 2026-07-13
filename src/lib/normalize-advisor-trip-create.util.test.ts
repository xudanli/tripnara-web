import { describe, expect, it } from 'vitest';
import { normalizeCreateAdvisorTripResponse } from './normalize-advisor-trip-create.util';

describe('normalize-advisor-trip-create.util', () => {
  it('normalizes response with responsibilityOwners and invite URLs', () => {
    const res = normalizeCreateAdvisorTripResponse({
      trip_id: 't1',
      member_invite_codes: [
        {
          invite_code: 'code1',
          invite_url: 'https://app.example/join-trip/code1',
          label: '付款人',
        },
      ],
      responsibility_owners: {
        payment_approver: { name: '张三' },
        planning_owner: { user_id: 'u1', name: '顾问' },
      },
    });

    expect(res.tripId).toBe('t1');
    expect(res.memberInviteCodes[0]?.inviteCode).toBe('code1');
    expect(res.memberInviteCodes[0]?.inviteUrl).toBe('https://app.example/invite/code1');
    expect(res.responsibilityOwners?.paymentApprover.name).toBe('张三');
    expect(res.responsibilityOwners?.planningOwner.userId).toBe('u1');
  });
});
