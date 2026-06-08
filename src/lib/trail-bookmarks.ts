import { trailBookmarksApi, type TrailBookmarkItem } from '@/api/trail-bookmarks';

const STORAGE_KEY = 'tripnara-trail-bookmarks';

function isCloudBookmarksEnabled(): boolean {
  return Boolean(
    typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('accessToken') &&
      localStorage.getItem('user')
  );
}

function readLocalIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is number => typeof id === 'number');
  } catch {
    return [];
  }
}

function writeLocalIds(ids: number[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/** 云端列表；未登录时返回 null */
export async function fetchTrailBookmarksCloud(): Promise<TrailBookmarkItem[] | null> {
  if (!isCloudBookmarksEnabled()) return null;
  try {
    const data = await trailBookmarksApi.list();
    writeLocalIds(data.routeDirectionIds);
    return data.items ?? [];
  } catch {
    return null;
  }
}

export function getTrailBookmarkIds(): number[] {
  return readLocalIds();
}

export function isTrailBookmarked(routeDirectionId: number): boolean {
  return readLocalIds().includes(routeDirectionId);
}

/**
 * 切换收藏。已登录走 API 并更新本地 ID 缓存；未登录仅 localStorage。
 * @returns 切换后是否为「已收藏」
 */
export async function toggleTrailBookmark(routeDirectionId: number): Promise<boolean> {
  const exists = readLocalIds().includes(routeDirectionId);

  if (isCloudBookmarksEnabled()) {
    try {
      if (exists) {
        await trailBookmarksApi.remove(routeDirectionId);
        writeLocalIds(readLocalIds().filter((id) => id !== routeDirectionId));
        return false;
      }
      await trailBookmarksApi.add(routeDirectionId);
      writeLocalIds([...readLocalIds(), routeDirectionId]);
      return true;
    } catch (e) {
      throw e;
    }
  }

  const next = exists
    ? readLocalIds().filter((id) => id !== routeDirectionId)
    : [...readLocalIds(), routeDirectionId];
  writeLocalIds(next);
  return !exists;
}

export async function syncTrailBookmarkIdsFromCloud(): Promise<number[]> {
  const items = await fetchTrailBookmarksCloud();
  if (items) return items.map((i) => i.routeDirectionId);
  return readLocalIds();
}
