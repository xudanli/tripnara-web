/**
 * 行程项绑定体验产品（Experience / Offering / Session）— 读模型与时间轴展示。
 * API：POST/PATCH /api/itinerary-items 的 experienceDefinitionId / productOfferingId / productSessionId。
 */

import { stripSplitPlanNoteLines } from '@/lib/itinerary-split-note.util';
import type { ItineraryItem } from '@/types/trip';

/** 从 ISO 或任意含 HH:mm 的字符串抽出 HH:mm（避免与 itinerary-item-card-format 循环依赖） */
function extractHmLoose(s: string | undefined): string | undefined {
  if (!s || typeof s !== 'string') return undefined;
  const t = s.trim();
  const m = t.match(/(\d{1,2}):(\d{1,2})/);
  if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  return undefined;
}

function normalizeHm(value: string | undefined, _timezone?: string): string | undefined {
  if (!value) return undefined;
  return extractHmLoose(value) ?? (/^\d{1,2}:\d{2}/.test(value) ? value.slice(0, 5) : value);
}

/** BFF 透出的班次快照（select 含 Session 时） */
export interface ItineraryProductSessionSnapshot {
  id?: string;
  meetTimeLocal?: string | null;
  startTimeLocal?: string | null;
  endTimeLocal?: string | null;
  meetingPointPlaceId?: number | null;
  meetingPointName?: string | null;
  meetingPointAddress?: string | null;
  cancelDeadlineLocal?: string | null;
  /** CANCELLED | WEATHER_HOLD | OPEN | … */
  status?: string | null;
  requiredGear?: string[] | null;
  weatherDependency?: string | null;
}

export interface ItineraryProductOfferingSnapshot {
  id?: string;
  name?: string | null;
  title?: string | null;
  supplierName?: string | null;
}

export interface ItineraryExperienceDefinitionSnapshot {
  id?: string;
  name?: string | null;
  title?: string | null;
  /** 如 OUTDOOR_ADVENTURE / GLACIER_HIKING */
  categoryHint?: string | null;
  canonicalType?: string | null;
}

export interface ItineraryProductNoteFields {
  /** 集合抵达 HH:mm（到会点） */
  arriveLocal?: string;
  /** 天气 Plan B 已确认 */
  hasFallbackPlan?: boolean;
  /** 非产品 JSON 的可读备注 */
  userNote?: string;
}

/** 时间轴「冰川徒步卡」等产品绑定条目的展示模型 */
export interface ItineraryProductBindView {
  bound: boolean;
  experienceDefinitionId?: string;
  productOfferingId?: string;
  productSessionId?: string;
  /** 产品/体验名（优先 Offering → Experience） */
  productTitle?: string;
  typeLabel: string;
  typeEmoji: string;
  /** 集合 HH:mm，优先于活动 startTime */
  meetTimeLocal?: string;
  /** 左侧时间轴主标签，如「集合 08:30」 */
  timeLabelOverride?: string;
  meetingPointName?: string;
  meetingPointAddress?: string;
  requiredGear: string[];
  cancelDeadlineLocal?: string;
  weatherDependency?: string;
  weatherDependencyLabel?: string;
  sessionStatus?: string;
  sessionStatusLabel?: string;
  arriveLocal?: string;
  hasFallbackPlan?: boolean;
  /** 副文案行（集合点 · 装备 · 取消 · 天气） */
  subtitleLines: string[];
}

const PRODUCT_ISSUE_KINDS = [
  'product_session_time_window',
  'meeting_point_buffer',
  'product_participant_eligibility',
  'product_weather_dependency',
] as const;

export type ProductFeasibilityIssueKind = (typeof PRODUCT_ISSUE_KINDS)[number];

export function isProductFeasibilityIssueKind(
  kind: string | null | undefined,
): kind is ProductFeasibilityIssueKind {
  return Boolean(kind && (PRODUCT_ISSUE_KINDS as readonly string[]).includes(kind));
}

