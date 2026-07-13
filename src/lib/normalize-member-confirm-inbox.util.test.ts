import { describe, expect, it } from 'vitest';
import { normalizeMemberConfirmInboxResponse } from './normalize-member-confirm-inbox.util';

describe('normalize-member-confirm-inbox.util', () => {
  it('normalizes items and computes pendingCount', () => {
    const res = normalizeMemberConfirmInboxResponse(
      {
        items: [
          {
            id: '1',
            title: '确认行程变更',
            confirm_scope: 'AFFECTED_MEMBERS',
            phase: 'planning',
            status: 'PENDING',
            action_href: '/trips/t1/decisions/d1',
          },
          {
            id: '2',
            title: '已完成',
            confirm_scope: 'ALL_MEMBERS',
            phase: 'execution',
            status: 'COMPLETED',
          },
        ],
      },
      't1',
    );

    expect(res.tripId).toBe('t1');
    expect(res.items).toHaveLength(2);
    expect(res.items[0]?.confirmScope).toBe('AFFECTED_MEMBERS');
    expect(res.items[0]?.actionHref).toBe('/trips/t1/decisions/d1');
    expect(res.pendingCount).toBe(1);
  });
});
