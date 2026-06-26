import type { ReputationDispute } from '@/types/identity-governance';

export function buildMockPendingReputationDisputes(): ReputationDispute[] {
  return [
    {
      id: 'rep-dispute-1',
      eventId: 'rep-event-1',
      reason: '该完成记录与事实不符，我并未参与该次行程',
      status: 'SUBMITTED',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

export function buildMockMyReputationDisputes(): ReputationDispute[] {
  return buildMockPendingReputationDisputes();
}
