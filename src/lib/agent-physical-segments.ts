/**
 * `orchestrationResult.itinerary.action_plan` 与 POI 卡关联：
 * 优先 `spatial_projection.poi_card_match_keys`，再 `target_ref`。
 * `collectPoiCardMatchKeys` 与行程项/卡片字段对齐，便于单测与工具复用。
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function pickStr(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickIdLike(o: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  }
  return undefined;
}

export type ActionPlanRow = Record<string, unknown>;

/** 与 POI 卡 / 行程项对齐的最小字段（camelCase + snake_case） */
export type PoiCardLike = {
  itineraryItemId?: string;
  itinerary_item_id?: string;
  placeId?: string | number | null;
  place_id?: string | number | null;
};

export interface PhysicalSegmentHint {
  actionId?: string;
  segmentId?: string;
  enterAt?: string;
  roadIds: string[];
}

/**
 * 由行程项 / POI 原始对象生成 `poi_card_match_keys` 的等价集合（与后端 collectPoiCardMatchKeys 对齐意图）。
 * 默认：`id` / `itinerary_item_id`、`location_ref.place_id`、顶层 `place_id`，以及 metadata 别名。
 */
export function collectPoiCardMatchKeys(item: Record<string, unknown>): string[] {
  const keys = new Set<string>();

  const primaryId =
    pickIdLike(item, 'id', 'itinerary_item_id', 'itineraryItemId') ??
    (typeof item.itineraryItemId === 'string' ? item.itineraryItemId : undefined);
  if (primaryId) keys.add(primaryId);

  const loc =
    item.location_ref && isRecord(item.location_ref)
      ? item.location_ref
      : item.locationRef && isRecord(item.locationRef)
        ? item.locationRef
        : undefined;
  if (loc) {
    const pid = pickIdLike(loc, 'place_id', 'placeId');
    if (pid) keys.add(pid);
  }

  const topPlace = pickIdLike(item, 'place_id', 'placeId');
  if (topPlace) keys.add(topPlace);

  const meta =
    item.metadata && isRecord(item.metadata)
      ? item.metadata
      : item.meta && isRecord(item.meta)
        ? item.meta
        : undefined;
  if (meta) {
    const aliases = meta.itinerary_item_id_aliases ?? meta.itineraryItemIdAliases;
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        const s = a != null ? String(a).trim() : '';
        if (s) keys.add(s);
      }
    }
    const leg = meta.legacy_item_id ?? meta.legacyItemId;
    if (typeof leg === 'string' && leg.trim()) keys.add(leg.trim());
    const dup = meta.duplicate_item_id ?? meta.duplicateItemId;
    if (typeof dup === 'string' && dup.trim()) keys.add(dup.trim());
  }

  return [...keys].filter(Boolean);
}

/**
 * 是否应将本条 physical action 挂到该 POI 卡上。
 * 优先 `action_input.spatial_projection.poi_card_match_keys`，再用 `target_ref`。
 */
export function physicalActionLinksToCard(action: ActionPlanRow, card: PoiCardLike): boolean {
  const input = action.action_input;
  const ai = isRecord(input) ? input : undefined;
  const sp = ai?.spatial_projection ?? ai?.spatialProjection;
  const spObj = isRecord(sp) ? sp : undefined;
  const keysRaw = spObj?.poi_card_match_keys ?? spObj?.poiCardMatchKeys;
  const keys = Array.isArray(keysRaw) ? keysRaw.map((x) => String(x)) : undefined;

  const cardItin =
    card.itinerary_item_id != null && String(card.itinerary_item_id).trim()
      ? String(card.itinerary_item_id).trim()
      : card.itineraryItemId != null && String(card.itineraryItemId).trim()
        ? String(card.itineraryItemId).trim()
        : '';
  const cardPlace =
    card.place_id != null && String(card.place_id).trim()
      ? String(card.place_id).trim()
      : card.placeId != null && String(card.placeId).trim()
        ? String(card.placeId).trim()
        : '';

  if (keys?.length) {
    if (cardItin && keys.includes(cardItin)) return true;
    if (cardPlace && keys.includes(cardPlace)) return true;
    return false;
  }

  const tr =
    (typeof action.target_ref === 'string' && action.target_ref.trim()) ||
    (typeof action.targetRef === 'string' && action.targetRef.trim()) ||
    (ai && typeof ai.target_ref === 'string' && ai.target_ref.trim()) ||
    (ai && typeof ai.targetRef === 'string' && ai.targetRef.trim()) ||
    '';

  if (tr) return tr === cardItin;
  return false;
}

