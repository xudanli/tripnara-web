import { DEFAULT_PROFILE_CARD_UI } from '../constants/default-profile-card-ui';
import { extractTripIntentTags } from './trip-intent';
import type { OdysseyProfileCardUi, OdysseyProfileCardView, OdysseyProfileSummary } from '@/types/odyssey-intake';

function mergeUi(partial?: Partial<OdysseyProfileCardUi>): OdysseyProfileCardUi {
  return {
    ...DEFAULT_PROFILE_CARD_UI,
    ...partial,
    cta: {
      ...DEFAULT_PROFILE_CARD_UI.cta,
      ...partial?.cta,
    },
    tripIntentTagOptions:
      partial?.tripIntentTagOptions && partial.tripIntentTagOptions.length > 0
        ? partial.tripIntentTagOptions
        : DEFAULT_PROFILE_CARD_UI.tripIntentTagOptions,
  };
}

function inferCompleted(data: Partial<OdysseyProfileCardView>): boolean {
  if (typeof data.completed === 'boolean') return data.completed;
  return Boolean(data.profile?.card);
}

function mergeProfileSummary(
  previous: OdysseyProfileSummary | null | undefined,
  next: Partial<OdysseyProfileSummary> | null | undefined,
  patchRoot: unknown
): OdysseyProfileSummary | null {
  const card = next?.card ?? previous?.card;
  if (!card) return previous ?? null;

  const intentFromPatch = extractTripIntentTags(patchRoot);
  const intentFromNext = next ? extractTripIntentTags(next) : undefined;
  const tripIntentTags =
    intentFromNext ?? intentFromPatch ?? next?.tripIntentTags ?? previous?.tripIntentTags;

  return {
    mbtiType: next?.mbtiType ?? previous?.mbtiType ?? card.mbtiType ?? '',
    card,
    tripIntentTags,
    profileRefreshPending: next?.profileRefreshPending ?? previous?.profileRefreshPending,
    profileRefreshMessage: next?.profileRefreshMessage ?? previous?.profileRefreshMessage,
  };
}

/** 补齐 API 可能缺失的 ui 字段，避免 Profile 页运行时崩溃 */
export function normalizeProfileCardView(raw: unknown): OdysseyProfileCardView {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<OdysseyProfileCardView>;
  const profile = mergeProfileSummary(null, data.profile ?? null, data);
  return {
    completed: inferCompleted({ ...data, profile }),
    profile,
    tripMeta: data.tripMeta ?? null,
    trust: data.trust ?? null,
    ui: mergeUi(data.ui),
  };
}

/**
 * PATCH trip-intent 等增量响应与已有卡片合并，避免 completed / profile.card 被局部响应冲掉。
 */
export function mergeProfileCardView(
  previous: OdysseyProfileCardView | undefined,
  patch: unknown
): OdysseyProfileCardView {
  if (!previous) return normalizeProfileCardView(patch);

  const next = (patch && typeof patch === 'object' ? patch : {}) as Partial<OdysseyProfileCardView>;
  const profile = mergeProfileSummary(previous.profile, next.profile ?? undefined, next);

  const merged: Partial<OdysseyProfileCardView> = {
    ...previous,
    ...next,
    profile,
    tripMeta: next.tripMeta ?? previous.tripMeta,
    trust: next.trust ?? previous.trust,
    ui: mergeUi({ ...previous.ui, ...next.ui }),
  };

  merged.completed = inferCompleted(merged);

  return normalizeProfileCardView(merged);
}

/** 乐观更新出行状态（不改变底层人格 card） */
export function applyTripIntentTag(
  view: OdysseyProfileCardView | undefined,
  tripIntentTag: string
): OdysseyProfileCardView {
  if (!view?.profile?.card) {
    return mergeProfileCardView(view, { tripIntentTag, tripIntentTags: [tripIntentTag] });
  }
  return mergeProfileCardView(view, {
    profile: {
      ...view.profile,
      tripIntentTags: [tripIntentTag],
    },
    tripIntentTag,
  });
}
