/** BFF `planning-conflicts.daySplits[]` — 中栏并行分流时间线 */

export type PlanningDaySplitSegmentKind = 'shared' | 'branch' | 'rejoin';
export type PlanningDaySplitIntensity = 'high' | 'medium' | 'low';
export type PlanningDaySplitRiskLevel = 'low' | 'medium' | 'high';
export type PlanningDaySplitVariant = 'blue' | 'orange' | 'purple';

export interface PlanningDaySplitMemberDto {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface PlanningDaySplitSegmentDto {
  id: string;
  kind: PlanningDaySplitSegmentKind;
  startTime: string;
  endTime?: string;
  title: string;
  subtitle?: string;
  /** 关联真实 ItineraryItem（BFF 从行程投影 POI 时段） */
  itineraryItemId?: string;
  placeId?: string;
  placeName?: string;
  intensity?: PlanningDaySplitIntensity;
  riskLevel?: PlanningDaySplitRiskLevel;
  costPerPerson?: string;
  highlights?: string[];
}

export interface PlanningDaySplitBranchDto {
  id: string;
  groupId: string;
  groupLabel: string;
  memberCount: number;
  /** BFF 投影：本组成员（优先展示） */
  members?: PlanningDaySplitMemberDto[];
  /** 可选：仅 id 时由前端用协作者表解析 displayName */
  memberIds?: string[];
  variant?: PlanningDaySplitVariant;
  segments: PlanningDaySplitSegmentDto[];
}

export interface PlanningDaySplitStatsDto {
  splitDuration?: string;
  meetupTime?: string;
  feasibility?: string;
  satisfactionBadge?: string;
  /** BFF 租车→酒店送达（右栏 transport / 中栏可选展示） */
  rentalHotel?: PlanningDaySplitRentalHotelDto;
}

export interface PlanningDaySplitRentalHotelDto {
  distanceKm?: number;
  driveMin?: number;
  dropoffFeasible?: boolean;
  rentalPlaceName?: string;
  hotelPlaceName?: string;
}

/** 分叉锚点：对齐 sharedBefore 末段与并行分支起点（图2 分叉箭头） */
export interface PlanningDaySplitForkDto {
  startTime: string;
  afterSegmentId?: string;
}

export interface PlanningDaySplitDto {
  id: string;
  splitPlanId: string;
  dayIndex: number;
  dayNumber: number;
  title: string;
  dateLabel?: string;
  stats?: PlanningDaySplitStatsDto;
  /** 分叉时刻与 sharedBefore 末段 id */
  fork?: PlanningDaySplitForkDto;
  sharedBefore: PlanningDaySplitSegmentDto[];
  branches: PlanningDaySplitBranchDto[];
  rejoin?: PlanningDaySplitSegmentDto;
  sharedAfter?: PlanningDaySplitSegmentDto[];
}

export function normalizePlanningDaySplits(
  raw: PlanningDaySplitDto[] | null | undefined,
): PlanningDaySplitDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((split) => {
    const dayNumber =
      typeof split.dayNumber === 'number' && split.dayNumber >= 1
        ? split.dayNumber
        : typeof split.dayIndex === 'number' && split.dayIndex >= 0
          ? split.dayIndex + 1
          : 1;
    const dayIndex =
      typeof split.dayIndex === 'number' && split.dayIndex >= 0
        ? split.dayIndex
        : dayNumber - 1;
    const forkRaw = split.fork;
    const fork =
      forkRaw && typeof forkRaw.startTime === 'string' && forkRaw.startTime.length > 0
        ? {
            startTime: forkRaw.startTime,
            afterSegmentId:
              typeof forkRaw.afterSegmentId === 'string' && forkRaw.afterSegmentId.length > 0
                ? forkRaw.afterSegmentId
                : undefined,
          }
        : undefined;

    return {
    ...split,
    dayIndex,
    dayNumber,
    fork,
    sharedBefore: (split.sharedBefore ?? []).map(normalizePlanningDaySplitSegment),
    branches: (split.branches ?? []).map((branch) => ({
      ...branch,
      members: normalizePlanningDaySplitMembers(
        branch.members ?? (branch as { member_list?: unknown }).member_list,
      ),
      memberIds: normalizePlanningDaySplitMemberIds(
        branch.memberIds ?? (branch as { member_ids?: string[] }).member_ids,
      ),
      segments: (branch.segments ?? []).map(normalizePlanningDaySplitSegment),
    })),
    rejoin: split.rejoin ? normalizePlanningDaySplitSegment(split.rejoin) : undefined,
    sharedAfter: (split.sharedAfter ?? []).map(normalizePlanningDaySplitSegment),
    stats: split.stats
      ? {
          ...split.stats,
          rentalHotel: normalizeRentalHotelStats(split.stats.rentalHotel),
        }
      : undefined,
  };
  });
}