function readRoadIds(actionInput: Record<string, unknown>): string[] {
  const roadIds: string[] = [];
  const fh = actionInput.froad_check_hints ?? actionInput.froadCheckHints;
  if (isRecord(fh)) {
    const ids = fh.road_ids ?? fh.roadIds;
    if (Array.isArray(ids)) {
      for (const x of ids) {
        const s = String(x).trim();
        if (s) roadIds.push(s);
      }
    }
  }
  return roadIds;
}

function buildPhysicalHint(raw: ActionPlanRow, actionInput: Record<string, unknown>): PhysicalSegmentHint {
  return {
    actionId: typeof raw.action_id === 'string' ? raw.action_id : undefined,
    segmentId:
      pickStr(actionInput, 'segment_id', 'segmentId') ?? pickStr(raw, 'segment_id', 'segmentId'),
    enterAt: pickStr(actionInput, 'enter_at', 'enterAt'),
    roadIds: readRoadIds(actionInput),
  };
}

function getActionPlan(orchestrationResult: unknown): ActionPlanRow[] | undefined {
  if (!isRecord(orchestrationResult)) return undefined;
  const it = orchestrationResult.itinerary;
  if (!isRecord(it)) return undefined;
  const plan = it.action_plan;
  return Array.isArray(plan) ? (plan as ActionPlanRow[]) : undefined;
}

/**
 * 收集与某张 POI 卡关联的 physical 路段提示（含 physical_domain 的 action_plan 行）。
 */
export function extractPhysicalHintsForPoiCard(
  orchestrationResult: unknown,
  card: PoiCardLike
): PhysicalSegmentHint[] {
  const plan = getActionPlan(orchestrationResult);
  if (!plan?.length) return [];

  const hints: PhysicalSegmentHint[] = [];
  for (const raw of plan) {
    if (!isRecord(raw)) continue;
    const actionInput = raw.action_input;
    if (!isRecord(actionInput)) continue;

    const pd = actionInput.physical_domain ?? actionInput.physicalDomain;
    if (pd == null || pd === '') continue;

    if (!physicalActionLinksToCard(raw, card)) continue;

    hints.push(buildPhysicalHint(raw, actionInput));
  }
  return hints;
}

/**
 * @deprecated 优先使用 {@link extractPhysicalHintsForPoiCard} + {@link physicalActionLinksToCard}。
 * 仅按 `target_ref` 分组（无 `poi_card_match_keys` 时的旧行为）。
 */
export function extractPhysicalHintsByTargetRef(
  orchestrationResult: unknown
): Record<string, PhysicalSegmentHint[]> {
  const out: Record<string, PhysicalSegmentHint[]> = {};
  const plan = getActionPlan(orchestrationResult);
  if (!plan) return out;

  for (const raw of plan) {
    if (!isRecord(raw)) continue;
    const actionInput = raw.action_input;
    if (!isRecord(actionInput)) continue;
    const pd = actionInput.physical_domain ?? actionInput.physicalDomain;
    if (pd == null || pd === '') continue;

    const targetRef =
      pickStr(raw, 'target_ref', 'targetRef') ??
      pickStr(actionInput, 'target_ref', 'targetRef');
    if (!targetRef) continue;

    const hint = buildPhysicalHint(raw, actionInput);
    if (!out[targetRef]) out[targetRef] = [];
    out[targetRef].push(hint);
  }
  return out;
}

export function mergeRoadIdsFromHints(hints: PhysicalSegmentHint[]): string[] {
  const set = new Set<string>();
  for (const h of hints) {
    for (const r of h.roadIds) set.add(r);
  }
  return [...set];
}
