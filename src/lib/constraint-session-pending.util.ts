import type { QueryClient } from '@tanstack/react-query';
import { tripBudgetApi } from '@/api/trip-budget';
import { tripsApi } from '@/api/trips';
import { patchTravelDecisionContract } from '@/api/frontend-travel-decision-contract-api-client';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import {
  formatConstraintSaveErrorMessage,
  handleConstraintApiError,
  removeSoftConstraint,
  saveCatalogHardConstraint,
  patchTripConstraintItem,
  updateSoftConstraintPriority,
  type ConstraintConsoleServiceContext,
} from '@/lib/constraint-console.service';
import {
  saveConstraintTimeRange,
  saveConstraintDailyDrive,
  saveConstraintAccommodation,
  saveConstraintTravelers,
  saveConstraintTransport,
  type ConstraintTransportValue,
} from '@/lib/planning-constraint-edit-meta';
import { draftToPreviewChange } from '@/lib/trip-constraints.adapter';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';
import { travelGoalDimensionsToApiPrinciples } from '@/lib/trip-constraints-contract.util';
import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import type { MustGoPlaceSummary } from '@/components/plan-studio/workbench/constraint-console-view.util';
import { isApiManagedHardConstraintId, isSoftConstraintId } from '@/components/plan-studio/workbench/constraint-console-view.util';
import type { TripDetail } from '@/types/trip';
import type { PatchTripConstraintsContractDto } from '@/types/trip-constraints';
import type { TravelGoalDimension } from '@/types/travel-decision-contract';
import type { UsePlanningConflictsResult } from '@/hooks/usePlanningConflicts';

export type ConstraintPendingSaveOp =
  | {
      kind: 'draft';
      id: string;
      draft: ConstraintEditorDraft;
      mustGoDraft?: MustGoPlaceSummary[];
    }
  | { kind: 'soft_priority'; id: string; priority: '高' | '中' | '低' }
  | { kind: 'remove_soft'; id: string }
  | { kind: 'contract_patch'; patch: PatchTripConstraintsContractDto }
  | { kind: 'travel_goals'; order: TravelGoalDimension[] };

export function upsertPendingOp(
  ops: ConstraintPendingSaveOp[],
  next: ConstraintPendingSaveOp,
): ConstraintPendingSaveOp[] {
  const withoutSame = ops.filter((op) => {
    if (op.kind === 'draft' && next.kind === 'draft') return op.id !== next.id;
    if (op.kind === 'soft_priority' && next.kind === 'soft_priority') return op.id !== next.id;
    if (op.kind === 'remove_soft' && next.kind === 'remove_soft') return op.id !== next.id;
    if (op.kind === 'travel_goals' && next.kind === 'travel_goals') return false;
    if (op.kind === 'contract_patch' && next.kind === 'contract_patch') return false;
    return true;
  });
  return [...withoutSame, next];
}

export interface ExecuteConstraintDraftSaveParams {
  tripId: string;
  draft: ConstraintEditorDraft;
  mustGoDraft?: MustGoPlaceSummary[];
  trip?: TripDetail | null;
  softPrefIds: string[];
  serviceCtx: ConstraintConsoleServiceContext;
  queryClient: QueryClient;
  currency?: string;
  conflicts?: UsePlanningConflictsResult;
  onDailyDriveHoursSaved?: (hours: number) => void;
  reload?: () => Promise<void>;
}

/** 将单条约束草稿写入服务端（与控制台 handleSave 对齐） */
export async function executeConstraintDraftSave({
  tripId,
  draft,
  mustGoDraft,
  trip,
  softPrefIds,
  serviceCtx,
  queryClient,
  currency = 'CNY',
  conflicts,
  onDailyDriveHoursSaved,
  reload,
}: ExecuteConstraintDraftSaveParams): Promise<void> {
  if (draft.id === 'time_range') {
    if (!trip || !draft.startDate || !draft.endDate) {
      throw new Error('请选择出发与返程日期');
    }
    await saveConstraintTimeRange(tripId, draft.startDate, draft.endDate, trip.name);
    return;
  }

  if (draft.id === 'budget') {
    await tripBudgetApi.putIntent(tripId, {
      total: draft.targetValue,
      currency: draft.currency ?? currency,
    });
    await queryClient.invalidateQueries({ queryKey: workbenchKeys.budgetProfile(tripId) });
    return;
  }

  if (draft.id === 'travelers') {
    if (!trip) throw new Error('行程数据未加载，请稍后重试');
    const count = Math.round(draft.targetValue);
    if (!Number.isFinite(count) || count < 1 || count > 20) {
      throw new Error('请输入 1–20 之间的出行人数');
    }
    await saveConstraintTravelers(tripId, trip, count);
    return;
  }

  if (draft.id === 'transport') {
    if (!trip) throw new Error('行程数据未加载，请稍后重试');
    if (!draft.transportMode) throw new Error('请选择基础交通方式');
    await saveConstraintTransport(tripId, trip, draft.transportMode as ConstraintTransportValue);
    return;
  }

  if (isApiManagedHardConstraintId(draft.id)) {
    const change = draftToPreviewChange(draft);
    await patchTripConstraintItem(
      tripId,
      TRIP_CONSTRAINT_LEGACY_IDS.MAX_SEGMENT_DISTANCE,
      change.patch,
      serviceCtx,
      { queryClient },
    );
    await conflicts?.reload();
    return;
  }

  if (draft.id === 'daily_drive') {
    await saveConstraintDailyDrive(tripId, draft.targetValue);
    onDailyDriveHoursSaved?.(draft.targetValue);
    return;
  }

  if (draft.id === 'must_go') {
    const intent = await tripsApi.getIntent(tripId);
    const existing = intent.metadata?.constraints ?? {};
    await tripsApi.updateIntent(tripId, {
      pacingConfig: intent.pacingConfig
        ? {
            level: intent.pacingConfig.level as 'relaxed' | 'standard' | 'tight' | undefined,
            maxDailyActivities: intent.pacingConfig.maxDailyActivities,
          }
        : undefined,
      preferences: intent.metadata?.preferences,
      constraints: {
        dailyWalkLimit: existing.dailyWalkLimit,
        earlyRiser: existing.earlyRiser,
        nightOwl: existing.nightOwl,
        avoidPlaces: existing.avoidPlaces,
        mustPlaces: (mustGoDraft ?? []).map((p) => p.id),
      },
      planningPolicy: intent.metadata?.planningPolicy as
        | 'safe'
        | 'experience'
        | 'challenge'
        | undefined,
      totalBudget: intent.budgetConfig?.totalBudget ?? intent.totalBudget,
    });
    return;
  }

  if (draft.id === 'accommodation') {
    await saveConstraintAccommodation(tripId, draft.targetValue);
    return;
  }

  if (softPrefIds.includes(draft.id) || isSoftConstraintId(draft.id)) {
    const priority =
      draft.priority >= 7 ? ('高' as const) : draft.priority >= 4 ? ('中' as const) : ('低' as const);
    await updateSoftConstraintPriority(tripId, draft.id, priority, serviceCtx, { queryClient });
    return;
  }

  if (draft.type === 'HARD') {
    const saved = await saveCatalogHardConstraint(tripId, draft, serviceCtx, { queryClient });
    if (!saved) return;
  }
}

