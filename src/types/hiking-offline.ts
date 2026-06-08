/**
 * 徒步离线包 — GET /api/hiking/route-directions/:id/offline-pack
 * @see docs/api/hiking-client-integration.md
 */

export type HikingOfflinePackBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type HikingOfflinePack = {
  routeDirectionId: number;
  routeDirectionName: string;
  version: string;
  geojsonUrl: string;
  /** OSM 栅格模板 manifest */
  tileManifestUrl: string;
  /** F4：Mapbox 矢量 manifest（可选） */
  vectorTileManifestUrl?: string;
  sizeBytes: number;
  checksum: string;
  bounds: HikingOfflinePackBounds;
  generatedAt: string;
  noteZh?: string;
};

export type TileManifestVectorTileRef = {
  z: number;
  x: number;
  y: number;
  url: string;
  checksum?: string;
};

export type TileManifest = {
  version: string;
  packKey: string;
  bounds: HikingOfflinePackBounds;
  tiles: {
    provider: string;
    templateUrl: string;
    minZoom: number;
    maxZoom: number;
    attribution: string;
  };
  recommendedCacheZoom: number[];
  /** P2 Mapbox 矢量：显式瓦片清单（优先于 XYZ 模板） */
  vectorTiles?: TileManifestVectorTileRef[];
  /** 可选：在线样式 URL（仅在线回退） */
  styleUrl?: string;
};

/** IndexedDB 完整缓存（checksum + version 失效） */
export type HikingOfflineCachePayload = {
  meta: HikingOfflinePack;
  geojson: GeoJSON.FeatureCollection;
  tileManifest: TileManifest;
  checksum: string;
  version: string;
  downloadedAt: string;
};
