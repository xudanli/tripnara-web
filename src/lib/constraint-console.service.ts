import { Leaf, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { tripConstraintsApi, isTripConstraintsUnavailable, TripConstraintsApiError } from '@/api/trip-constraints';
import {
  apiConstraintIdToUi,
  buildCreateHardConstraintDto,
  buildCreateSoftConstraintDto,
  draftToPreviewChange,
  findApiHardConstraintByTemplateId,
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
import {
  getHardConstraintTemplate,
  getSoftConstraintTemplate,
  isCatalogHardTemplate,
  type ConstraintTemplate,
} from '@/components/plan-studio/workbench/constraint-templates';
import type { ConstraintEditorDraft } from '@/components/plan-studio/workbench/constraint-console-types';
import { dispatchConstraintListItemPatch } from '@/lib/plan-studio-constraints-events';
import { buildHardConstraintMetadata } from '@/lib/constraint-metadata.util';
import { resolveSoftTemplateDefaultPriority } from '@/lib/soft-constraint.util';
import { isOfficialRuleConstraintId } from '@/lib/trip-constraint-destination-rule.util';
import { isConstraintsStaleError } from '@/api/frontend-travel-decision-contract-api-client';
import { workbenchKeys } from '@/pages/plan-studio/hooks/useWorkbenchData';
import type { QueryClient } from '@tanstack/react-query';
import { mergeContractPatch } from '@/lib/trip-constraints-contract.util';
import { constraintAssessmentKeys } from '@/lib/constraint-assessment-query.util';
import type {
  PatchTripConstraintsContractDto,
  PatchTripConstraintsContractResponse,
  TripConstraintsListResponse,
  TripConstraint,
} from '@/types/trip-constraints';
import { formatTripMetadataSizeHint } from '@/lib/trip-metadata-size.util';

export interface ConstraintConsoleServiceContext {
  constraintsVersion?: number;
  apiList?: TripConstraintsListResponse | null;
}

export interface ConstraintConsoleMutationOptions {
  queryClient?: QueryClient;
}

async function refreshConstraintsList(
  queryClient: QueryClient,
  tripId: string,
): Promise<TripConstraintsListResponse> {
  return queryClient.fetchQuery({
    queryKey: workbenchKeys.constraints(tripId),
    queryFn: () => tripConstraintsApi.list(tripId),
  });
}

/** 版本冲突时拉取最新 constraints 列表并重试一次 */
async function runWithStaleRetry<T>(
  tripId: string,
  ctx: ConstraintConsoleServiceContext,
  options: ConstraintConsoleMutationOptions | undefined,
  run: (input: {
    version: number | undefined;
    apiList: TripConstraintsListResponse | null;
  }) => Promise<T>,
): Promise<T> {
  try {
    return await run({
      version: ctx.constraintsVersion,
      apiList: ctx.apiList ?? null,
    });
  } catch (err) {
    if (!isConstraintsStaleError(err) || !options?.queryClient) throw err;
    const freshList = await refreshConstraintsList(options.queryClient, tripId);
    return run({
      version: freshList.meta?.constraintsVersion,
      apiList: freshList,
    });
  }
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

export async function addHardConstraintFromTemplate(
  tripId: string,
  template: ConstraintTemplate,
  ctx: ConstraintConsoleServiceContext,
  options?: ConstraintConsoleMutationOptions,
): Promise<TripConstraint | null> {
  if (template.kind !== 'hard' || template.legacyKey || !isCatalogHardTemplate(template.id)) {
    return null;
  }
  if (findApiHardConstraintByTemplateId(ctx.apiList?.items, template.id)) return null;

  try {
    return await runWithStaleRetry(tripId, ctx, options, async ({ version, apiList }) => {
      if (findApiHardConstraintByTemplateId(apiList?.items, template.id)) return null;
      return tripConstraintsApi.create(
        tripId,
        buildCreateHardConstraintDto({
          template,
          constraintsVersion: version,
        }),
      );
    });
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) return null;
    throw err;
  }
}

/** BFF catalog 硬约束 · PATCH 保存（OFFICIAL_RULE 禁止） */
export async function saveCatalogHardConstraint(
  tripId: string,
  draft: ConstraintEditorDraft,
  ctx: ConstraintConsoleServiceContext,
  options?: ConstraintConsoleMutationOptions,
): Promise<boolean> {
  if (!isCatalogHardTemplate(draft.id)) return false;
  const template = getHardConstraintTemplate(draft.id);
  if (!template || template.legacyKey) return false;

  const change = draftToPreviewChange(draft);

  return runWithStaleRetry(tripId, ctx, options, async ({ version, apiList }) => {
    const existing = findApiHardConstraintByTemplateId(apiList?.items, draft.id);
    if (!existing) return null;
    if (isOfficialRuleConstraintId(existing.id) || existing.source?.type === 'OFFICIAL_RULE') {
      toast.error(OFFICIAL_RULE_READONLY_HINT, CONSTRAINT_WORKBENCH_TOAST);
      return null;
    }
    return tripConstraintsApi.patch(tripId, existing.id, {
      ...change.patch,
      constraintsVersion: version,
    });
  }).then((result) => {
    if (!result) return false;
    if (options?.queryClient) {
      bumpConstraintsListVersion(
        options.queryClient,
        tripId,
        extractConstraintsVersionFromPatchResult(result),
      );
    }
    return true;
  });
}

/** PATCH 单条约束 · 带版本过期自动重试 */
export async function patchTripConstraintItem(
  tripId: string,
  constraintId: string,
  patch: Omit<import('@/types/trip-constraints').PatchTripConstraintDto, 'constraintsVersion'>,
  ctx: ConstraintConsoleServiceContext,
  options?: ConstraintConsoleMutationOptions,
): Promise<TripConstraint> {
  const result = await runWithStaleRetry(tripId, ctx, options, ({ version }) =>
    tripConstraintsApi.patch(tripId, constraintId, {
      ...patch,
      constraintsVersion: version,
    }),
  );
  if (options?.queryClient) {
    bumpConstraintsListVersion(
      options.queryClient,
      tripId,
      extractConstraintsVersionFromPatchResult(result),
    );
  }
  return result;
}

export async function addSoftConstraintFromTemplate(
  tripId: string,
  templateId: string,
  ctx: ConstraintConsoleServiceContext,
  priority?: SoftPreferencePriority,
  options?: ConstraintConsoleMutationOptions,
): Promise<SoftPreferenceItem[]> {
  const template = getSoftConstraintTemplate(templateId);
  if (!template) return resolveSoftPreferences(tripId, ctx);

  const effectivePriority =
    priority ??
    template.defaultPriority ??
    resolveSoftTemplateDefaultPriority(templateId);

  const current = resolveSoftPreferences(tripId, ctx);
  if (current.some((p) => p.id === templateId || p.label === template.label)) {
    return current;
  }

  try {
    const created = await runWithStaleRetry(tripId, ctx, options, ({ version }) =>
      tripConstraintsApi.create(
        tripId,
        buildCreateSoftConstraintDto({
          name: template.label,
          templateId,
          priority: effectivePriority,
          constraintsVersion: version,
        }),
      ),
    );
    return [
      ...current,
      {
        id: created.id,
        label: created.name,
        icon: template.icon,
        priority: effectivePriority,
      },
    ];
  } catch (err) {
    if (isTripConstraintsUnavailable(err)) {
      return addSoftPreference(tripId, templateId, effectivePriority);
    }
    throw err;
  }
}

export async function addCustomSoftConstraint(
  tripId: string,
  label: string,
  ctx: ConstraintConsoleServiceContext,
  priority: SoftPreferencePriority = '中',
  options?: ConstraintConsoleMutationOptions,
): Promise<SoftPreferenceItem[]> {
  const trimmed = label.trim();
  if (!trimmed) return resolveSoftPreferences(tripId, ctx);

  const current = resolveSoftPreferences(tripId, ctx);
  if (current.some((p) => p.label === trimmed)) return current;

  try {
    const created = await runWithStaleRetry(tripId, ctx, options, ({ version }) =>
      tripConstraintsApi.create(
        tripId,
        buildCreateSoftConstraintDto({
          name: trimmed,
          priority,
          custom: true,
          constraintsVersion: version,
        }),
      ),
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
  options?: ConstraintConsoleMutationOptions,
): Promise<SoftPreferenceItem[]> {
  const current = resolveSoftPreferences(tripId, ctx);
  if (!current.some((p) => p.id === preferenceId)) return current;

  const apiId = resolveSoftIdForApi(preferenceId);
  try {
    await runWithStaleRetry(tripId, ctx, options, ({ version }) =>
      tripConstraintsApi.remove(tripId, apiId, version),
    );
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
  options?: { queryClient?: QueryClient },
): Promise<SoftPreferenceItem[]> {
  const current = resolveSoftPreferences(tripId, ctx);
  const next = current.map((item) => (item.id === preferenceId ? { ...item, priority } : item));

  const apiId = resolveSoftIdForApi(preferenceId, ctx.apiList?.items);

  const runPatch = async (constraintsVersion: number | undefined) =>
    tripConstraintsApi.patch(tripId, apiId, patchFromSoftPriority(priority, constraintsVersion));

  try {
    const result = await runWithStaleRetry(tripId, ctx, options, ({ version }) => runPatch(version));
    if (options?.queryClient) {
      bumpConstraintsListVersion(
        options.queryClient,
        tripId,
        extractConstraintsVersionFromPatchResult(result),
      );
    }
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

function extractConstraintsVersionFromPatchResult(result: TripConstraint): number | undefined {
  const nested = (result as TripConstraint & { constraints?: { constraintsVersion?: number } })
    .constraints;
  return nested?.constraintsVersion;
}

function bumpConstraintsListVersion(
  queryClient: QueryClient,
  tripId: string,
  nextVersion?: number,
): void {
  queryClient.setQueryData<TripConstraintsListResponse>(
    workbenchKeys.constraints(tripId),
    (old) => {
      if (!old?.meta) return old;
      const version =
        nextVersion ??
        (typeof old.meta.constraintsVersion === 'number'
          ? old.meta.constraintsVersion + 1
          : old.meta.constraintsVersion);
      return {
        ...old,
        meta: { ...old.meta, constraintsVersion: version },
      };
    },
  );
  void queryClient.invalidateQueries({ queryKey: constraintAssessmentKeys.all(tripId) });
}

/** contract PATCH 乐观更新 + 应用 BFF 响应 */
export function applyContractPatchToConstraintsCache(
  queryClient: QueryClient,
  tripId: string,
  patch: PatchTripConstraintsContractDto,
  response?: PatchTripConstraintsContractResponse | null,
): void {
  queryClient.setQueryData<TripConstraintsListResponse>(
    workbenchKeys.constraints(tripId),
    (old) => {
      if (!old) return old;
      const contract = response?.contract ?? mergeContractPatch(old.contract, patch);
      return {
        ...old,
        contract,
        meta: {
          ...old.meta,
          constraintsVersion:
            response?.constraintsVersion ??
            patch.constraintsVersion ??
            old.meta.constraintsVersion,
        },
      };
    },
  );
}

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
  const code =
    err instanceof TripConstraintsApiError
      ? err.code
      : (err as { code?: string })?.code;
  const rawMessage = err instanceof Error ? err.message : fallbackMessage;
  const message = formatConstraintSaveErrorMessage(rawMessage);
  switch (code) {
    case 'CONSTRAINTS_STALE':
      toast.error('约束数据已更新，暂时无法保存，请稍后再试', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'CONSTRAINT_LOCKED':
      toast.error('该约束已锁定，无法修改', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'OFFICIAL_RULE_READONLY':
      toast.error(OFFICIAL_RULE_READONLY_HINT, CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'UNKNOWN_CONSTRAINT_TEMPLATE':
      toast.error('该约束模板尚未在后端注册，请联系管理员扩展 template registry', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'CONSTRAINT_TEMPLATE_ALREADY_EXISTS':
      toast.info('该约束模板已添加，请在列表中编辑', CONSTRAINT_WORKBENCH_TOAST);
      break;
    case 'LEGACY_CONSTRAINT_USE_PATCH':
      toast.info('此项为 legacy 约束，请使用专用编辑流程修改', CONSTRAINT_WORKBENCH_TOAST);
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
  const listPatch: Partial<import('@/components/plan-studio/workbench/constraint-console-types').ConstraintListEntry> = {
    ...patch,
  };
  if (draft.type === 'HARD' && draft.id !== 'travelers' && draft.id !== 'transport') {
    const template = getHardConstraintTemplate(draft.id);
    const meta = buildHardConstraintMetadata({
      entry: {
        id: draft.id,
        kind: 'hard',
        label: draft.name,
        icon: template?.icon ?? Lock,
      },
      draft,
    });
    listPatch.metadata = meta;
  }
  if (Object.keys(listPatch).length > 0) {
    dispatchConstraintListItemPatch(tripId, draft.id, listPatch);
  }

  const apiId = uiConstraintIdToApi(draft.id);
  queryClient.setQueryData<TripConstraintsListResponse>(
    workbenchKeys.constraints(tripId),
    (old) => {
      if (!old) return old;
      const index = old.items.findIndex(
        (item) =>
          item.id === apiId ||
          item.id === draft.id ||
          item.source?.templateId === draft.id ||
          apiConstraintIdToUi(item.id) === draft.id,
      );
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
