/**
 * 准备页离线包：GET offline-pack → fetch assets → IndexedDB（checksum 失效）
 */

import { fetchOfflinePackMeta, downloadOfflineAssets } from '@/api/hiking-offline-pack';
import { trailOfflineStore } from '@/services/trail-offline-store';
import type { HikingOfflineCachePayload } from '@/types/hiking-offline';
import type { TrailOfflinePackRecord } from '@/types/trail-offline';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import type { RouteDirection } from '@/types/places-routes';
import {
  lineCoordinatesFromPolyline,
  mapMarkersFromSupplyPois,
  parseRouteLineFromGeojson,
  parseSupplyPoisFromGeojson,
} from '@/lib/hiking-offline-geojson';
import {
  downloadOfflineTiles,
  type TileDownloadProgress,
} from '@/services/download-offline-tiles';
import { trailOfflineTileStore } from '@/services/trail-offline-tile-store';
import type { TileManifest } from '@/types/hiking-offline';
import type { TrailOfflineTileCacheMeta } from '@/types/trail-offline';

export type EnsureOfflinePackResult = {
  record: TrailOfflinePackRecord;
  fromCache: boolean;
  tileCache?: TrailOfflineTileCacheMeta;
};

export type EnsureOfflinePackOptions = {
  longestHike?: number;
  route?: RouteDirection;
  hikingDetail?: HikingTrailDetail;
  onTileProgress?: (p: TileDownloadProgress) => void;
  /** 仅拉 GeoJSON/manifest，不下载底图瓦片 */
  skipTileDownload?: boolean;
};

function cacheMatches(
  cached: TrailOfflinePackRecord | null,
  meta: { checksum: string; version: string }
): boolean {
  return (
    cached != null &&
    cached.checksum === meta.checksum &&
    cached.version === meta.version
  );
}

function buildRecordFromCache(
  cached: TrailOfflinePackRecord,
  meta: HikingOfflineCachePayload['meta']
): TrailOfflinePackRecord {
  return { ...cached, meta, downloadedAt: cached.downloadedAt };
}

export function buildTrailOfflinePackRecord(params: {
  meta: HikingOfflineCachePayload['meta'];
  geojson: GeoJSON.FeatureCollection;
  tileManifest: HikingOfflineCachePayload['tileManifest'];
  rasterTileManifest?: TileManifest;
  vectorTileManifest?: TileManifest;
  route?: Pick<
    RouteDirection,
    'id' | 'nameCN' | 'nameEN' | 'countryCode' | 'regions' | 'tags' | 'riskProfile' | 'constraints' | 'seasonality' | 'routeDirectionName'
  >;
  hikingDetail?: HikingTrailDetail;
  longestHike?: number;
  daySkeleton?: TrailOfflinePackRecord['daySkeleton'];
  elevationProfile?: TrailOfflinePackRecord['elevationProfile'];
}): TrailOfflinePackRecord {
  const {
    meta,
    geojson,
    tileManifest,
    rasterTileManifest,
    vectorTileManifest,
    route,
    hikingDetail,
    longestHike = 2,
  } = params;
  const polyline = parseRouteLineFromGeojson(geojson);
  const supplyPois = parseSupplyPoisFromGeojson(geojson);
  const lineCoordinates = lineCoordinatesFromPolyline(polyline);
  const markers = mapMarkersFromSupplyPois(supplyPois);
  const daySkeleton =
    params.daySkeleton ?? hikingDetail?.daySkeleton ?? [];
  const elevationProfile =
    params.elevationProfile ?? hikingDetail?.elevationProfile ?? [];

  const record: TrailOfflinePackRecord = {
    routeDirectionId: meta.routeDirectionId,
    version: meta.version,
    checksum: meta.checksum,
    downloadedAt: new Date().toISOString(),
    longestHike,
    nameCN: route?.nameCN ?? meta.routeDirectionName,
    nameEN: route?.nameEN,
    countryCode: route?.countryCode ?? '',
    regions: route?.regions ?? [],
    routeDirectionName: meta.routeDirectionName,
    meta,
    geojson,
    tileManifest,
    rasterTileManifest,
    vectorTileManifest,
    summary: {
      totalDistanceKm:
        hikingDetail?.summary?.totalDistanceKm ??
        hikingDetail?.terrainSummary?.totalDistanceKm,
      totalAscentM: hikingDetail?.summary?.totalAscentM,
      suggestedDays:
        hikingDetail?.summary?.suggestedDays ??
        (daySkeleton.length > 0 ? daySkeleton.length : undefined),
      maxElevationM: hikingDetail?.summary?.maxElevationM,
      difficulty: hikingDetail?.summary?.difficulty,
    },
    polyline,
    lineCoordinates,
    markers,
    daySkeleton,
    elevationProfile,
    supplyPois,
    hikingDetail,
    routeMeta: route
      ? {
          id: route.id,
          nameCN: route.nameCN,
          countryCode: route.countryCode,
          regions: route.regions,
          tags: route.tags,
          riskProfile: route.riskProfile,
          constraints: route.constraints,
          seasonality: route.seasonality,
        }
      : {
          id: meta.routeDirectionId,
          nameCN: meta.routeDirectionName,
          countryCode: '',
          regions: [],
          tags: ['徒步'],
        },
    sizeBytes: meta.sizeBytes,
  };
  return record;
}

async function attachTileCache(
  record: TrailOfflinePackRecord,
  options?: { onTileProgress?: (p: TileDownloadProgress) => void; skipIfCached?: boolean }
): Promise<TrailOfflinePackRecord> {
  const tileCache = await downloadOfflineTiles(record.tileManifest, {
    onProgress: options?.onTileProgress,
    skipIfCached: options?.skipIfCached,
  });
  return { ...record, tileCache };
}

/**
 * 确保离线包在 IndexedDB 中且 checksum 有效
 * @param routeDirectionId 路线方向数字 ID（与详情页 :id 一致）
 */
export async function ensureOfflinePack(
  routeDirectionId: number,
  options?: EnsureOfflinePackOptions
): Promise<EnsureOfflinePackResult> {
  const meta = await fetchOfflinePackMeta(routeDirectionId);
  const cached = await trailOfflineStore.get(routeDirectionId);

  if (cacheMatches(cached, meta)) {
    let record = buildRecordFromCache(cached!, meta);
    let tileCache = record.tileCache;
    if (!options?.skipTileDownload) {
      const count = await trailOfflineTileStore.countForPack(record.tileManifest.packKey);
      if (!tileCache?.tileCount || count < 1) {
        record = await attachTileCache(record, {
          onTileProgress: options?.onTileProgress,
          skipIfCached: true,
        });
        tileCache = record.tileCache;
        await trailOfflineStore.save(record);
      }
    }
    return { record, fromCache: true, tileCache };
  }

  const assets = await downloadOfflineAssets(meta);
  let record = buildTrailOfflinePackRecord({
    meta,
    geojson: assets.geojson,
    tileManifest: assets.tileManifest,
    rasterTileManifest: assets.rasterTileManifest,
    vectorTileManifest: assets.vectorTileManifest,
    route: options?.route,
    hikingDetail: options?.hikingDetail,
    longestHike: options?.longestHike,
  });

  if (!options?.skipTileDownload) {
    record = await attachTileCache(record, { onTileProgress: options?.onTileProgress });
  }

  await trailOfflineStore.save(record);
  return { record, fromCache: false, tileCache: record.tileCache };
}

export function formatPackSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
