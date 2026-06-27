import type { IntentTravelMode } from '@/types/trip';
import type { TripDetail } from '@/types/trip';
import type { BudgetGateStatus, TripBudgetProfile } from '@/types/trip-budget';
import type {
  ConstraintBudget,
  ConstraintBudgetStatus,
  ConstraintFieldStatus,
  ConstraintPendingItem,
  ConstraintsSummaryResponse,
  ConstraintTimeRange,
  ConstraintTimeRangeStatus,
  ConstraintTransport,
  ConstraintTravelers,
  PlanningConstraintsSummary,
  TripConstraintsMetadata,
} from '@/types/planning-constraints';

const TRANSPORT_LABEL: Record<string, string> = {
  DRIVING: '自驾',
  PUBLIC_TRANSIT: '公共交通',
  MIXED: '混合',
  WALKING: '步行',
  TRANSIT: '公交',
  TRAIN: '铁路',
  FLIGHT: '航班',
  FERRY: '渡轮',
  BICYCLE: '骑行',
  TAXI: '出租车',
  driving: '自驾',
  walking: '步行',
};

export function formatConstraintTravelMode(mode: string | null | undefined): string {
  if (!mode) return '未设置';
  return TRANSPORT_LABEL[mode] ?? mode;
}

export function readTripConstraintsMetadata(
  trip?: TripDetail | null,
): TripConstraintsMetadata {
  const raw = trip?.metadata as TripConstraintsMetadata | undefined;
  return {
    constraintsVersion: typeof raw?.constraintsVersion === 'number' ? raw.constraintsVersion : 0,
    constraintsConfirmedAt:
      typeof raw?.constraintsConfirmedAt === 'string' ? raw.constraintsConfirmedAt : undefined,
    constraintsConfirmedBy:
      typeof raw?.constraintsConfirmedBy === 'string' ? raw.constraintsConfirmedBy : undefined,
    constraintsConfirmedVersion:
      typeof raw?.constraintsConfirmedVersion === 'number'
        ? raw.constraintsConfirmedVersion
        : raw?.constraintsConfirmedVersion === null
          ? null
          : undefined,
  };
}

export function resolveTravelerCount(trip?: TripDetail | null): number {
  const pacing = trip?.pacingConfig?.travelers?.length ?? 0;
  if (pacing > 0) return pacing;
  const metaTravelers = (trip?.metadata as { travelers?: unknown[] } | undefined)?.travelers;
  if (Array.isArray(metaTravelers) && metaTravelers.length > 0) return metaTravelers.length;
  const budgetTravelers = trip?.budgetConfig?.travelers?.length ?? 0;
  if (budgetTravelers > 0) return budgetTravelers;
  return 0;
}

/** 约束卡片 · 出行人数展示（memberCount 为协作者数，勿称「团队」以免与 Team Tab 混淆） */
export function formatConstraintTravelersLabel(travelers: ConstraintTravelers): string {
  const { count, memberCount, status } = travelers;
  if (count <= 0) return '未设置';
  if (status === 'misaligned' && memberCount > 0) {
    return `${count} 人 · 协作者 ${memberCount} 人（需对齐）`;
  }
  return `${count} 人`;
}

function resolveTimeRange(trip?: TripDetail | null): ConstraintTimeRange {
  const startDate = trip?.startDate ?? null;
  const endDate = trip?.endDate ?? null;
  const dayCount = trip?.TripDay?.length ?? 0;
  const status: ConstraintFieldStatus =
    startDate && endDate ? 'confirmed' : 'missing';
  return { startDate, endDate, dayCount, status };
}

function resolveBudgetConfigTotal(trip?: TripDetail | null): number | null {
  const cfg = trip?.budgetConfig as { total?: number; totalBudget?: number } | undefined;
  if (cfg?.total != null && cfg.total > 0) return cfg.total;
  if (cfg?.totalBudget != null && cfg.totalBudget > 0) return cfg.totalBudget;
  if (trip?.totalBudget != null && trip.totalBudget > 0) return trip.totalBudget;
  return null;
}

function resolveBudget(
  trip?: TripDetail | null,
  profile?: TripBudgetProfile | null,
): ConstraintBudget {
  const currency =
    profile?.intent?.currency ?? trip?.budgetConfig?.currency ?? 'CNY';
  const total =
    profile?.intent?.total ??
    resolveBudgetConfigTotal(trip);
  const gateStatus = (profile?.gateStatus?.verdict ?? null) as ConstraintBudget['gateStatus'];

  let status: ConstraintFieldStatus = 'confirmed';
  if (total == null || total <= 0) {
    status = 'missing';
  } else if (gateStatus === 'NEED_CONFIRM') {
    status = 'need_confirm';
  } else if (gateStatus === 'NEED_ADJUST' || gateStatus === 'REJECT') {
    status = 'need_confirm';
  }

  return { total, currency, gateStatus, status };
}