export function filterProductFeasibilityIssues<T extends { issueKind?: string | null }>(
  issues: T[],
): T[] {
  return issues.filter((issue) => isProductFeasibilityIssueKind(issue.issueKind));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

/** 解析 note JSON：`{"arriveLocal":"08:30","hasFallbackPlan":true}`；与分流 note 行兼容 */
export function parseItineraryProductNote(note?: string | null): ItineraryProductNoteFields {
  const stripped = stripSplitPlanNoteLines(note)?.trim();
  if (!stripped) return {};

  if (stripped.startsWith('{')) {
    try {
      const parsed = asRecord(JSON.parse(stripped));
      if (!parsed) return { userNote: stripped };
      const arriveLocal = pickString(parsed.arriveLocal, parsed.arrive_local);
      const hasFallback =
        typeof parsed.hasFallbackPlan === 'boolean'
          ? parsed.hasFallbackPlan
          : typeof parsed.has_fallback_plan === 'boolean'
            ? parsed.has_fallback_plan
            : undefined;
      const userNote = pickString(parsed.userNote, parsed.user_note, parsed.note);
      return {
        arriveLocal,
        hasFallbackPlan: hasFallback,
        userNote,
      };
    } catch {
      return { userNote: stripped };
    }
  }

  return { userNote: stripped };
}

function readSessionSnapshot(item: ItineraryItem): ItineraryProductSessionSnapshot | null {
  const raw =
    (item as { ProductSession?: unknown }).ProductSession ??
    (item as { productSession?: unknown }).productSession ??
    item.metadata?.productSession ??
    item.metadata?.ProductSession;
  const record = asRecord(raw);
  if (!record) {
    const meet = pickString(
      item.metadata?.meetTimeLocal,
      item.metadata?.meet_time_local,
    );
    if (!meet && !pickString(item.metadata?.meetingPointName)) return null;
    return {
      meetTimeLocal: meet,
      meetingPointName: pickString(
        item.metadata?.meetingPointName,
        item.metadata?.meeting_point_name,
      ),
      meetingPointAddress: pickString(
        item.metadata?.meetingPointAddress,
        item.metadata?.meeting_point_address,
      ),
      cancelDeadlineLocal: pickString(
        item.metadata?.cancelDeadlineLocal,
        item.metadata?.cancel_deadline_local,
      ),
      requiredGear: pickStringArray(
        item.metadata?.requiredGear ?? item.metadata?.required_gear,
      ),
      weatherDependency: pickString(
        item.metadata?.weatherDependency,
        item.metadata?.weather_dependency,
      ),
      status: pickString(item.metadata?.sessionStatus, item.metadata?.session_status),
    };
  }

  return {
    id: pickString(record.id),
    meetTimeLocal: pickString(record.meetTimeLocal, record.meet_time_local),
    startTimeLocal: pickString(record.startTimeLocal, record.start_time_local),
    endTimeLocal: pickString(record.endTimeLocal, record.end_time_local),
    meetingPointPlaceId:
      typeof record.meetingPointPlaceId === 'number'
        ? record.meetingPointPlaceId
        : typeof record.meeting_point_place_id === 'number'
          ? record.meeting_point_place_id
          : null,
    meetingPointName: pickString(record.meetingPointName, record.meeting_point_name),
    meetingPointAddress: pickString(
      record.meetingPointAddress,
      record.meeting_point_address,
    ),
    cancelDeadlineLocal: pickString(
      record.cancelDeadlineLocal,
      record.cancel_deadline_local,
    ),
    status: pickString(record.status),
    requiredGear: pickStringArray(record.requiredGear ?? record.required_gear),
    weatherDependency: pickString(record.weatherDependency, record.weather_dependency),
  };
}

function readOfferingSnapshot(item: ItineraryItem): ItineraryProductOfferingSnapshot | null {
  const raw =
    (item as { ProductOffering?: unknown }).ProductOffering ??
    (item as { productOffering?: unknown }).productOffering ??
    item.metadata?.productOffering ??
    item.metadata?.ProductOffering;
  const record = asRecord(raw);
  if (!record) return null;
  return {
    id: pickString(record.id),
    name: pickString(record.name, record.title),
    title: pickString(record.title, record.name),
    supplierName: pickString(record.supplierName, record.supplier_name),
  };
}

function readExperienceSnapshot(
  item: ItineraryItem,
): ItineraryExperienceDefinitionSnapshot | null {
  const raw =
    (item as { ExperienceDefinition?: unknown }).ExperienceDefinition ??
    (item as { experienceDefinition?: unknown }).experienceDefinition ??
    item.metadata?.experienceDefinition ??
    item.metadata?.ExperienceDefinition;
  const record = asRecord(raw);
  if (!record) return null;
  return {
    id: pickString(record.id),
    name: pickString(record.name, record.title),
    title: pickString(record.title, record.name),
    categoryHint: pickString(record.categoryHint, record.category_hint, record.canonicalType),
    canonicalType: pickString(record.canonicalType, record.canonical_type),
  };
}

function readBindIds(item: ItineraryItem): {
  experienceDefinitionId?: string;
  productOfferingId?: string;
  productSessionId?: string;
} {
  return {
    experienceDefinitionId: pickString(
      item.experienceDefinitionId,
      (item as { experience_definition_id?: string }).experience_definition_id,
      item.metadata?.experienceDefinitionId,
    ),
    productOfferingId: pickString(
      item.productOfferingId,
      (item as { product_offering_id?: string }).product_offering_id,
      item.metadata?.productOfferingId,
    ),
    productSessionId: pickString(
      item.productSessionId,
      (item as { product_session_id?: string }).product_session_id,
      item.metadata?.productSessionId,
    ),
  };
}

export function isProductBoundItineraryItem(item: Pick<ItineraryItem, 'experienceDefinitionId' | 'productOfferingId' | 'productSessionId' | 'metadata'>): boolean {
  const ids = readBindIds(item as ItineraryItem);
  return Boolean(
    ids.experienceDefinitionId || ids.productOfferingId || ids.productSessionId,
  );
}

function weatherDependencyLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  if (u === 'NONE' || u === 'LOW') return '天气依赖低';
  if (u === 'MEDIUM') return '天气依赖中';
  if (u === 'HIGH' || u === 'CRITICAL') return '强天气依赖';
  if (/天气|weather/i.test(raw)) return raw;
  return `天气依赖 · ${raw}`;
}

