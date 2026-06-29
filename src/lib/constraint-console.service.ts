import { Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { tripConstraintsApi, isTripConstraintsUnavailable } from '@/api/trip-constraints';
import {
  apiConstraintIdToUi,
  buildCreateSoftConstraintDto,
  draftToPreviewChange,
  patchFromSoftPriority,
  resolveSoftIdForApi,
  softPreferencesFromTripConstraints,
  uiConstraintIdToApi,
} from '@/lib/trip-constraints.adapter';
import {
  addCustomSoftPreference,
  addSoftPreference,
  listEntryPatchFromSavedDraft,
  loadSoftPreferences,
  removeSoftPreference,
  saveSoftPreferences,
  type SoftPreferenceItem,
  type SoftPreferencePriority,
} from '@/components/plan-studio/workbench/constraint-console-view.util';
import { getSoftConstraintTemplate } from '@/components/plan-studio/workbench/constraint-templates';
import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import { dispatchConstraintListItemPatch } from '@/lib/plan-studio-constraints-events';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import type { QueryClient } from '@tanstack/react-query';
import type { TripConstraintsListResponse } from '@/types/trip-constraints';

export interface ConstraintConsoleServiceContext {
  constraintsVersion?: number;
  apiList?: TripConstraintsListResponse | null;
}

export function resolveSoftPreferences(
  tripId: string,
  ctx: ConstraintConsoleServiceContext,
): SoftPreferenceItem[] {
  if (ctx.apiList?.items?.length) {
    return softPreferencesFromTripConstraints(ctx.apiList.items);
  }
  return loadSoftPreferences(tripId);
}

export async function addSoftConstraintFromTemplate(
  tripId: string,
  templateId: string,
  ctx: ConstraintConsoleServiceContext,
  priority: SoftPreferencePriority = '中',
): Promise<SoftPreferenceItem[]> {
  const template = getSoftConstraintTemplate(templateId);
  if (!template) return resolveSoftPreferences(tripId, ctx);

  const current = resolveSoftPreferences(tripId, ctx);
  if (current.some((p) => p.id === templateId || p.label === template.label)) {
    return current;
  }

  try {
    const created = await tripConstraintsApi.create(
      tripId,
      buildCreateSoftConstraintDto({
        name: template.label,
        templateId,
        priority,
        constraintsVersion: ctx.constraintsVersion,
      }),
    );
    return [
      ...current,
      {
        id: created.id,
        label: created.name,
        icon: template.icon,
        priority,
      },
    ];
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) {
      return addSoftPreference(tripId, templateId, priority);
    }
    throw err;
  }
}

export async function addCustomSoftConstraint(
  tripId: string,
  label: string,
  ctx: ConstraintConsoleServiceContext,
  priority: SoftPreferencePriority = '中',
): Promise<SoftPreferenceItem[]> {
  const trimmed = label.trim();
  if (!trimmed) return resolveSoftPreferences(tripId, ctx);

  const current = resolveSoftPreferences(tripId, ctx);
  if (current.some((p) => p.label === trimmed)) return current;

  try {
    const created = await tripConstraintsApi.create(
      tripId,
      buildCreateSoftConstraintDto({
        name: trimmed,
        priority,
        custom: true,
        constraintsVersion: ctx.constraintsVersion,
      }),
    );
    return [
      ...current,
      { id: created.id, label: created.name, icon: Leaf, priority },
    ];
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) {
      return addCustomSoftPreference(tripId, trimmed, priority);
    }
    throw err;
  }
}

export async function removeSoftConstraint(
  tripId: string,
  preferenceId: string,
  ctx: ConstraintConsoleServiceContext,
): Promise<SoftPreferenceItem[]> {
  const current = resolveSoftPreferences(tripId, ctx);
  if (!current.some((p) => p.id === preferenceId)) return current;

  const apiId = resolveSoftIdForApi(preferenceId);
  try {
    await tripConstraintsApi.remove(tripId, apiId, ctx.constraintsVersion);
    return current.filter((p) => p.id !== preferenceId);
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) {
      return removeSoftPreference(tripId, preferenceId);
    }
    const code = (err as { code?: string }).code;
    if (code === 'WISH_CONSTRAINT_USE_WISH_API') {
      toast.error('成员愿望请通过愿望 API 修改');
      return current;
    }
    throw err;
  }
}