function resolveTravelers(
  trip?: TripDetail | null,
  memberCount = 0,
): ConstraintTravelers {
  const count = resolveTravelerCount(trip);
  let status: ConstraintFieldStatus = 'confirmed';
  if (count <= 0) {
    status = 'missing';
  } else if (memberCount > 0 && count !== memberCount) {
    status = 'misaligned';
  }
  return { count, memberCount, status };
}

/** intent travelMode 与 travel-info segment.travelMode 粗对齐 */
export function isTransportModeAligned(
  intentMode: IntentTravelMode | string | null | undefined,
  segmentMode: string | null | undefined,
): boolean {
  if (!intentMode) return segmentMode == null;
  if (!segmentMode) return true;

  const intent = String(intentMode).toUpperCase();
  const segment = String(segmentMode).toUpperCase();

  if (intent === 'DRIVING') {
    return segment === 'DRIVING' || segment === 'TAXI' || segment === 'CAR';
  }
  if (intent === 'PUBLIC_TRANSIT') {
    return (
      segment === 'TRANSIT' ||
      segment === 'TRAIN' ||
      segment === 'FLIGHT' ||
      segment === 'FERRY' ||
      segment === 'WALKING'
    );
  }
  if (intent === 'MIXED') return true;
  return intent === segment;
}

/** 与 BFF 一致：pacingConfig.transport（如 car）→ travelMode */
export function inferTravelModeFromTransportHint(
  transportHint: string | null | undefined,
): string | null {
  if (!transportHint) return null;
  const hint = transportHint.trim().toLowerCase();
  if (hint === 'car' || hint === 'driving' || hint === 'drive') return 'DRIVING';
  if (hint === 'walk' || hint === 'walking') return 'WALKING';
  if (hint === 'transit' || hint === 'public' || hint === 'public_transit') {
    return 'PUBLIC_TRANSIT';
  }
  if (hint === 'mixed') return 'MIXED';
  return null;
}

function resolveTransport(
  trip?: TripDetail | null,
  intentTravelMode?: IntentTravelMode | null,
  sampleSegmentTravelMode?: string | null,
): ConstraintTransport {
  const transportHint =
    (trip?.pacingConfig as { transport?: string } | undefined)?.transport ??
    (trip?.metadata as { transport?: string } | undefined)?.transport ??
    null;
  const travelMode =
    intentTravelMode ??
    trip?.pacingConfig?.travelMode ??
    inferTravelModeFromTransportHint(transportHint) ??
    null;

  let status: ConstraintFieldStatus = 'confirmed';
  if (!travelMode) {
    status = 'missing';
  } else if (
    sampleSegmentTravelMode &&
    !isTransportModeAligned(travelMode, sampleSegmentTravelMode)
  ) {
    status = 'misaligned';
  }

  return {
    travelMode,
    transportHint,
    sampleTravelMode: sampleSegmentTravelMode ?? null,
    status,
  };
}

function buildPendingItems(input: {
  timeRange: ConstraintTimeRange;
  budget: ConstraintBudget;
  travelers: ConstraintTravelers;
  transport: ConstraintTransport;
}): ConstraintPendingItem[] {
  const items: ConstraintPendingItem[] = [];

  if (input.timeRange.status === 'missing') {
    items.push({
      key: 'time_range',
      status: 'missing',
      label: '补全出发与返程日期',
    });
  }

  if (input.budget.status === 'missing') {
    items.push({
      key: 'budget',
      status: 'missing',
      label: '设置总预算',
    });
  } else if (input.budget.status === 'need_confirm') {
    items.push({
      key: 'budget',
      status: 'need_confirm',
      label: '确认总预算',
    });
  }

  if (input.travelers.status === 'missing') {
    items.push({
      key: 'travelers',
      status: 'missing',
      label: '填写出行人数',
    });
  } else if (input.travelers.status === 'misaligned') {
    items.push({
      key: 'travelers',
      status: 'misaligned',
      label: '人数与团队成员不一致',
    });
  }

  if (input.transport.status === 'missing') {
    items.push({
      key: 'transport',
      status: 'missing',
      label: '选择基础交通方式',
    });
  } else if (input.transport.status === 'misaligned') {
    items.push({
      key: 'transport',
      status: 'misaligned',
      label: '交通方式与时间轴不一致',
    });
  }

  return items;
}

