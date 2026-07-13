import { describe, expect, it } from 'vitest';
import {
  buildCreateAdvisorTripRequest,
  canAccessAdvisorTripCreate,
  computeTripDayCount,
  createDefaultAdvisorTripForm,
  serializeStakeholder,
  validateAdvisorTripStep,
} from './advisor-trip-create.util';

describe('advisor-trip-create.util', () => {
  it('computes inclusive day count', () => {
    expect(computeTripDayCount('2026-08-01', '2026-08-03')).toBe(3);
  });

  it('allows advisor org members', () => {
    expect(
      canAccessAdvisorTripCreate({
        userId: 'u1',
        activeContext: { type: 'personal' },
        verifications: [],
        publishingPermission: null,
        subscriptions: [],
        projectRoles: [],
        organizationRoles: [
          {
            organizationId: 'org1',
            roles: ['ADVISOR'],
            status: 'ACTIVE',
          },
        ],
      }),
    ).toBe(true);
  });

  it('serializes payer as string when same as primary and name only', () => {
    const contact = { name: '李四' };
    expect(serializeStakeholder(contact, { asStringIfNameOnly: true })).toBe('李四');
  });

  it('serializes stakeholder with userId', () => {
    expect(serializeStakeholder({ name: '顾问A', userId: 'uuid-1' })).toEqual({
      userId: 'uuid-1',
      name: '顾问A',
    });
  });

  it('builds API request matching backend contract', () => {
    const form = createDefaultAdvisorTripForm();
    form.destination = 'IS';
    form.startDate = '2026-09-01';
    form.endDate = '2026-09-07';
    form.dayCount = 7;
    form.estimatedHeadcount = 10;
    form.totalBudget = 50000;
    form.primaryContact = { name: '张三', email: 'zhang@example.com' };
    form.finalConfirmer = { name: '王五', phone: '13800000000' };
    form.advisor = { name: '顾问A' };
    form.leader = { name: '领队B' };
    form.knownRequirements = '需要无障碍通道';

    const body = buildCreateAdvisorTripRequest(form);
    expect(body.payer).toBe('张三');
    expect(body.primaryContact).toEqual({ name: '张三', email: 'zhang@example.com' });
    expect(body.finalConfirmer).toEqual({ name: '王五', phone: '13800000000' });
    expect(body.dayCount).toBe(7);
  });

  it('validates basic step', () => {
    const form = createDefaultAdvisorTripForm();
    expect(validateAdvisorTripStep('basic', form)).toMatch(/目的地/);
  });
});