export async function updateSoftConstraintPriority(
  tripId: string,
  preferenceId: string,
  priority: SoftPreferencePriority,
  ctx: ConstraintConsoleServiceContext,
): Promise<SoftPreferenceItem[]> {
  const current = resolveSoftPreferences(tripId, ctx);
  const next = current.map((item) => (item.id === preferenceId ? { ...item, priority } : item));

  const apiId = resolveSoftIdForApi(preferenceId);
  try {
    await tripConstraintsApi.patch(
      tripId,
      apiId,
      patchFromSoftPriority(priority, ctx.constraintsVersion),
    );
    return next;
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) {
      saveSoftPreferences(tripId, next);
      return next;
    }
    handleConstraintApiError(err);
    throw err;
  }
}

import { formatTripMetadataSizeHint } from '@/lib/trip-metadata-size.util';

export const CONSTRAINT_WORKBENCH_TOAST = { position: 'top-center' as const };

/** Show success after dialog close so toast is not covered by modal overlay. */
export function showConstraintSaveSuccess(message: string): void {
  window.requestAnimationFrame(() => {
    toast.success(message, CONSTRAINT_WORKBENCH_TOAST);
  });
}

export function showConstraintSaveInfo(message: string, description?: string): void {
  window.requestAnimationFrame(() => {
    toast.info(message, { ...CONSTRAINT_WORKBENCH_TOAST, description });
  });
}

export function handleConstraintApiError(err: unknown, fallbackMessage = '操作失败'): void {
  const code = (err as { code?: string })?.code;
  const rawMessage = err instanceof Error ? err.message : fallbackMessage;
  const message = formatConstraintSaveErrorMessage(rawMessage);
  switch (code) {
    case 'CONSTRAINTS_STALE':
      toast.error('约束版本已过期，请刷新后重试', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'CONSTRAINT_LOCKED':
      toast.error('该约束已锁定，无法修改', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'LEGACY_CONSTRAINT_USE_DEDICATED_API':
      toast.info('请使用专用编辑流程修改此项', CONSTRAINT_WORKBENCH_TOAST);
      break;
    default:
      toast.error(message, { ...CONSTRAINT_WORKBENCH_TOAST, duration: 6000 });
  }
}

export function formatConstraintSaveErrorMessage(
  message: string,
  metadata?: Record<string, unknown> | null,
): string {
  if (/metadata serialized size/i.test(message) && /exceeds limit/i.test(message)) {
    const hint = formatTripMetadataSizeHint(metadata);
    if (hint) {
      return `保存失败：行程元数据已超过服务端上限。\n${hint}`;
    }
    return '保存失败：行程元数据已超过服务端上限（64KB），需清理或迁移部分扩展数据后才能继续保存';
  }
  return message;
}

export function serviceContextFromApiList(
  apiList: TripConstraintsListResponse | null | undefined,
): ConstraintConsoleServiceContext {
  return {
    apiList: apiList ?? null,
    constraintsVersion: apiList?.meta?.constraintsVersion,
  };
}

/** 保存后局部更新左侧列表项与 constraints 缓存，避免整表 refetch */
export function applyConstraintListItemSave(
  queryClient: QueryClient,
  tripId: string,
  draft: ConstraintEditorDraft,
  options?: Parameters<typeof listEntryPatchFromSavedDraft>[1],
): void {
  const patch = listEntryPatchFromSavedDraft(draft, options);
  if (Object.keys(patch).length > 0) {
    dispatchConstraintListItemPatch(tripId, draft.id, patch);
  }

  const apiId = uiConstraintIdToApi(draft.id);
  queryClient.setQueryData<TripConstraintsListResponse>(
    workbenchKeys.constraints(tripId),
    (old) => {
      if (!old) return old;
      const index = old.items.findIndex((item) => item.id === apiId);
      if (index < 0) return old;
      const change = draftToPreviewChange(draft);
      const items = [...old.items];
      items[index] = {
        ...items[index],
        ...change.patch,
        displayValue:
          typeof patch.value === 'string' ? patch.value : items[index].displayValue,
      };
      return { ...old, items };
    },
  );
}