export function buildPlanningConstraintsSummary(input: {
  trip?: TripDetail | null;
  budgetProfile?: TripBudgetProfile | null;
  collaboratorCount?: number;
  intentTravelMode?: IntentTravelMode | null;
  sampleSegmentTravelMode?: string | null;
}): PlanningConstraintsSummary {
  const meta = readTripConstraintsMetadata(input.trip);
  const timeRange = resolveTimeRange(input.trip);
  const budget = resolveBudget(input.trip, input.budgetProfile);
  const travelers = resolveTravelers(input.trip, input.collaboratorCount ?? 0);
  const transport = resolveTransport(
    input.trip,
    input.intentTravelMode,
    input.sampleSegmentTravelMode,
  );
  const pendingItems = buildPendingItems({ timeRange, budget, travelers, transport });
  const pendingCount = pendingItems.length;
  const allReady = pendingCount === 0;
  const confirmedVersion = meta.constraintsVersion ?? 0;
  const confirmedSnapshot =
    meta.constraintsConfirmedVersion ?? confirmedVersion;
  const isUserConfirmed = Boolean(
    meta.constraintsConfirmedAt &&
      allReady &&
      confirmedSnapshot === confirmedVersion,
  );
  const needsReconfirm = Boolean(
    meta.constraintsConfirmedAt && allReady && !isUserConfirmed,
  );

  return {
    constraintsVersion: confirmedVersion,
    confirmedAt: meta.constraintsConfirmedAt ?? null,
    confirmedBy: meta.constraintsConfirmedBy ?? null,
    isUserConfirmed,
    needsReconfirm,
    allReady,
    pendingCount,
    timeRange,
    budget,
    travelers,
    transport,
    pendingItems,
  };
}

