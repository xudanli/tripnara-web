import { sortItineraryItemsForDisplay } from '@/lib/itinerary-item-sort';
import { resolveWorkbenchTimelineItemTitle } from '@/components/plan-studio/workbench/workbench-format.util';
import { parseGovernanceModeFromContractRules } from '@/lib/trip-constraints-contract.util';
import { GOVERNANCE_MODE_META } from '@/lib/team-tab-model';
import type {
  TripConstraintsContract,
  TripConstraintsTeamGovernance,
} from '@/types/trip-constraints';
import type { ItineraryItemDetail, TripDetail, Traveler } from '@/types/trip';

export interface ConstraintMemberOption {
  id: string;
  label: string;
  role?: string;
}

export interface ConstraintRouteSegmentOption {
  segmentId: string;
  label: string;
  dayNumber: number;
  fromItemId: string;
  toItemId: string;
}

const PRIMARY_DRIVER_ROLE_RE = /driver|驾驶|主驾|司机/i;

function travelerTypeLabel(type: Traveler['type']): string {
  switch (type) {
    case 'ADULT':
      return '成人';
    case 'ELDERLY':
      return '长者';
    case 'CHILD':
      return '儿童';
    default:
      return '成员';
  }
}

function readTripTravelers(trip?: TripDetail | null): Traveler[] {
  return trip?.pacingConfig?.travelers ?? trip?.travelers ?? [];
}

/** 从 contract.teamGovernance 或行程人数生成成员选项 */
export function buildMemberOptionsFromContract(
  teamGovernance?: TripConstraintsTeamGovernance | null,
  trip?: TripDetail | null,
): ConstraintMemberOption[] {
  const fromGovernance = (teamGovernance?.members ?? [])
    .filter((m) => m.id?.trim())
    .map((m) => ({
      id: m.id.trim(),
      label: m.name?.trim() || m.role?.trim() || m.id.trim(),
      role: m.role?.trim() || undefined,
    }));

  if (fromGovernance.length) return fromGovernance;

  const travelers = readTripTravelers(trip);
  if (!travelers.length) return [];

  return travelers.map((t, index) => ({
    id: `traveler-${index}`,
    label: `${travelerTypeLabel(t.type)}${travelers.length > 1 ? ` ${index + 1}` : ''}`,
    role: undefined,
  }));
}

/** 推断主驾驶人 memberId（供 scopeBinding 写入） */
export function resolvePrimaryDriverMemberId(
  teamGovernance?: TripConstraintsTeamGovernance | null,
  trip?: TripDetail | null,
): string | null {
  const members = teamGovernance?.members ?? [];
  const byRole = members.find((m) => m.role && PRIMARY_DRIVER_ROLE_RE.test(m.role));
  if (byRole?.id) return byRole.id;

  const byName = members.find((m) => m.name && PRIMARY_DRIVER_ROLE_RE.test(m.name));
  if (byName?.id) return byName.id;

  const options = buildMemberOptionsFromContract(teamGovernance, trip);
  return options[0]?.id ?? null;
}

/** 侧栏/摘要 · 成员数量（governance → 行程出行人 → 成员约束条目） */
export function resolveTeamMemberDisplayCount(
  teamGovernance?: TripConstraintsTeamGovernance | null,
  trip?: TripDetail | null,
  memberConstraintItems?: readonly unknown[] | null,
): number {
  const fromGovernance = (teamGovernance?.members ?? []).filter((m) => m.id?.trim()).length;
  if (fromGovernance > 0) return fromGovernance;
  const fromTrip = buildMemberOptionsFromContract(teamGovernance, trip).length;
  if (fromTrip > 0) return fromTrip;
  return memberConstraintItems?.length ?? 0;
}

/** 侧栏折叠态 · 团队成员章节摘要 */
export function resolveTeamMembersSidebarSummary(input: {
  contract?: TripConstraintsContract | null;
  trip?: TripDetail | null;
  memberConstraintItems?: readonly unknown[] | null;
}): string {
  const { contract, trip, memberConstraintItems } = input;
  const teamGovernance = contract?.teamGovernance;
  const count = resolveTeamMemberDisplayCount(teamGovernance, trip, memberConstraintItems);
  const rules = teamGovernance?.rules ?? [];
  const governanceRules = rules.filter((r) => r.key !== 'decision_weight_mode').length;
  const mode = parseGovernanceModeFromContractRules(rules);
  const modeLabel = mode ? GOVERNANCE_MODE_META[mode]?.label : null;

  if (count === 0 && governanceRules === 0 && !modeLabel) {
    return '暂无成员画像，点击打开旅行条件';
  }

  const parts: string[] = [];
  if (count > 0) parts.push(`${count} 位成员`);
  if (modeLabel) parts.push(modeLabel);
  if (governanceRules > 0) parts.push(`${governanceRules} 条决策规则`);
  return parts.join(' · ');
}

function itemTitle(item: ItineraryItemDetail): string {
  return resolveWorkbenchTimelineItemTitle(item);
}

function isRoutableItem(item: ItineraryItemDetail): boolean {
  if (item.type === 'REST') return false;
  const title = itemTitle(item).trim();
  return title.length >= 2;
}

/** 从行程日程生成相邻 POI 路段选项（segmentId = fromItemId__toItemId） */
export function buildRouteSegmentOptionsFromTrip(
  trip?: TripDetail | null,
): ConstraintRouteSegmentOption[] {
  const days = trip?.TripDay ?? [];
  const options: ConstraintRouteSegmentOption[] = [];

  days.forEach((day, dayIdx) => {
    const dayNumber = dayIdx + 1;
    const items = sortItineraryItemsForDisplay(
      (day.ItineraryItem ?? []) as ItineraryItemDetail[],
    ).filter(isRoutableItem);

    for (let i = 1; i < items.length; i++) {
      const from = items[i - 1]!;
      const to = items[i]!;
      const fromLabel = itemTitle(from);
      const toLabel = itemTitle(to);
      const segmentId = `${from.id}__${to.id}`;
      options.push({
        segmentId,
        dayNumber,
        fromItemId: from.id,
        toItemId: to.id,
        label: `D${dayNumber} ${fromLabel} → ${toLabel}`,
      });
    }
  });

  return options;
}

export function findRouteSegmentOption(
  options: ConstraintRouteSegmentOption[],
  segmentId?: string | null,
): ConstraintRouteSegmentOption | null {
  if (!segmentId?.trim()) return null;
  return options.find((o) => o.segmentId === segmentId) ?? null;
}
