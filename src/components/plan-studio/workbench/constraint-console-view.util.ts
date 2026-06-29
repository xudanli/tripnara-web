import {
  Building2,
  Camera,
  Car,
  Clock,
  CloudSun,
  MapPin,
  Route,
  Users,
  Wallet,
  Leaf,
  type LucideIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { formatConstraintDateRange, formatConstraintTravelMode, resolveTravelerCount } from '@/lib/planning-constraints.util';
import {
  resolveConstraintTransportValue,
  type ConstraintTransportValue,
} from '@/lib/planning-constraint-edit-meta';
import { extractFRoadsFromTrip } from '@/utils/iceland-info-inference';
import type { ConstraintPendingKey, PlanningConstraintsSummary } from '@/types/planning-constraints';
import type { PlanningConflictDto } from '@/types/planning-conflicts';
import type { TripDetail } from '@/types/trip';
import type { TripBudgetProfile } from '@/types/trip-budget';
import type { TripConstraint, TripConstraintCardTone } from '@/types/trip-constraints';
import { TRIP_CONSTRAINT_LEGACY_IDS } from '@/types/trip-constraints';
import { isSelfDrivePlanningTrip } from '@/lib/trip-self-drive';
import { readDailyDriveLimitHours } from '@/lib/daily-drive-conflict.util';
import {
  getSoftConstraintTemplate,
  getHardConstraintTemplate,
  isSoftConstraintTemplateId,
} from './constraint-templates';
import {
  DEFAULT_DAILY_DRIVE_DRAFT,
  type ConstraintEditorDraft,
  type ConstraintImpactPreview,
  type ConstraintListEntry,
} from './constraint-console-types';

export type SoftPreferencePriority = '高' | '中' | '低';

export interface SoftPreferenceItem {
  id: string;
  label: string;
  icon: LucideIcon;
  priority: SoftPreferencePriority;
}

export interface HardConstraintItem {
  id: string;
  editKey: ConstraintPendingKey | 'accommodation' | 'daily_drive';
  icon: LucideIcon;
  label: string;
  value: string;
  /** 预算等字段的当前用量（绿色展示） */
  usageLabel?: string;
  locked: boolean;
  /** @deprecated 请用 cardTone */
  hasConflict?: boolean;
  cardTone?: TripConstraintCardTone;
}

export interface ExternalConditionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  updatedAgoLabel: string;
  stale?: boolean;
}

/** @deprecated 仅用于旧数据迁移参考 */
export const DEFAULT_SOFT_PREFERENCES: SoftPreferenceItem[] = [
  { id: 'attractions_over_shopping', label: '景点优于购物', icon: Camera, priority: '高' },
  { id: 'avoid_early', label: '避免连续早起', icon: Clock, priority: '中' },
  { id: 'elderly_rest', label: '老人下午15点前需休息', icon: Users, priority: '高' },
  { id: 'budget_soft', label: '预算约束', icon: Wallet, priority: '高' },
];

interface StoredSoftPreference {
  id: string;
  priority: SoftPreferencePriority;
  customLabel?: string;
  isCustom?: boolean;
}

function resolveStoredSoftPreference(stored: StoredSoftPreference): SoftPreferenceItem | null {
  if (stored.isCustom && stored.customLabel?.trim()) {
    return {
      id: stored.id,
      label: stored.customLabel.trim(),
      icon: Leaf,
      priority: stored.priority,
    };
  }
  const template = getSoftConstraintTemplate(stored.id);
  if (template) {
    return {
      id: template.id,
      label: template.label,
      icon: template.icon,
      priority: stored.priority,
    };
  }
  const legacy = DEFAULT_SOFT_PREFERENCES.find((p) => p.id === stored.id);
  if (legacy) {
    return { ...legacy, priority: stored.priority };
  }
  return null;
}

export function resolveSoftPreferenceById(
  id: string,
  activeItems: SoftPreferenceItem[],
): SoftPreferenceItem | null {
  return activeItems.find((p) => p.id === id) ?? null;
}

export { isSoftConstraintTemplateId };

export const SOFT_PRIORITY_TO_SLIDER: Record<SoftPreferencePriority, number> = {
  高: 85,
  中: 50,
  低: 25,
};

export function sliderToSoftPriority(value: number): SoftPreferencePriority {
  if (value >= 67) return '高';
  if (value >= 34) return '中';
  return '低';
}

