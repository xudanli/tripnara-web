import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  applyAssessmentsToSections,
  applyAssessmentToEntry,
  buildConstraintConsoleWithAssessments,
} from '@/lib/frontend-constraint-card-view.util';
import type { ConstraintListEntry } from '@/components/plan-studio/workbench/constraint-console-types';
import type { ConstraintCardView } from '@/types/frontend-constraint-assessment-api.types';
import { uiConstraintIdToApi } from '@/lib/trip-constraints.adapter';
import { constraintAssessmentKeys } from '@/lib/constraint-assessment-query.util';
import { useConstraintAssessments } from '@/hooks/useConstraintAssessments';
import {
  useTripConstraints,
  type UseTripConstraintsOptions,
  type UseTripConstraintsResult,
} from '@/hooks/useTripConstraints';
import type {
  ConstraintConsoleWithAssessmentsViewModel,
  UnifiedConstraintAssessmentBundle,
} from '@/types/frontend-constraint-assessment-api.types';
import type { TripConstraint } from '@/types/trip-constraints';

function enrichEntriesWithAssessmentCards(
  entries: ConstraintListEntry[],
  cardsById: Record<string, ConstraintCardView>,
): ConstraintListEntry[] {
  if (!Object.keys(cardsById).length) return entries;
  return entries.map((entry) => {
    const card =
      cardsById[entry.id] ??
      cardsById[uiConstraintIdToApi(entry.id)] ??
      cardsById[uiConstraintIdToApi(entry.id).replace(/^c_tpl_/, '')];
    if (!card?.assessment) return entry;
    return applyAssessmentToEntry(entry, card);
  });
}

export interface UseConstraintConsoleWithAssessmentsOptions extends UseTripConstraintsOptions {
  /** GET /constraint-assessments?refresh=true */
  assessmentRefresh?: boolean;
}

export interface UseConstraintConsoleWithAssessmentsResult extends UseTripConstraintsResult {
  assessments: UnifiedConstraintAssessmentBundle | null;
  assessmentsLoading: boolean;
  assessmentsError: string | null;
  assessmentView: ConstraintConsoleWithAssessmentsViewModel | null;
  reloadAssessments: () => Promise<void>;
}

export function useConstraintConsoleWithAssessments(
  options: UseConstraintConsoleWithAssessmentsOptions,
): UseConstraintConsoleWithAssessmentsResult {
  const queryClient = useQueryClient();
  const base = useTripConstraints(options);
  const assessmentsQuery = useConstraintAssessments(options.tripId, {
    enabled: options.enabled,
    refresh: options.assessmentRefresh,
  });

  const itemsById = useMemo(() => {
    if (!base.apiList?.items?.length) return undefined;
    return base.apiList.items.reduce<Record<string, TripConstraint>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [base.apiList?.items]);

  const sections = useMemo(
    () =>
      applyAssessmentsToSections(
        base.sections,
        assessmentsQuery.data,
        itemsById,
        options.tripId,
      ),
    [assessmentsQuery.data, base.sections, itemsById, options.tripId],
  );

  const assessmentView = useMemo(() => {
    if (!assessmentsQuery.data) return null;
    return buildConstraintConsoleWithAssessments({
      tripId: options.tripId,
      constraintsVersion: base.meta?.constraintsVersion ?? 0,
      sections: base.sections,
      bundle: assessmentsQuery.data,
      itemsById,
    });
  }, [
    assessmentsQuery.data,
    base.meta?.constraintsVersion,
    base.sections,
    itemsById,
    options.tripId,
  ]);

  const cardsById = assessmentView?.cardsByConstraintId ?? {};

  const partition = useMemo(
    () => ({
      userHardItems: enrichEntriesWithAssessmentCards(base.partition.userHardItems, cardsById),
      userSoftItems: enrichEntriesWithAssessmentCards(base.partition.userSoftItems, cardsById),
      officialRuleItems: enrichEntriesWithAssessmentCards(
        base.partition.officialRuleItems,
        cardsById,
      ),
      worldFeasibilityItem: base.partition.worldFeasibilityItem
        ? enrichEntriesWithAssessmentCards(
            [base.partition.worldFeasibilityItem],
            cardsById,
          )[0] ?? null
        : null,
    }),
    [base.partition, cardsById],
  );

  const hardItems = partition.userHardItems;
  const softItems = partition.userSoftItems;
  const externalItems = useMemo(
    () => [
      ...partition.officialRuleItems,
      ...(partition.worldFeasibilityItem ? [partition.worldFeasibilityItem] : []),
    ],
    [partition],
  );

  const reloadAssessments = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: constraintAssessmentKeys.all(options.tripId),
    });
  }, [queryClient, options.tripId]);

  const reload = useCallback(async () => {
    await base.reload();
    await reloadAssessments();
  }, [base, reloadAssessments]);

  const assessmentsError =
    assessmentsQuery.error instanceof Error
      ? assessmentsQuery.error.message
      : assessmentsQuery.error
        ? '加载验证状态失败'
        : null;

  return {
    ...base,
    sections,
    hardItems,
    softItems,
    externalItems,
    partition,
    assessments: assessmentsQuery.data ?? null,
    assessmentsLoading: assessmentsQuery.isLoading,
    assessmentsError,
    assessmentView,
    reloadAssessments,
    reload,
  };
}
