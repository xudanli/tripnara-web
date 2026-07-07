import type { CollabCenterTab } from '@/lib/collab-center-tabs';

export type CollabDeepLinkPatch = {
  collabTab?: CollabCenterTab;
  voteId?: string | null;
  wishId?: string | null;
  roundId?: string | null;
  roundDomain?: string | null;
  negotiationTaskId?: string | null;
  taskFilter?: string | null;
  taskAssignee?: string | null;
};

export const COLLAB_CENTER_OPEN_KEY = 'collab';

const DEEP_LINK_KEYS = [
  'voteId',
  'wishId',
  'roundId',
  'roundDomain',
  'negotiationTaskId',
  'taskFilter',
  'taskAssignee',
] as const;

/** 团队协作中心是否应打开（含旧 tab=team 深链） */
export function isCollabCenterOpenParam(params: URLSearchParams): boolean {
  return params.get(COLLAB_CENTER_OPEN_KEY) === '1' || params.get('tab') === 'team';
}

/** 合并团队协作中心深链 query（设置 collab=1，不再切换主 Tab） */
export function mergeCollabDeepLink(
  base: URLSearchParams,
  patch: CollabDeepLinkPatch,
): URLSearchParams {
  const next = new URLSearchParams(base);
  if (next.get('tab') === 'team') {
    next.set('tab', 'schedule');
  }
  next.set(COLLAB_CENTER_OPEN_KEY, '1');
  if (patch.collabTab) {
    next.set('collabTab', patch.collabTab);
  }
  for (const key of DEEP_LINK_KEYS) {
    const value = patch[key];
    if (value === null || value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return next;
}

/** 离开协作中心时清理 query */
export function clearCollabDeepLinkKeys(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete(COLLAB_CENTER_OPEN_KEY);
  next.delete('collabTab');
  next.delete('taskFilter');
  next.delete('taskAssignee');
  for (const key of DEEP_LINK_KEYS) {
    next.delete(key);
  }
  return next;
}

/** 规划工作台 · 打开协作中心 URL */
export function buildCollabCenterPlanStudioUrl(
  tripId: string,
  patch?: CollabDeepLinkPatch,
): string {
  const base = new URLSearchParams({ tripId, tab: 'schedule' });
  const next = mergeCollabDeepLink(base, patch ?? { collabTab: 'members' });
  return `/dashboard/plan-studio?${next.toString()}`;
}
