import type { TripDetail } from '@/types/trip';
import type { TripResponsibilityOwners } from '@/types/trip-responsibility';
import {
  isAdvisorLedCollaborationMode,
  readTripCollaborationMode,
  TRIP_COLLABORATION_MODE_ADVISOR_LED,
} from '@/types/trip-collaboration-mode';
import {
  ADVISOR_LED_COLLAB_TABS,
  COLLAB_CENTER_TABS,
  type CollabCenterTab,
  type CollabCenterTabDef,
} from '@/lib/collab-center-tabs';

export {
  TRIP_COLLABORATION_MODE_ADVISOR_LED,
  TRIP_COLLABORATION_MODE_SELF_PLANNED,
  isAdvisorLedCollaborationMode,
  readTripCollaborationMode,
} from '@/types/trip-collaboration-mode';

function readMetadata(trip: TripDetail | null | undefined): Record<string, unknown> | undefined {
  if (!trip) return undefined;
  const meta = (trip as { metadata?: Record<string, unknown> | null }).metadata;
  return meta && typeof meta === 'object' ? meta : undefined;
}

function readResponsibilityOwners(metadata: Record<string, unknown>): TripResponsibilityOwners | null {
  const raw = metadata.responsibilityOwners ?? metadata.responsibility_owners;
  if (!raw || typeof raw !== 'object') return null;
  return raw as TripResponsibilityOwners;
}

/** 旧行程无 tripCollaborationMode 时的启发式兜底（新行程应依赖 SSOT 字段） */
function isLegacyAdvisorLedTrip(metadata: Record<string, unknown>): boolean {
  const source = metadata.createdVia ?? metadata.created_via ?? metadata.source;
  if (source === 'advisor-create' || source === 'advisor_create') return true;

  const owners = readResponsibilityOwners(metadata);
  const planning = owners?.planningOwner;
  if (planning?.userId || planning?.name?.trim()) return true;

  // 不再用 memberInviteCodes 推断：自由行也可生成同行邀请链接
  return false;
}

/**
 * 顾问制行程：metadata.tripCollaborationMode === 'advisor_led'（SSOT）
 * 与「用户自由行」多人协作区分。
 */
export function isAdvisorLedTrip(trip: TripDetail | null | undefined): boolean {
  const metadata = readMetadata(trip);
  if (!metadata) return false;

  const mode = readTripCollaborationMode(metadata);
  if (mode != null) {
    return isAdvisorLedCollaborationMode(mode);
  }

  return isLegacyAdvisorLedTrip(metadata);
}

/** 顾问制：团队与需求 + 团队投票；自由行：完整协作中心 */
export function resolveCollabCenterTabsForTrip(
  trip: TripDetail | null | undefined,
): readonly CollabCenterTabDef[] {
  if (isAdvisorLedTrip(trip)) {
    return ADVISOR_LED_COLLAB_TABS;
  }
  return COLLAB_CENTER_TABS;
}

export function resolveCollabCenterTabForTrip(
  param: string | null,
  trip: TripDetail | null | undefined,
): CollabCenterTab {
  const allowed = new Set(resolveCollabCenterTabsForTrip(trip).map((t) => t.value));
  if (param && allowed.has(param as CollabCenterTab)) {
    return param as CollabCenterTab;
  }
  return 'members';
}
