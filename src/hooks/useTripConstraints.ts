import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isTripConstraintsUnavailable } from '@/api/trip-constraints';
import { mergeApiListWithClientEntries, softPreferencesFromTripConstraints } from '@/lib/trip-constraints.adapter';
import {
  buildConstraintListEntries,
  loadSoftPreferences,
  type SoftPreferenceItem,
} from '@/components/plan-studio/workbench/constraint-console-view.util';
import {
  attachCheckIssuesToEntries,
  partitionConstraintEntries,
  type ConstraintConsolePartition,
} from '@/lib/constraint-console-partition.util';
import {
  useWorkbenchTripConstraints,
  workbenchKeys,
} from '@/pages/plan-studio/hooks/useWorkbenchData';
import { subscribeConstraintListItemPatch } from '@/lib/plan-studio-constraints-events';
import type { PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type {
  TripConstraintsListMeta,
  TripConstraintsListResponse,
} from '@/types/trip-constraints';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { TripConstraintsCheckResponse } from '@/types/trip-constraints';

export type TripConstraintsSource = 'bff' | 'local';

export interface UseTripConstraintsOptions {
  tripId: string;
  summary: PlanningConstraintsSummary | null;
  trip?: TripDetail | null;
  budgetProfile?: TripBudgetProfile | null;
  intentMustPlaces?: number[];
  revision?: number;
  enabled?: boolean;
  /** 父级已拉取的 constraints 列表，避免子组件重复 query */
  apiListOverride?: TripConstraintsListResponse | null;
  /** POST /constraints/check 结果，用于关联 issueId */
  checkResult?: TripConstraintsCheckResponse | null;
}

export interface UseTripConstraintsResult {
  source: TripConstraintsSource;
  loading: boolean;
  error: string | null;
  meta: TripConstraintsListMeta | null;
  apiList: TripConstraintsListResponse | null;
  hardItems: ConstraintListEntry[];
  softItems: ConstraintListEntry[];
  externalItems: ConstraintListEntry[];
  partition: ConstraintConsolePartition;
  softPrefs: SoftPreferenceItem[];
  reload: () => Promise<void>;
}

export function useTripConstraints({
  tripId,
  summary,
  trip,
  budgetProfile = null,
  intentMustPlaces = [],
  revision = 0,
  enabled = true,
  apiListOverride,
  checkResult = null,
}: UseTripConstraintsOptions): UseTripConstraintsResult {
  const queryClient = useQueryClient();
  const constraintsQuery = useWorkbenchTripConstraints(tripId, enabled && !apiListOverride);
  const [error, setError] = useState<string | null>(null);
  const [listItemPatches, setListItemPatches] = useState<
    Record<string, Partial<ConstraintListEntry>>
  >({});

  useEffect(() => {
    return subscribeConstraintListItemPatch((detail) => {
      if (detail.tripId !== tripId) return;
      setListItemPatches((prev) => ({
        ...prev,
        [detail.itemId]: { ...prev[detail.itemId], ...detail.patch },
      }));
    });
  }, [tripId]);

  const applyListPatches = useCallback(
    (items: ConstraintListEntry[]) =>
      items.map((item) => {
        const patch = listItemPatches[item.id];
        return patch ? { ...item, ...patch } : item;
      }),
    [listItemPatches],
  );

  const apiList = apiListOverride ?? constraintsQuery.data ?? null;
  const loading = apiListOverride ? false : constraintsQuery.isLoading;

  const listBundle = useMemo(
    () =>
      buildConstraintListEntries(summary, trip, budgetProfile, loadSoftPreferences(tripId), {
        intentMustPlaces,
      }),
    [summary, trip, budgetProfile, intentMustPlaces, tripId, revision],
  );

  const mergedBundle = useMemo(() => {
    const clientBundle = listBundle;
    if (!apiList) {
      return { bundle: clientBundle, source: 'local' as const };
    }
    try {
      const merged = mergeApiListWithClientEntries(apiList, clientBundle);
      return { bundle: { ...clientBundle, ...merged }, source: 'bff' as const };
    } catch (err) {
      if (isTripConstraintsUnavailable(err)) {
        return { bundle: clientBundle, source: 'local' as const };
      }
      return { bundle: clientBundle, source: 'local' as const };
    }
  }, [apiList, listBundle]);

  useEffect(() => {
    if (constraintsQuery.error && !isTripConstraintsUnavailable(constraintsQuery.error)) {
      setError(
        constraintsQuery.error instanceof Error
          ? constraintsQuery.error.message
          : '加载约束失败',
      );
    } else {
      setError(null);
    }
  }, [constraintsQuery.error]);

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: workbenchKeys.constraints(tripId) });
  }, [queryClient, tripId]);

  const softPrefs = useMemo(() => {
    if (apiList?.items.length) {
      return softPreferencesFromTripConstraints(apiList.items);
    }
    return mergedBundle.bundle.softItems.map((item) => ({
      id: item.id,
      label: item.label,
      icon: item.icon,
      priority:
        item.sliderValue != null
          ? item.sliderValue >= 67
            ? ('高' as const)
            : item.sliderValue >= 34
              ? ('中' as const)
              : ('低' as const)
          : ('中' as const),
    }));
  }, [apiList, mergedBundle.bundle.softItems]);

  const partition = useMemo(() => {
    const allItems = attachCheckIssuesToEntries(
      [
        ...applyListPatches(mergedBundle.bundle.hardItems),
        ...applyListPatches(mergedBundle.bundle.softItems),
        ...mergedBundle.bundle.externalItems,
      ],
      checkResult?.issues,
    );
    return partitionConstraintEntries(allItems);
  }, [mergedBundle.bundle, applyListPatches, checkResult?.issues]);

  return {
    source: mergedBundle.source,
    loading,
    error,
    meta: apiList?.meta ?? null,
    apiList,
    hardItems: partition.userHardItems,
    softItems: partition.userSoftItems,
    externalItems: [
      ...partition.officialRuleItems,
      ...(partition.worldFeasibilityItem ? [partition.worldFeasibilityItem] : []),
    ],
    partition,
    softPrefs,
    reload,
  };
}
