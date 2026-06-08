import type {
  InstantiateTripRequest,
  TripInstantiationPlan,
  TripInstantiationPreview,
  TripInstantiationResult,
  TripInstantiationStrategy,
} from '@/types/trip-instantiation';
import {
  normalizeCollaborativeTaskFlywheel,
  normalizeCollaborativeTaskView,
} from '../decision-engine/normalize-collaborative-tasks';
import { normalizeActiveTripPath } from '@/features/active-trip/lib/normalize-active-trip-path';

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
}

function normalizeStrategy(raw: unknown): TripInstantiationStrategy {
  const s = String(raw ?? '').trim();
  if (s === 'route_template_v1' || s === 'vibe_contextual_cards' || s === 'generic_plaza_trip') {
    return s;
  }
  if (/route.?template/i.test(s)) return 'route_template_v1';
  if (/vibe|contextual/i.test(s)) return 'vibe_contextual_cards';
  return 'generic_plaza_trip';
}

function normalizePlan(raw: unknown): TripInstantiationPlan {
  const r = asRecord(raw);
  if (!r) {
    return { strategy: 'generic_plaza_trip', canInstantiate: false, blockReason: '编排计划缺失' };
  }
  const contextualRaw = r.contextualCardIds ?? r.contextual_card_ids;
  const contextualCardIds = Array.isArray(contextualRaw)
    ? contextualRaw.map((id) => String(id)).filter(Boolean)
    : undefined;

  return {
    strategy: normalizeStrategy(r.strategy),
    canInstantiate: r.canInstantiate !== false && r.can_instantiate !== false,
    blockReason:
      typeof r.blockReason === 'string'
        ? r.blockReason
        : typeof r.block_reason === 'string'
          ? r.block_reason
          : null,
    contextualCardIds,
  };
}

function normalizeResult(raw: unknown): TripInstantiationResult | null {
  const r = asRecord(raw);
  if (!r) return null;
  const tripId = asNullableString(r.tripId ?? r.trip_id);
  if (!tripId && r.success === false) {
    return {
      success: false,
      message: typeof r.message === 'string' ? r.message : null,
      plan: r.plan ? normalizePlan(r.plan) : null,
    };
  }
  if (!tripId) return null;

  const activeTripPath = normalizeActiveTripPath(
    asNullableString(r.activeTripPath ?? r.active_trip_path),
    tripId
  );

  return {
    success: r.success !== false,
    message: typeof r.message === 'string' ? r.message : null,
    tripId,
    activeTripPath,
    plan: r.plan ? normalizePlan(r.plan) : undefined,
    instantiatedAt:
      asNullableString(r.instantiatedAt ?? r.instantiated_at) ?? undefined,
    collaborativeTaskFlywheel: normalizeCollaborativeTaskFlywheel(
      r.collaborativeTaskFlywheel ?? r.collaborative_task_flywheel
    ),
  };
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function normalizeTripInstantiationPreview(raw: unknown): TripInstantiationPreview {
  const r = asRecord(raw);
  if (!r) {
    return {
      canInstantiate: false,
      blockReason: '预览数据无效',
      plan: { strategy: 'generic_plaza_trip', canInstantiate: false },
    };
  }

  const plan = normalizePlan(r.plan ?? r);
  const existingResult = normalizeResult(
    r.existingResult ?? r.existing_result ?? r.tripInstantiationResult ?? r.trip_instantiation_result
  );

  const previewTasksRaw = r.collaborativeTaskPreview ?? r.collaborative_task_preview;
  const collaborativeTaskPreview = Array.isArray(previewTasksRaw)
    ? previewTasksRaw
        .map(normalizeCollaborativeTaskView)
        .filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;

  return {
    canInstantiate:
      r.canInstantiate !== false &&
      r.can_instantiate !== false &&
      plan.canInstantiate !== false,
    blockReason:
      typeof r.blockReason === 'string'
        ? r.blockReason
        : typeof r.block_reason === 'string'
          ? r.block_reason
          : plan.blockReason,
    plan,
    existingResult,
    collaborativeTaskPreview,
  };
}

export function normalizeInstantiateTripResult(raw: unknown): TripInstantiationResult {
  const normalized = normalizeResult(raw);
  if (normalized) return normalized;

  const r = asRecord(raw);
  return {
    success: false,
    message: typeof r?.message === 'string' ? r.message : '实例化失败',
    plan: r?.plan ? normalizePlan(r.plan) : null,
  };
}

export function normalizeInstantiateTripRequest(body: InstantiateTripRequest = {}): InstantiateTripRequest {
  return { skipIfExists: body.skipIfExists === true };
}
