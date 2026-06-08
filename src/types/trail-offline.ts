import type { RouteDirection } from '@/types/places-routes';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import type { HikingOfflinePack, TileManifest } from '@/types/hiking-offline';
export type OfflineTileFormat = 'raster' | 'vector';
import type { DaySkeleton, ElevationProfilePoint, SupplyPoi } from '@/types/hiking';

/** 地图 marker（与 MapboxTrailMap 一致） */
export type TrailOfflineMapMarker = {
  id: string;
  lng: number;
  lat: number;
  label?: string;
  color?: string;
};

/** 本地 IndexedDB 存储的徒步离线包（准备页 GET offline-pack + GeoJSON/manifest） */
export type TrailOfflinePackRecord = {
  routeDirectionId: number;
  /** 服务端版本，如 2026.05.20 */
  version: string;
  /** GeoJSON sha256，用于缓存失效 */
  checksum: string;
  downloadedAt: string;
  longestHike: number;
  nameCN: string;
  nameEN?: string;
  countryCode: string;
  regions: string[];
  routeDirectionName?: string;
  meta: HikingOfflinePack;
  geojson: GeoJSON.FeatureCollection;
  tileManifest: TileManifest;
  /** 原始栅格 manifest（与 tileManifest 可能相同） */
  rasterTileManifest?: TileManifest;
  /** F4 矢量 manifest（若 offline-pack 提供） */
  vectorTileManifest?: TileManifest;
  /** 底图瓦片已写入 IndexedDB（tripnara-trail-offline-tiles） */
  tileCache?: TrailOfflineTileCacheMeta;
  summary: {
    totalDistanceKm?: number;
    totalAscentM?: number;
    suggestedDays?: number;
    maxElevationM?: number;
    difficulty?: string;
  };
  polyline: Array<{ lat: number; lng: number }>;
  lineCoordinates: Array<[number, number]>;
  markers: TrailOfflineMapMarker[];
  daySkeleton: DaySkeleton[];
  elevationProfile: ElevationProfilePoint[];
  supplyPois: SupplyPoi[];
  hikingDetail?: HikingTrailDetail;
  routeMeta: Pick<
    RouteDirection,
    'id' | 'nameCN' | 'countryCode' | 'regions' | 'tags' | 'riskProfile' | 'constraints' | 'seasonality'
  >;
  sizeBytes: number;
};

export type TrailOfflineTileCacheMeta = {
  packKey: string;
  provider: string;
  format: OfflineTileFormat;
  tileCount: number;
  bytesCached: number;
  cachedAt: string;
  capped?: boolean;
  failed?: number;
};