function normalizeRentalHotelStats(
  raw: PlanningDaySplitRentalHotelDto | null | undefined,
): PlanningDaySplitRentalHotelDto | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    distanceKm: typeof raw.distanceKm === 'number' ? raw.distanceKm : undefined,
    driveMin: typeof raw.driveMin === 'number' ? raw.driveMin : undefined,
    dropoffFeasible:
      typeof raw.dropoffFeasible === 'boolean' ? raw.dropoffFeasible : undefined,
    rentalPlaceName:
      typeof raw.rentalPlaceName === 'string' && raw.rentalPlaceName.trim()
        ? raw.rentalPlaceName.trim()
        : undefined,
    hotelPlaceName:
      typeof raw.hotelPlaceName === 'string' && raw.hotelPlaceName.trim()
        ? raw.hotelPlaceName.trim()
        : undefined,
  };
}

function normalizePlanningDaySplitSegment(
  segment: PlanningDaySplitSegmentDto,
): PlanningDaySplitSegmentDto {
  return {
    ...segment,
    kind: segment.kind ?? 'branch',
    highlights: segment.highlights?.filter(Boolean) ?? undefined,
  };
}

export function normalizePlanningDaySplitSegmentDto(
  segment: Partial<PlanningDaySplitSegmentDto> & Pick<PlanningDaySplitSegmentDto, 'id' | 'title' | 'startTime'>,
): PlanningDaySplitSegmentDto {
  return normalizePlanningDaySplitSegment({
    kind: 'branch',
    ...segment,
  } as PlanningDaySplitSegmentDto);
}

export function normalizePlanningDaySplitMembersDto(raw: unknown): PlanningDaySplitMemberDto[] | undefined {
  return normalizePlanningDaySplitMembers(raw);
}

function normalizePlanningDaySplitMemberIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return ids.length > 0 ? ids : undefined;
}

function normalizePlanningDaySplitMembers(raw: unknown): PlanningDaySplitMemberDto[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const members = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = [record.id, record.userId, record.user_id].find(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );
      const displayName = [record.displayName, record.display_name, record.name, record.label].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      if (!displayName && !id) return null;
      return {
        id: id ?? displayName!.trim(),
        displayName: displayName?.trim() ?? id!,
        avatarUrl:
          typeof record.avatarUrl === 'string'
            ? record.avatarUrl
            : typeof record.avatar_url === 'string'
              ? record.avatar_url
              : undefined,
      } satisfies PlanningDaySplitMemberDto;
    })
    .filter((member): member is PlanningDaySplitMemberDto => member != null);
  return members.length > 0 ? members : undefined;
}

export function resolveDaySplitIndex(split: PlanningDaySplitDto): number {
  if (typeof split.dayIndex === 'number' && split.dayIndex >= 0) return split.dayIndex;
  return Math.max(0, (split.dayNumber ?? 1) - 1);
}

/** 按 0-based dayIndex 或 1-based dayNumber 查找当日 split */
export function findDaySplitForSelectedDay(
  daySplits: PlanningDaySplitDto[],
  selectedDayIndex: number,
): PlanningDaySplitDto | undefined {
  const dayNumber = selectedDayIndex + 1;
  return daySplits.find(
    (split) => split.dayIndex === selectedDayIndex || split.dayNumber === dayNumber,
  );
}

/** @deprecated 使用 findDaySplitForSelectedDay */
export function findDaySplitForIndex(
  daySplits: PlanningDaySplitDto[],
  dayIndex: number,
): PlanningDaySplitDto | undefined {
  return findDaySplitForSelectedDay(daySplits, dayIndex);
}

/** sharedBefore → fork → branches 并行 → rejoin → sharedAfter */
export function isForkDaySplit(
  split: PlanningDaySplitDto | null | undefined,
): split is PlanningDaySplitDto {
  return Boolean(split && (split.branches?.length ?? 0) >= 2);
}