function sessionStatusLabel(raw?: string): string | undefined {
  if (!raw) return undefined;
  const u = raw.toUpperCase();
  if (u === 'CANCELLED') return '班次已取消';
  if (u === 'WEATHER_HOLD') return '天气暂挂';
  if (u === 'OPEN' || u === 'AVAILABLE') return '班次可订';
  return raw;
}

function productTypeBadge(experience: ItineraryExperienceDefinitionSnapshot | null): {
  typeLabel: string;
  typeEmoji: string;
} {
  const hint = (
    experience?.categoryHint ??
    experience?.canonicalType ??
    experience?.name ??
    ''
  ).toUpperCase();
  if (/GLACIER|冰川/.test(hint)) {
    return { typeLabel: '冰川徒步', typeEmoji: '🧊' };
  }
  if (/HIKE|WALK|徒步|登山/.test(hint)) {
    return { typeLabel: '徒步体验', typeEmoji: '🥾' };
  }
  if (/OUTDOOR|ADVENTURE|户外/.test(hint)) {
    return { typeLabel: '户外体验', typeEmoji: '🏔️' };
  }
  return { typeLabel: '体验产品', typeEmoji: '🎫' };
}

/**
 * 从行程项解析产品绑定展示；未绑定时返回 `bound: false`。
 */