export interface FlushPendingConstraintOpsParams {
  tripId: string;
  ops: ConstraintPendingSaveOp[];
  trip?: TripDetail | null;
  softPrefIds: string[];
  serviceCtx: ConstraintConsoleServiceContext;
  queryClient: QueryClient;
  currency?: string;
  conflicts?: UsePlanningConflictsResult;
  contractSource?: 'bff' | 'legacy';
  constraintsVersion?: number | null;
  onDailyDriveHoursSaved?: (hours: number) => void;
  reload?: () => Promise<void>;
}

/** 按队列顺序刷写待保存约束；失败时抛出，已成功项保留在调用方队列外处理 */
export async function flushPendingConstraintOps({
  tripId,
  ops,
  trip,
  softPrefIds,
  serviceCtx,
  queryClient,
  currency,
  conflicts,
  contractSource,
  constraintsVersion,
  onDailyDriveHoursSaved,
  reload,
}: FlushPendingConstraintOpsParams): Promise<void> {
  for (const op of ops) {
    if (op.kind === 'draft') {
      try {
        await executeConstraintDraftSave({
          tripId,
          draft: op.draft,
          mustGoDraft: op.mustGoDraft,
          trip,
          softPrefIds,
          serviceCtx,
          queryClient,
          currency,
          conflicts,
          onDailyDriveHoursSaved,
          reload,
        });
      } catch (err) {
        const message =
          op.draft.id === 'daily_drive' && trip?.metadata
            ? formatConstraintSaveErrorMessage(
                err instanceof Error ? err.message : '保存失败',
                trip.metadata,
              )
            : err instanceof Error
              ? err.message
              : '保存失败';
        handleConstraintApiError(err, message);
        throw err;
      }
      continue;
    }

    if (op.kind === 'soft_priority') {
      await updateSoftConstraintPriority(tripId, op.id, op.priority, serviceCtx, { queryClient });
      continue;
    }

    if (op.kind === 'remove_soft') {
      await removeSoftConstraint(tripId, op.id, serviceCtx, { queryClient });
      continue;
    }

    if (op.kind === 'contract_patch') {
      if (contractSource !== 'bff' || constraintsVersion == null) {
        throw new Error('当前无法同步决策合同');
      }
      const body: PatchTripConstraintsContractDto = {
        ...op.patch,
        constraintsVersion,
      };
      await patchTravelDecisionContract(tripId, body);
      continue;
    }

    if (op.kind === 'travel_goals') {
      if (contractSource === 'bff' && constraintsVersion != null) {
        await patchTravelDecisionContract(tripId, {
          objectives: { rankedPrinciples: travelGoalDimensionsToApiPrinciples(op.order) },
          constraintsVersion,
        });
      } else {
        const intent = await tripsApi.getIntent(tripId);
        const existing = intent.metadata?.constraints ?? {};
        await tripsApi.updateIntent(tripId, {
          pacingConfig: intent.pacingConfig
            ? {
                level: intent.pacingConfig.level as 'relaxed' | 'standard' | 'tight' | undefined,
                maxDailyActivities: intent.pacingConfig.maxDailyActivities,
              }
            : undefined,
          preferences: intent.metadata?.preferences,
          constraints: {
            dailyWalkLimit: existing.dailyWalkLimit,
            earlyRiser: existing.earlyRiser,
            nightOwl: existing.nightOwl,
            avoidPlaces: existing.avoidPlaces,
            mustPlaces: existing.mustPlaces,
          },
          travelGoalRanks: op.order,
          totalBudget: intent.budgetConfig?.totalBudget ?? intent.totalBudget,
        });
      }
    }
  }

  if (reload) {
    await reload();
  }
}
