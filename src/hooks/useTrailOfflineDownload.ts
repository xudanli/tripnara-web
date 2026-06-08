import { useCallback, useEffect, useState } from 'react';
import {
  ensureOfflinePack,
  type EnsureOfflinePackResult,
} from '@/services/ensure-hiking-offline-pack';
import type { TileDownloadProgress } from '@/services/download-offline-tiles';
import { useLongestHike } from '@/hooks/useLongestHike';
import { trailOfflineStore } from '@/services/trail-offline-store';
import type { TrailOfflinePackRecord } from '@/types/trail-offline';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import type { RouteDirection } from '@/types/places-routes';

export type UseTrailOfflineDownloadOptions = {
  /** 详情页已加载时可传入，避免重复拼 daySkeleton / emergency */
  route?: RouteDirection;
  hikingDetail?: HikingTrailDetail;
};

/**
 * 准备页 / 详情辅助：离线包走 GET /hiking/route-directions/:routeDirectionId/offline-pack
 * @param routeDirectionId 路线方向数字 ID（非 hikePlanId）
 */
export function useTrailOfflineDownload(
  routeDirectionId?: number,
  options?: UseTrailOfflineDownloadOptions
) {
  const { longestHike, longestHikeForQuery } = useLongestHike();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [localPack, setLocalPack] = useState<TrailOfflinePackRecord | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [tileProgress, setTileProgress] = useState<TileDownloadProgress | null>(null);

  const refresh = useCallback(async () => {
    if (routeDirectionId == null) {
      setIsDownloaded(false);
      setLocalPack(null);
      return;
    }
    const pack = await trailOfflineStore.get(routeDirectionId);
    setIsDownloaded(pack != null);
    setLocalPack(pack);
  }, [routeDirectionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const download = useCallback(async (): Promise<EnsureOfflinePackResult | undefined> => {
    if (routeDirectionId == null) return;
    setDownloading(true);
    setTileProgress(null);
    try {
      const result = await ensureOfflinePack(routeDirectionId, {
        longestHike: longestHikeForQuery ?? longestHike,
        route: options?.route,
        hikingDetail: options?.hikingDetail,
        onTileProgress: setTileProgress,
      });
      setFromCache(result.fromCache);
      setIsDownloaded(true);
      setLocalPack(result.record);
      return result;
    } finally {
      setDownloading(false);
      setTileProgress(null);
    }
  }, [
    routeDirectionId,
    longestHike,
    longestHikeForQuery,
    options?.route,
    options?.hikingDetail,
  ]);

  const remove = useCallback(async () => {
    if (routeDirectionId == null) return;
    await trailOfflineStore.delete(routeDirectionId);
    setIsDownloaded(false);
    setLocalPack(null);
    setFromCache(false);
  }, [routeDirectionId]);

  return {
    isDownloaded,
    downloading,
    localPack,
    fromCache,
    tileProgress,
    download,
    remove,
    refresh,
  };
}
