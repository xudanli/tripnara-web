import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { TripConstraintsApiError, tripConstraintsApi } from '@/api/trip-constraints';
import { addHardConstraintFromTemplate } from '@/lib/constraint-console.service';
import { getHardConstraintTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';

vi.mock('@/api/trip-constraints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/trip-constraints')>();
  return {
    ...actual,
    tripConstraintsApi: {
      ...actual.tripConstraintsApi,
      list: vi.fn(),
      create: vi.fn(),
    },
  };
});

describe('addHardConstraintFromTemplate stale retry', () => {
  const tripId = 'trip_1';
  const template = getHardConstraintTemplate('earliest_departure');
  if (!template) throw new Error('missing template');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries create with fresh constraintsVersion after CONSTRAINTS_STALE', async () => {
    const queryClient = new QueryClient();
    vi.mocked(tripConstraintsApi.list).mockResolvedValue({
      meta: { tripId, constraintsVersion: 7, total: 0 },
      items: [],
    });
    vi.mocked(tripConstraintsApi.create)
      .mockRejectedValueOnce(new TripConstraintsApiError('CONSTRAINTS_STALE', 'stale'))
      .mockResolvedValueOnce({
        id: 'c_tpl_earliest_departure',
        name: template.label,
        type: 'HARD',
        category: 'TIME',
      } as never);

    const created = await addHardConstraintFromTemplate(
      tripId,
      template,
      { constraintsVersion: 5, apiList: { meta: { tripId, constraintsVersion: 5, total: 0 }, items: [] } },
      { queryClient },
    );

    expect(created?.id).toBe('c_tpl_earliest_departure');
    expect(tripConstraintsApi.create).toHaveBeenCalledTimes(2);
    expect(tripConstraintsApi.create).toHaveBeenLastCalledWith(
      tripId,
      expect.objectContaining({ constraintsVersion: 7 }),
    );
    expect(queryClient.getQueryData(workbenchKeys.constraints(tripId))).toMatchObject({
      meta: { constraintsVersion: 7 },
    });
  });
});