export function resolveItineraryProductBindView(
  item: ItineraryItem,
  timezone?: string,
): ItineraryProductBindView | null {
  const ids = readBindIds(item);
  if (!ids.experienceDefinitionId && !ids.productOfferingId && !ids.productSessionId) {
    return null;
  }

  const session = readSessionSnapshot(item);
  const offering = readOfferingSnapshot(item);
  const experience = readExperienceSnapshot(item);
  const noteFields = parseItineraryProductNote(item.note);
  const metaArrive = pickString(item.metadata?.arriveLocal, item.metadata?.arrive_local);
  const metaFallback =
    typeof item.metadata?.hasFallbackPlan === 'boolean'
      ? item.metadata.hasFallbackPlan
      : typeof item.metadata?.has_fallback_plan === 'boolean'
        ? item.metadata.has_fallback_plan
        : undefined;

  const meetTimeLocal = normalizeHm(
    pickString(session?.meetTimeLocal, noteFields.arriveLocal, metaArrive),
    timezone,
  );
  const startHm = extractHmLoose(item.startTime);
  const endHm = extractHmLoose(item.endTime);

  let timeLabelOverride: string | undefined;
  if (meetTimeLocal) {
    timeLabelOverride =
      startHm && endHm && startHm !== meetTimeLocal
        ? `集合 ${meetTimeLocal}`
        : `集合 ${meetTimeLocal}`;
  }

  const hasSessionOrOffering = Boolean(ids.productSessionId || ids.productOfferingId);
  const badge = productTypeBadge(experience);
  // 有体验先显示体验名；有班次/供应商再叠 Offering 名
  const productTitle = hasSessionOrOffering
    ? pickString(
        offering?.title,
        offering?.name,
        experience?.title,
        experience?.name,
      )
    : pickString(experience?.title, experience?.name, offering?.title, offering?.name);

  const meetingPointName = pickString(
    session?.meetingPointName,
    item.Place?.displayName,
    item.Place?.nameCN,
    item.Place?.nameEN,
    item.placeName,
  );
  const meetingPointAddress = pickString(session?.meetingPointAddress, item.Place?.address);
  const requiredGear = session?.requiredGear?.length
    ? session.requiredGear
    : pickStringArray(item.metadata?.requiredGear ?? item.metadata?.required_gear);
  const cancelDeadlineLocal = normalizeHm(session?.cancelDeadlineLocal ?? undefined, timezone);
  const weatherDep = pickString(session?.weatherDependency);
  const weatherLabel = weatherDependencyLabel(weatherDep);
  const status = pickString(session?.status);
  const statusLabel = sessionStatusLabel(status);
  const arriveLocal = normalizeHm(noteFields.arriveLocal ?? metaArrive, timezone);
  const hasFallbackPlan = noteFields.hasFallbackPlan ?? metaFallback;

  const subtitleLines: string[] = [];
  if (!hasSessionOrOffering && meetingPointName) {
    subtitleLines.push(`地点 · ${meetingPointName}`);
  }
  if (hasSessionOrOffering && offering) {
    const supplier = pickString(offering.supplierName, offering.name, offering.title);
    if (supplier) subtitleLines.push(`供应商 · ${supplier}`);
  }
  if (meetingPointName && hasSessionOrOffering) subtitleLines.push(`集合点 · ${meetingPointName}`);
  if (arriveLocal && arriveLocal !== meetTimeLocal) {
    subtitleLines.push(`预计抵达 ${arriveLocal}`);
  }
  if (startHm && endHm && meetTimeLocal) {
    subtitleLines.push(`活动 ${startHm}-${endHm}`);
  } else if (startHm && endHm && !hasSessionOrOffering) {
    subtitleLines.push(`时段 ${startHm}-${endHm}`);
  }
  if (requiredGear.length > 0) {
    subtitleLines.push(`装备 · ${requiredGear.slice(0, 4).join('、')}`);
  }
  if (cancelDeadlineLocal) subtitleLines.push(`取消截止 ${cancelDeadlineLocal}`);
  if (weatherLabel) {
    subtitleLines.push(
      hasFallbackPlan ? `${weatherLabel} · 已备 Plan B` : weatherLabel,
    );
  } else if (hasFallbackPlan) {
    subtitleLines.push('已备天气 Plan B');
  }
  if (statusLabel && status && ['CANCELLED', 'WEATHER_HOLD'].includes(status.toUpperCase())) {
    subtitleLines.unshift(statusLabel);
  }

  return {
    bound: true,
    ...ids,
    productTitle,
    typeLabel: badge.typeLabel,
    typeEmoji: badge.typeEmoji,
    meetTimeLocal,
    timeLabelOverride,
    meetingPointName,
    meetingPointAddress,
    requiredGear,
    cancelDeadlineLocal,
    weatherDependency: weatherDep,
    weatherDependencyLabel: weatherLabel,
    sessionStatus: status,
    sessionStatusLabel: statusLabel,
    arriveLocal,
    hasFallbackPlan,
    subtitleLines,
  };
}
