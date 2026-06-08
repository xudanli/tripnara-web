import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { memoryConsoleApi } from '@/features/memory/api/memory-console.api';
import type {
  MemoryConsoleV1Response,
  PatchMemoryConsoleL1Body,
} from '@/features/memory/types/memory-console.v1';
import { deriveMemoryConsoleUiStateV1 } from '@/contracts/memory-console-ui-state.v1';
import { trackMemoryConsoleView, trackMemoryDeletePatch } from '@/utils/memory-analytics';
import consoleFixture from '@/mocks/memory-console.console.v1.json';
import { isMemoryConsoleEnabled } from '@/lib/memory-feature';

const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_MEMORY_CONSOLE_MOCK === '1';

async function fetchConsole(tripId?: string | null): Promise<MemoryConsoleV1Response> {
  if (USE_MOCK) {
    const mock = consoleFixture as MemoryConsoleV1Response;
    if (tripId && mock.trip) {
      return { ...mock, trip: { ...mock.trip, trip_id: tripId } };
    }
    return mock;
  }
  return memoryConsoleApi.getConsole(tripId);
}

export function useMemoryConsole(tripId?: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['memory-console', tripId ?? 'global'];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchConsole(tripId),
    enabled: isMemoryConsoleEnabled(),
  });

  const [viewTracked, setViewTracked] = useState(false);
  useEffect(() => {
    if (query.isSuccess && !viewTracked) {
      trackMemoryConsoleView(tripId);
      setViewTracked(true);
    }
  }, [query.isSuccess, tripId, viewTracked]);

  const ui = deriveMemoryConsoleUiStateV1(query.data);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const patchL1 = useMutation({
    mutationFn: (body: PatchMemoryConsoleL1Body) =>
      USE_MOCK
        ? Promise.resolve({ ...(query.data ?? (consoleFixture as MemoryConsoleV1Response)), l1: { ...query.data?.l1, ...body } })
        : memoryConsoleApi.patchL1(body),
    onSuccess: invalidate,
  });

  const clearL1 = useMutation({
    mutationFn: () => (USE_MOCK ? Promise.resolve() : memoryConsoleApi.deleteL1()),
    onSuccess: invalidate,
  });

  const deleteL0Field = useMutation({
    mutationFn: (fieldKey: string) =>
      USE_MOCK
        ? Promise.resolve({
            ...(query.data ?? (consoleFixture as MemoryConsoleV1Response)),
            l0: Object.fromEntries(
              Object.entries(query.data?.l0 ?? {}).filter(([k]) => k !== fieldKey)
            ),
          })
        : memoryConsoleApi.deleteL0Field(fieldKey),
    onSuccess: invalidate,
  });

  const deleteTripPatch = useMutation({
    mutationFn: ({ tripId: tid, patchId }: { tripId: string; patchId: string }) => {
      trackMemoryDeletePatch(patchId, tid);
      return USE_MOCK
        ? Promise.resolve({
            ...(query.data ?? (consoleFixture as MemoryConsoleV1Response)),
            trip: {
              trip_id: tid,
              constraint_patches: (query.data?.trip?.constraint_patches ?? []).filter(
                (p) => p.patch_id !== patchId
              ),
            },
          })
        : memoryConsoleApi.deleteTripConstraintPatch(tid, patchId);
    },
    onSuccess: invalidate,
  });

  const deleteL2Decision = useMutation({
    mutationFn: (decisionId: string) =>
      USE_MOCK
        ? Promise.resolve({
            ...(query.data ?? (consoleFixture as MemoryConsoleV1Response)),
            l2: (query.data?.l2 ?? []).filter((e) => e.id !== decisionId),
          })
        : memoryConsoleApi.deleteL2Decision(decisionId),
    onSuccess: invalidate,
  });

  const exportGdpr = useMutation({
    mutationFn: () =>
      USE_MOCK
        ? Promise.resolve(query.data ?? (consoleFixture as MemoryConsoleV1Response))
        : memoryConsoleApi.exportGdpr(),
  });

  return {
    data: query.data,
    ui,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    patchL1,
    clearL1,
    deleteL0Field,
    deleteTripPatch,
    deleteL2Decision,
    exportGdpr,
  };
}