export function formatConstraintDateRange(
  startDate: string | null,
  endDate: string | null,
  dayCount: number,
): string {
  if (!startDate || !endDate) return '日期待补全';
  try {
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} – ${fmt(endDate)}（${dayCount || '—'} 天）`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
}

export function mergeConstraintsMetadataPatch(
  trip: TripDetail,
  patch: TripConstraintsMetadata,
): Record<string, unknown> {
  return {
    ...(trip.metadata ?? {}),
    ...patch,
  };
}

/** 约束变更后清除用户确认态并递增版本（P1-B/C） */
export function nextConstraintsMetadataAfterChange(
  trip: TripDetail,
): TripConstraintsMetadata {
  const current = readTripConstraintsMetadata(trip);
  return {
    constraintsVersion: (current.constraintsVersion ?? 0) + 1,
    constraintsConfirmedAt: undefined,
    constraintsConfirmedBy: undefined,
  };
}

export function constraintsMetadataForConfirm(
  trip: TripDetail,
  userId: string,
): TripConstraintsMetadata {
  const current = readTripConstraintsMetadata(trip);
  const version = current.constraintsVersion ?? 0;
  return {
    constraintsVersion: version,
    constraintsConfirmedVersion: version,
    constraintsConfirmedAt: new Date().toISOString(),
    constraintsConfirmedBy: userId,
  };
}

export function budgetGateFromProfile(profile?: TripBudgetProfile | null): BudgetGateStatus | null {
  return profile?.gateStatus ?? null;
}

/** BFF 偶发 `aligned` 等扩展态 → FE 四态 */
export function normalizeConstraintFieldStatus(
  status: string | null | undefined,
): ConstraintFieldStatus {
  switch (status) {
    case 'confirmed':
    case 'need_confirm':
    case 'misaligned':
    case 'missing':
      return status;
    case 'aligned':
      return 'confirmed';
    default:
      return 'missing';
  }
}

export function normalizeConstraintTimeRangeStatus(
  status: string | null | undefined,
): ConstraintTimeRangeStatus {
  if (status === 'confirmed') return 'confirmed';
  return 'missing';
}

export function normalizeConstraintBudgetStatus(
  status: string | null | undefined,
): ConstraintBudgetStatus {
  switch (status) {
    case 'confirmed':
    case 'need_confirm':
    case 'missing':
      return status;
    case 'aligned':
      return 'confirmed';
    default:
      return 'missing';
  }
}

/** 解析 BFF pendingItems.deepLink → 约束编辑 key 或 Tab */
export function parseConstraintDeepLink(deepLink: string): {
  key?: ConstraintPendingKey;
  editTab?: string;
} {
  const params = new URLSearchParams(deepLink.includes('=') ? deepLink : `tab=${deepLink}`);
  const tab = params.get('tab');
  if (params.get('openIntent') === '1' || params.get('openIntent') === 'true') {
    return { key: 'transport' };
  }
  if (params.get('openBudget') === '1' || params.get('openBudget') === 'true') {
    return { key: 'budget' };
  }
  if (params.get('openEditTrip') === '1' || params.get('openEditTrip') === 'true') {
    return { key: 'time_range' };
  }
  if (tab === 'budget') return { key: 'budget' };
  if (tab === 'team') return { key: 'travelers' };
  if (tab === 'transport' || tab === 'intent') return { key: 'transport' };
  if (tab) return { editTab: tab };
  return {};
}

export function mapConstraintsSummaryFromBff(
  dto: ConstraintsSummaryResponse,
): PlanningConstraintsSummary {
  const needsReconfirm = Boolean(
    dto.confirmedAt &&
      dto.allReady &&
      (dto.isVersionConfirmed === false || !dto.isUserConfirmed),
  );

  return {
    constraintsVersion: dto.constraintsVersion,
    confirmedAt: dto.confirmedAt,
    confirmedBy: dto.confirmedBy,
    isUserConfirmed: dto.isUserConfirmed,
    needsReconfirm,
    allReady: dto.allReady,
    pendingCount: dto.pendingCount,
    timeRange: {
      ...dto.timeRange,
      status: normalizeConstraintTimeRangeStatus(dto.timeRange.status),
    },
    budget: {
      total: dto.budget.total,
      currency: dto.budget.currency ?? 'CNY',
      gateStatus: (dto.budget.gateStatus as ConstraintBudget['gateStatus']) ?? null,
      status: normalizeConstraintBudgetStatus(dto.budget.status),
    },
    travelers: {
      count: dto.travelers.count,
      memberCount: dto.travelers.memberCount,
      status: normalizeConstraintFieldStatus(dto.travelers.status),
    },
    transport: {
      travelMode: dto.transport.travelMode,
      transportHint: dto.transport.transportHint,
      sampleTravelMode:
        dto.transport.sampleTravelMode ??
        dto.transport.sampleSegment?.travelMode ??
        null,
      status: normalizeConstraintFieldStatus(dto.transport.status),
    },
    pendingItems: (dto.pendingItems ?? []).map((item) => ({
      ...item,
      key: item.key as ConstraintPendingItem['key'],
      status: normalizeConstraintFieldStatus(item.status) as ConstraintPendingItem['status'],
      ...parseConstraintDeepLink(item.deepLink ?? ''),
    })),
  };
}

/**
 * BFF 摘要可能与本地真源短暂不一致（如预算已写入 profile 但 summary 仍 missing）。
 * 用 M1 本地拼装结果补全 BFF 的 missing 字段，并重建 pendingItems。
 */
export function enrichConstraintsSummaryFromLocal(
  remote: PlanningConstraintsSummary,
  local: PlanningConstraintsSummary,
): PlanningConstraintsSummary {
  const pick = <T extends { status: ConstraintFieldStatus }>(bff: T, m1: T): T =>
    bff.status === 'missing' && m1.status !== 'missing' ? m1 : bff;

  const timeRange = pick(remote.timeRange, local.timeRange);
  let budget = pick(remote.budget, local.budget);
  if (
    (budget.total == null || budget.total <= 0) &&
    local.budget.total != null &&
    local.budget.total > 0
  ) {
    budget = {
      ...local.budget,
      gateStatus: remote.budget.gateStatus ?? local.budget.gateStatus,
      status:
        remote.budget.status !== 'missing' && remote.budget.status !== 'confirmed'
          ? remote.budget.status
          : local.budget.status,
    };
  }
  const travelers = pick(remote.travelers, local.travelers);
  const transport = pick(remote.transport, local.transport);

  const pendingItems = buildPendingItems({ timeRange, budget, travelers, transport });
  const pendingCount = pendingItems.length;
  const allReady = pendingCount === 0;

  return {
    ...remote,
    timeRange,
    budget,
    travelers,
    transport,
    pendingItems,
    pendingCount,
    allReady,
    needsReconfirm: Boolean(
      remote.confirmedAt && allReady && (remote.needsReconfirm || !remote.isUserConfirmed),
    ),
  };
}