export function softPriorityLabelClass(priority: SoftPreferencePriority): string {
  switch (priority) {
    case '高':
      return 'bg-gate-suggest/15 text-gate-suggest-foreground border-gate-suggest-border/60';
    case '中':
      return 'bg-muted text-foreground border-border/70';
    default:
      return 'bg-muted/40 text-muted-foreground border-border/50';
  }
}

export interface MustGoPlaceSummary {
  id: number;
  name: string;
  inItinerary: boolean;
}

export interface RoadRestrictionSummary {
  fRoads: string[];
  valueLabel: string;
  hasSeasonalRisk: boolean;
}

export function extractMustGoPlaces(
  trip: TripDetail | null | undefined,
  intentMustPlaces: number[] = [],
): MustGoPlaceSummary[] {
  const map = new Map<number, MustGoPlaceSummary>();

  for (const id of intentMustPlaces) {
    if (!map.has(id)) {
      map.set(id, { id, name: `地点 #${id}`, inItinerary: false });
    }
  }

  const tripMeta = trip?.metadata as { constraints?: { mustPlaces?: number[] } } | undefined;
  for (const id of tripMeta?.constraints?.mustPlaces ?? []) {
    if (!map.has(id)) {
      map.set(id, { id, name: `地点 #${id}`, inItinerary: false });
    }
  }

  for (const day of trip?.TripDay ?? []) {
    for (const item of day.ItineraryItem ?? []) {
      const required = Boolean(item.isRequired || item.note?.includes('[必游]'));
      if (!required) continue;
      const place = item.Place;
      if (place?.id) {
        map.set(place.id, {
          id: place.id,
          name: place.nameCN || place.nameEN || `地点 #${place.id}`,
          inItinerary: true,
        });
      }
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.inItinerary !== b.inItinerary) return a.inItinerary ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
}

export function formatMustGoValueLabel(places: MustGoPlaceSummary[]): string {
  if (places.length === 0) return '未设置';
  const locked = places.filter((p) => p.inItinerary).length;
  if (locked > 0) {
    if (locked === places.length) return `已锁定 ${locked} 处`;
    return `已锁定 ${locked} 处 · 共 ${places.length} 处`;
  }
  return `${places.length} 处待安排`;
}

/** 保存成功后仅更新左侧列表对应项的展示字段（避免整表 refetch） */
export function listEntryPatchFromSavedDraft(
  draft: ConstraintEditorDraft,
  options?: {
    mustGoPlaces?: MustGoPlaceSummary[];
    travelersCount?: number;
    budgetUsageLabel?: string;
  },
): Partial<ConstraintListEntry> {
  switch (draft.id) {
    case 'time_range': {
      if (draft.startDate && draft.endDate) {
        const start = new Date(draft.startDate);
        const end = new Date(draft.endDate);
        const dayCount = Math.max(
          1,
          Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
        );
        return { value: `${dayCount} 天` };
      }
      return { value: draft.targetValue > 0 ? `${draft.targetValue} 天` : '未设置' };
    }
    case 'budget': {
      const currency = draft.currency ?? 'CNY';
      const travelers = options?.travelersCount ?? 1;
      const perPerson = draft.targetValue / (travelers > 0 ? travelers : 1);
      const base = `${formatCurrency(perPerson, currency)} / 人`;
      return {
        value: options?.budgetUsageLabel ? `${base} · ${options.budgetUsageLabel}` : base,
      };
    }
    case 'daily_drive':
      return { value: `≤ ${draft.targetValue} 小时/天` };
    case 'accommodation':
      return { value: `${draft.targetValue} 星或以上` };
    case 'must_go':
      return options?.mustGoPlaces
        ? { value: formatMustGoValueLabel(options.mustGoPlaces) }
        : {};
    case 'max_segment_distance':
    case 'c_max_segment_distance':
      return { value: `≤ ${draft.targetValue} km` };
    case 'travelers':
      return { value: `${Math.max(1, draft.targetValue)} 人` };
    case 'transport':
      return draft.transportMode
        ? { value: formatConstraintTravelMode(draft.transportMode) }
        : {};
    default:
      if (draft.type === 'SOFT') {
        const priority =
          draft.priority >= 7 ? ('高' as const) : draft.priority >= 4 ? ('中' as const) : ('低' as const);
        return { sliderValue: SOFT_PRIORITY_TO_SLIDER[priority] };
      }
      return {};
  }
}

export function buildRoadRestrictionSummary(
  trip: TripDetail | null | undefined,
): RoadRestrictionSummary {
  const fRoads = extractFRoadsFromTrip(trip);
  if (fRoads.length === 0) {
    return { fRoads: [], valueLabel: '暂无 F 路依赖', hasSeasonalRisk: false };
  }
  const valueLabel =
    fRoads.length <= 3
      ? `${fRoads.join('、')} · 季节性开放`
      : `${fRoads.slice(0, 2).join('、')} 等 ${fRoads.length} 条 · 季节性`;
  return { fRoads, valueLabel, hasSeasonalRisk: true };
}

function readAccommodationStandard(trip: TripDetail | null | undefined): string {
  const meta = trip?.metadata as Record<string, unknown> | undefined;
  const stars = meta?.accommodationStandard ?? meta?.accommodation_standard;
  if (typeof stars === 'string' && stars.trim()) return stars;
  if (typeof stars === 'number') return `${stars} 星或以上`;
  return '3 星或以上';
}

export function buildHardConstraintItems(
  summary: PlanningConstraintsSummary | null,
  trip: TripDetail | null | undefined,
  budgetProfile: TripBudgetProfile | null,
): HardConstraintItem[] {
  if (!summary) return [];

  const items: HardConstraintItem[] = [];
  const dayCount = summary.timeRange.dayCount || trip?.TripDay?.length || 0;
  const dateRange = formatConstraintDateRange(summary.timeRange);

  items.push({
    id: 'time_range',
    editKey: 'time_range',
    icon: Clock,
    label: '总行程时长',
    value: dayCount > 0 ? `${dayCount} 天` : dateRange !== '未设置' ? dateRange : '未设置',
    locked: true,
    cardTone: summary.timeRange.status !== 'confirmed' ? 'caution' : 'default',
  });

  const budgetTotal = summary.budget.total;
  const currency = summary.budget.currency || 'CNY';
  const perPerson =
    summary.travelers.count > 0 && budgetTotal != null
      ? budgetTotal / summary.travelers.count
      : budgetTotal;

  items.push({
    id: 'budget',
    editKey: 'budget',
    icon: Wallet,
    label: '预算上限（总）',
    value:
      perPerson != null
        ? `${formatCurrency(perPerson, currency)} / 人`
        : '未设置',
    usageLabel:
      budgetProfile?.actuals?.totalEstimated != null
        ? formatCurrency(budgetProfile.actuals.totalEstimated, currency)
        : undefined,
    locked: true,
    cardTone:
      summary.budget.status === 'misaligned'
        ? 'danger'
        : summary.budget.status === 'need_confirm'
          ? 'caution'
          : 'default',
  });

  if (isSelfDrivePlanningTrip(trip)) {
    const hours = readDailyDriveLimitHours(trip);
    items.push({
      id: 'daily_drive',
      editKey: 'daily_drive',
      icon: Car,
      label: '每日驾驶上限',
      value: `≤ ${hours} 小时/天`,
      locked: true,
      cardTone: 'default',
    });
  }

  items.push({
    id: 'accommodation',
    editKey: 'accommodation',
    icon: Building2,
    label: '住宿标准',
    value: readAccommodationStandard(trip),
    locked: true,
    cardTone: 'default',
  });

  return items;
}

export function buildExternalConditions(now = Date.now()): ExternalConditionItem[] {
  return [
    {
      id: 'weather',
      icon: CloudSun,
      label: '天气数据',
      updatedAgoLabel: formatUpdatedAgo(now - 12 * 60 * 1000),
    },
    {
      id: 'road_status',
      icon: Route,
      label: '道路状况',
      updatedAgoLabel: formatUpdatedAgo(now - 8 * 60 * 1000),
    },
    {
      id: 'accommodation_inventory',
      icon: Building2,
      label: '住宿库存',
      updatedAgoLabel: '有变更',
      stale: true,
    },
  ];
}

function formatUpdatedAgo(timestamp: number): string {
  const diffMin = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  return `${diffMin} 分钟前更新`;
}

const SOFT_PREFS_STORAGE_KEY = 'tripnara:constraint-console-soft-prefs';

function readStoredSoftPreferences(tripId: string): StoredSoftPreference[] {
  try {
    const raw = localStorage.getItem(`${SOFT_PREFS_STORAGE_KEY}:${tripId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSoftPreference[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredSoftPreferences(tripId: string, items: SoftPreferenceItem[]): void {
  const payload: StoredSoftPreference[] = items.map((item) => {
    const isCustom = item.id.startsWith('custom_');
    return {
      id: item.id,
      priority: item.priority,
      ...(isCustom ? { customLabel: item.label, isCustom: true } : {}),
    };
  });
  try {
    localStorage.setItem(`${SOFT_PREFS_STORAGE_KEY}:${tripId}`, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

/** 当前行程已启用的软偏好（未添加的不展示） */
export function loadSoftPreferences(tripId: string): SoftPreferenceItem[] {
  let stored = readStoredSoftPreferences(tripId);

  // 迁移：旧版存的是默认四条合并结构，若为空则保持空列表
  if (stored.length === 0) {
    return [];
  }

  const legacyMap: Record<string, string> = {
    aurora_photo: 'aurora_photo',
  };

  stored = stored.map((entry) => {
    const mapped = legacyMap[entry.id];
    if (mapped && mapped !== entry.id) {
      return { ...entry, id: mapped };
    }
    return entry;
  });

  return stored
    .map(resolveStoredSoftPreference)
    .filter((item): item is SoftPreferenceItem => item != null);
}

export function saveSoftPreferences(tripId: string, items: SoftPreferenceItem[]): void {
  writeStoredSoftPreferences(tripId, items);
}

/** 从模板添加软偏好；已存在则返回原列表 */
export function addSoftPreference(
  tripId: string,
  templateId: string,
  priority: SoftPreferencePriority = '中',
): SoftPreferenceItem[] {
  const current = loadSoftPreferences(tripId);
  if (current.some((p) => p.id === templateId)) {
    return current;
  }
  const template = getSoftConstraintTemplate(templateId);
  if (!template) {
    return current;
  }
  const next: SoftPreferenceItem[] = [
    ...current,
    { id: template.id, label: template.label, icon: template.icon, priority },
  ];
  saveSoftPreferences(tripId, next);
  return next;
}

/** 添加自定义软偏好 */
export function addCustomSoftPreference(
  tripId: string,
  label: string,
  priority: SoftPreferencePriority = '中',
): SoftPreferenceItem[] {
  const trimmed = label.trim();
  if (!trimmed) return loadSoftPreferences(tripId);

  const current = loadSoftPreferences(tripId);
  const duplicate = current.find((p) => p.label === trimmed);
  if (duplicate) {
    return current;
  }

  const id = `custom_${Date.now()}`;
  const next: SoftPreferenceItem[] = [
    ...current,
    { id, label: trimmed, icon: Leaf, priority },
  ];
  saveSoftPreferences(tripId, next);
  return next;
}

export function removeSoftPreference(tripId: string, preferenceId: string): SoftPreferenceItem[] {
  const next = loadSoftPreferences(tripId).filter((p) => p.id !== preferenceId);
  saveSoftPreferences(tripId, next);
  return next;
}

export function buildConstraintListEntries(
  summary: PlanningConstraintsSummary | null,
  trip: TripDetail | null | undefined,
  budgetProfile: TripBudgetProfile | null,
  softPrefs: SoftPreferenceItem[],
  options?: { intentMustPlaces?: number[] },
): {
  hardItems: ConstraintListEntry[];
  softItems: ConstraintListEntry[];
  externalItems: ConstraintListEntry[];
  mustGoPlaces: MustGoPlaceSummary[];
  roadRestriction: RoadRestrictionSummary | null;
} {
  const hard = buildHardConstraintItems(summary, trip, budgetProfile);
  const mustGoPlaces = extractMustGoPlaces(trip, options?.intentMustPlaces);
  const hardItems: ConstraintListEntry[] = hard.map((item) => ({
    id: item.id,
    kind: 'hard' as const,
    label: item.label,
    value: item.usageLabel ? `${item.value} · ${item.usageLabel}` : item.value,
    icon: item.icon,
    locked: item.locked,
    cardTone: item.cardTone ?? 'default',
    hasConflict: item.cardTone === 'danger',
  }));

  if (summary || trip) {
    const pendingMustGo = mustGoPlaces.filter((p) => !p.inItinerary).length;
    const mustGoEntry: ConstraintListEntry = {
      id: 'must_go',
      kind: 'hard',
      label: '必去地点',
      value: formatMustGoValueLabel(mustGoPlaces),
      icon: MapPin,
      locked: mustGoPlaces.some((p) => p.inItinerary),
      cardTone:
        mustGoPlaces.length === 0
          ? 'default'
          : pendingMustGo > 0
            ? 'caution'
            : 'default',
      hasConflict: false,
    };
    if (hardItems.length > 0) hardItems.splice(1, 0, mustGoEntry);
    else hardItems.push(mustGoEntry);
  }

  const softItems: ConstraintListEntry[] = softPrefs.map((item) => ({
    id: item.id,
    kind: 'soft' as const,
    label: item.label,
    icon: item.icon,
    sliderValue: SOFT_PRIORITY_TO_SLIDER[item.priority],
    value:
      item.id === 'budget_soft'
        ? budgetProfile?.actuals?.totalEstimated != null && summary?.budget.total != null
          ? `${formatCurrency(budgetProfile.actuals.totalEstimated, summary.budget.currency || 'CNY')} / ≤ ${formatCurrency(summary.budget.total, summary.budget.currency || 'CNY')}`
          : undefined
        : undefined,
  }));

  const externalItems: ConstraintListEntry[] = [];

  return { hardItems, softItems, externalItems, mustGoPlaces, roadRestriction: null };
}

export function isExternalConstraintId(id: string): boolean {
  return (
    [
      'weather',
      'road_status',
      'road_closure',
      'accommodation_inventory',
      'road_restrictions',
      'c_world_feasibility',
    ].includes(id) ||
    id.startsWith('c_world_')
  );
}

export function isApiManagedHardConstraintId(id: string): boolean {
  return id === 'max_segment_distance' || id === 'c_max_segment_distance';
}

function readMaxSegmentDistanceKm(constraint?: TripConstraint | null): {
  maxKm: number;
  warnKm?: number;
} {
  if (!constraint) return { maxKm: 250 };
  const raw = constraint.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return { maxKm: raw };
  if (raw && typeof raw === 'object') {
    const v = raw as Record<string, unknown>;
    const max =
      typeof v.maxSegmentDistanceKm === 'number'
        ? v.maxSegmentDistanceKm
        : typeof v.value === 'number'
          ? v.value
          : undefined;
    const warn =
      typeof v.warnSegmentDistanceKm === 'number' ? v.warnSegmentDistanceKm : undefined;
    if (max != null) return { maxKm: max, warnKm: warn };
  }
  return { maxKm: 250 };
}

export function isSoftConstraintId(id: string): boolean {
  return (
    isSoftConstraintTemplateId(id) ||
    id.startsWith('custom_') ||
    id.startsWith('c_custom_') ||
    id.startsWith('c_wish_')
  );
}

/** 系统/目录预置约束：名称与侧栏、API 展示对齐，编辑弹窗内不可改名 */
export function hasFixedConstraintName(id: string): boolean {
  if (getHardConstraintTemplate(id) || getSoftConstraintTemplate(id)) return true;
  if (id === 'max_segment_distance' || id === 'c_max_segment_distance') return true;
  if (
    id.startsWith('custom_') ||
    id.startsWith('c_custom_') ||
    id.startsWith('c_wish_')
  ) {
    return true;
  }
  return false;
}

const HARD_EDIT_KEY_MAP: Record<string, ConstraintPendingKey | 'accommodation' | 'daily_drive'> = {
  time_range: 'time_range',
  budget: 'budget',
  travelers: 'travelers',
  daily_drive: 'daily_drive',
  transport: 'transport',
  accommodation: 'accommodation',
};

export function resolveHardConstraintEditKey(
  id: string,
): ConstraintPendingKey | 'accommodation' | 'daily_drive' | null {
  return HARD_EDIT_KEY_MAP[id] ?? null;
}

/** 摘要面板 / 约束控制台编辑：统一走通用编辑弹窗 */
export function resolveConstraintSummaryEdit(id: string): { mode: 'dialog'; id: string } {
  return { mode: 'dialog', id };
}

function readAccommodationStars(trip: TripDetail | null | undefined): number {
  const meta = trip?.metadata as Record<string, unknown> | undefined;
  const stars = meta?.accommodationStandard ?? meta?.accommodation_standard;
  if (typeof stars === 'number') return stars;
  if (typeof stars === 'string') {
    const n = parseInt(stars, 10);
    if (!Number.isNaN(n)) return n;
  }
  return 3;
}

export function buildEditorDraftFromEntry(
  entryId: string,
  summary: PlanningConstraintsSummary | null,
  trip: TripDetail | null | undefined,
  activeSoftPrefs: SoftPreferenceItem[] = [],
  options?: { intentMustPlaces?: number[]; apiConstraint?: TripConstraint | null },
): ConstraintEditorDraft {
  const base = { ...DEFAULT_DAILY_DRIVE_DRAFT, id: entryId };

  switch (entryId) {
    case 'time_range': {
      const dayCount = summary?.timeRange.dayCount || trip?.TripDay?.length || 0;
      const startDate = trip?.startDate
        ? format(new Date(trip.startDate), 'yyyy-MM-dd')
        : undefined;
      const endDate = trip?.endDate ? format(new Date(trip.endDate), 'yyyy-MM-dd') : undefined;
      return {
        ...base,
        id: entryId,
        name: '总行程时长',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: dayCount || 5,
        targetUnit: 'day',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 9,
        locked: true,
        startDate,
        endDate,
      };
    }
    case 'budget': {
      const total = summary?.budget.total ?? 18000;
      const currency = summary?.budget.currency || 'CNY';
      return {
        ...base,
        id: entryId,
        name: '预算上限（总）',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: total,
        targetUnit: 'currency',
        toleranceMode: 'allow_over',
        toleranceMinutes: 0,
        priority: 7,
        locked: true,
        currency,
      };
    }
    case 'travelers': {
      const fromApi =
        options?.apiConstraint?.id === TRIP_CONSTRAINT_LEGACY_IDS.TRAVELERS
          ? options.apiConstraint
          : null;
      let count = summary?.travelers.count ?? 0;
      if (fromApi?.value != null) {
        if (typeof fromApi.value === 'number') {
          count = fromApi.value;
        } else if (typeof fromApi.value === 'object') {
          const v = fromApi.value as Record<string, unknown>;
          if (typeof v.count === 'number') count = v.count;
          else if (typeof v.memberCount === 'number') count = v.memberCount;
        }
      }
      if (count <= 0 && trip) {
        count = resolveTravelerCount(trip);
      }
      const hardTemplate = getHardConstraintTemplate('travelers');
      return {
        ...base,
        id: entryId,
        name: hardTemplate?.label ?? '出行人数',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: Math.max(1, count || 1),
        targetUnit: 'day',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: fromApi?.priority ?? 8,
        locked: fromApi?.locked ?? false,
        enabled: fromApi?.enabled !== false,
      };
    }
    case 'transport': {
      const fromApi =
        options?.apiConstraint?.id === TRIP_CONSTRAINT_LEGACY_IDS.TRANSPORT_MODE
          ? options.apiConstraint
          : null;
      let mode: ConstraintTransportValue | '' = resolveConstraintTransportValue(trip);
      if (!mode && summary?.transport.travelMode) {
        const raw = summary.transport.travelMode.toUpperCase();
        if (raw === 'DRIVING' || raw === 'PUBLIC_TRANSIT' || raw === 'MIXED') {
          mode = raw as ConstraintTransportValue;
        } else if (raw === 'WALKING') {
          mode = 'WALKING';
        }
      }
      if (!mode && fromApi?.value != null) {
        if (typeof fromApi.value === 'string') {
          mode = fromApi.value as ConstraintTransportValue;
        } else if (typeof fromApi.value === 'object') {
          const v = fromApi.value as Record<string, unknown>;
          if (typeof v.travelMode === 'string') {
            mode = v.travelMode as ConstraintTransportValue;
          }
        }
      }
      const hardTemplate = getHardConstraintTemplate('transport');
      return {
        ...base,
        id: entryId,
        name: hardTemplate?.label ?? '基础交通方式',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: 0,
        targetUnit: 'day',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: fromApi?.priority ?? 8,
        locked: fromApi?.locked ?? false,
        enabled: fromApi?.enabled !== false,
        transportMode: mode,
        reason: '',
      };
    }
    case 'daily_drive': {
      const hours = readDailyDriveLimitHours(trip);
      return {
        ...DEFAULT_DAILY_DRIVE_DRAFT,
        id: entryId,
        targetValue: hours,
      };
    }
    case 'max_segment_distance': {
      const fromApi =
        options?.apiConstraint?.id === 'c_max_segment_distance'
          ? options.apiConstraint
          : null;
      const { maxKm, warnKm } = readMaxSegmentDistanceKm(fromApi);
      return {
        ...base,
        id: 'max_segment_distance',
        name: fromApi?.name ?? '单段最长行驶距离',
        enabled: fromApi?.enabled !== false,
        type: 'HARD',
        scope: 'TRIP',
        targetValue: maxKm,
        targetUnit: 'km',
        toleranceMode: 'none',
        toleranceMinutes: warnKm ?? 0,
        priority: fromApi?.priority ?? 8,
        locked: fromApi?.locked ?? false,
        reason:
          warnKm != null
            ? `预警阈值约 ${warnKm} km（由后端按国家规则推算）。超长距离冲突见中间栏「规划冲突」。`
            : '相邻景点间单次驾驶距离上限；修改后将重新检测 road_class 超长距离冲突。',
      };
    }
    case 'accommodation':
      return {
        ...base,
        id: entryId,
        name: '住宿标准',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: readAccommodationStars(trip),
        targetUnit: 'star',
        toleranceMode: 'none',
        toleranceMinutes: 0,
        priority: 6,
        locked: true,
      };
    case 'must_go': {
      const places = extractMustGoPlaces(trip, options?.intentMustPlaces);
      const locked = places.filter((p) => p.inItinerary).length;
      return {
        ...base,
        id: entryId,
        name: '必去地点',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: places.length || locked,
        targetUnit: 'day',
        priority: 10,
        locked: locked > 0,
        reason:
          places.length > 0
            ? places.map((p) => `${p.name}${p.inItinerary ? '（已入行程）' : '（待安排）'}`).join('、')
            : '尚未设置必去地点，可在「意图与约束」中添加。',
      };
    }
    case 'road_restrictions': {
      const road = buildRoadRestrictionSummary(trip);
      return {
        ...base,
        id: entryId,
        name: '道路开放限制',
        type: 'HARD',
        scope: 'TRIP',
        targetValue: road.fRoads.length,
        targetUnit: 'day',
        priority: 8,
        locked: !road.hasSeasonalRisk,
        reason:
          road.fRoads.length > 0
            ? `行程涉及：${road.fRoads.join('、')}。F 路开放受季节与天气影响，系统将自动监测。`
            : '当前行程未识别 F 路依赖，仍会自动监测道路封路与绕行信息。',
      };
    }
    default: {
      const activeSoft = resolveSoftPreferenceById(entryId, activeSoftPrefs);
      if (activeSoft) {
        return {
          ...base,
          id: entryId,
          name: activeSoft.label,
          type: 'SOFT',
          scope: 'TRIP',
          targetValue: SOFT_PRIORITY_TO_SLIDER[activeSoft.priority],
          targetUnit: 'day',
          priority:
            activeSoft.priority === '高' ? 8 : activeSoft.priority === '中' ? 5 : 3,
          locked: false,
        };
      }
      const softFromCatalog = getSoftConstraintTemplate(entryId);
      if (softFromCatalog) {
        const priority: SoftPreferencePriority = '中';
        return {
          ...base,
          id: entryId,
          name: softFromCatalog.label,
          type: 'SOFT',
          scope: 'TRIP',
          targetValue: SOFT_PRIORITY_TO_SLIDER[priority],
          targetUnit: 'day',
          priority: 5,
          locked: false,
        };
      }
      const hardFromCatalog = getHardConstraintTemplate(entryId);
      if (hardFromCatalog) {
        return {
          ...base,
          id: entryId,
          name: hardFromCatalog.label,
          type: 'HARD',
          scope: 'TRIP',
          targetValue: 0,
          targetUnit: 'day',
          toleranceMode: 'none',
          toleranceMinutes: 0,
          priority: 7,
          locked: false,
        };
      }
      return { ...DEFAULT_DAILY_DRIVE_DRAFT, id: entryId, name: entryId, type: 'SOFT' };
    }
  }
}

export function normalizeFeasibilityScore(value: unknown, fallback = 84): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value > 0 && value <= 1 ? value * 100 : value);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.overallAverageScore === 'number') {
      return normalizeFeasibilityScore(record.overallAverageScore, fallback);
    }
    if (typeof record.score === 'number') {
      return normalizeFeasibilityScore(record.score, fallback);
    }
  }
  return fallback;
}

/** @deprecated 仅 dev mock（VITE_USE_MOCK_CONSTRAINT_PREVIEW）使用；生产预览走 BFF preview-impact */
export function buildConstraintImpactPreview(
  draft: ConstraintEditorDraft,
  options: {
    conflicts: PlanningConflictDto[];
    feasibilityScore?: number | null;
    budgetProfile: TripBudgetProfile | null;
    currency?: string;
  },
): ConstraintImpactPreview {
  const scoreBefore = normalizeFeasibilityScore(options.feasibilityScore, 84);
  const transportConflicts = options.conflicts.filter(
    (c) => c.category === 'transport' || c.category === 'schedule',
  );
  const affectedDaySet = new Set<number>();
  for (const c of transportConflicts) {
    for (const d of c.affectedDays ?? []) affectedDaySet.add(d);
  }
  if (affectedDaySet.size === 0 && draft.id === 'daily_drive') {
    affectedDaySet.add(2);
    affectedDaySet.add(3);
    affectedDaySet.add(4);
  }

  const affectedDays = [...affectedDaySet]
    .sort((a, b) => a - b)
    .map((dayNumber, i) => ({
      dayNumber,
      tone: (i === 0 ? 'major' : 'minor') as 'major' | 'minor' | 'none',
    }));

  const majorCount = affectedDays.filter((d) => d.tone === 'major').length;
  const minorCount = affectedDays.filter((d) => d.tone === 'minor').length;
  const scoreDelta = draft.type === 'HARD' && draft.locked ? -4 : -2;
  const scoreAfter = Math.max(0, Math.min(100, scoreBefore + scoreDelta));
  const currency = options.currency || 'CNY';

  const totalDelta =
    draft.id === 'daily_drive' ? -220 : draft.id === 'budget' ? 0 : -120;
  const transportDelta = draft.id === 'daily_drive' ? -160 : -80;
  const accommodationDelta = draft.id === 'daily_drive' ? -60 : -40;

  const toleranceLabel =
    draft.toleranceMode === 'allow_over' && draft.toleranceMinutes > 0
      ? `${draft.toleranceMinutes} 分钟`
      : '不允许超出';

  const diffBullets: string[] = [];
  if (draft.id === 'budget') {
    diffBullets.push(
      `总预算上限调整为 ${formatCurrency(draft.targetValue, options.currency || draft.currency || 'CNY')}`,
      '超预算项目将标记为需调整或降级',
    );
  } else if (draft.id === 'time_range') {
    const days = draft.targetValue;
    diffBullets.push(
      `行程调整为 ${days} 天${draft.startDate && draft.endDate ? `（${draft.startDate} → ${draft.endDate}）` : ''}`,
      '部分日程可能需要合并或拆分',
    );
  } else if (draft.id === 'daily_drive') {
    diffBullets.push(
      `第 2 天驾驶时间从 5 小时 20 分降至 ≤ ${draft.targetValue} 小时 ${draft.toleranceMinutes > 0 ? draft.toleranceMinutes : 0} 分`,
      '南岸段改走 1 号公路，避开 F 路封闭段',
      '第 2 天住宿由 Vik 调整为 Kirkjubæjarklaustur',
    );
  } else {
    diffBullets.push(`「${draft.name}」目标值调整为 ${draft.targetValue}`, `容差：${toleranceLabel}`);
  }

  const recommendation =
    draft.locked && draft.type === 'HARD'
      ? `此约束将显著改善行程舒适度与安全性。建议锁定「${draft.name}」并保存。`
      : `调整「${draft.name}」后方案可行度 ${scoreAfter >= scoreBefore ? '略有提升' : '可能下降'}，可先预览再决定是否保存。`;

  return {
    affectedDays,
    adjustmentSummary: `${majorCount} 处主要调整，${minorCount} 处次要调整`,
    planLabel: '最优方案 v3.2',
    planNeedsAdjust: scoreAfter < scoreBefore || majorCount > 0,
    feasibilityBefore: scoreBefore,
    feasibilityAfter: scoreAfter,
    budgetRows: [
      { label: '总预算', delta: totalDelta, currency },
      { label: '交通', delta: transportDelta, currency },
      { label: '住宿', delta: accommodationDelta, currency },
    ],
    diffBullets,
    recommendation,
  };
}
