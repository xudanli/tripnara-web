import type { HikingOfflinePackBounds, TileManifest, TileManifestVectorTileRef } from '@/types/hiking-offline';

function zoomRange(min: number, max: number): number[] {
  const out: number[] = [];
  for (let z = min; z <= max; z++) out.push(z);
  return out;
}

/** 兼容 OSM 栅格 manifest（嵌套 `tiles`） */
export function normalizeRasterTileManifest(raw: TileManifest): TileManifest {
  if (raw.packKey && raw.tiles?.templateUrl) return raw;
  return raw;
}

/**
 * 后端 vector-tile-manifest.json（扁平结构，见 F4 API 摘要）
 */
export function normalizeVectorTileManifest(
  raw: Record<string, unknown>,
  packKey: string
): TileManifest {
  const minZoom = Number(raw.minZoom ?? 10);
  const maxZoom = Number(raw.maxZoom ?? 14);
  const tilesBaseUrl = String(raw.tilesBaseUrl ?? '').replace(/\/$/, '');
  const tileIndexTemplate = String(raw.tileIndexTemplate ?? '{z}/{x}/{y}.pbf');
  const templateUrl = tilesBaseUrl ? `${tilesBaseUrl}/${tileIndexTemplate}` : '';

  const explicit: TileManifestVectorTileRef[] = [];
  if (Array.isArray(raw.tiles)) {
    for (const t of raw.tiles) {
      if (!t || typeof t !== 'object') continue;
      const row = t as Record<string, unknown>;
      const z = Number(row.z);
      const x = Number(row.x);
      const y = Number(row.y);
      if (!Number.isFinite(z)) continue;
      const url =
        typeof row.url === 'string'
          ? row.url
          : tilesBaseUrl
            ? `${tilesBaseUrl}/${z}/${x}/${y}.pbf`
            : '';
      if (url) explicit.push({ z, x, y, url, checksum: row.checksum as string | undefined });
    }
  }

  return {
    version: String(raw.version ?? ''),
    packKey,
    bounds: raw.bounds as HikingOfflinePackBounds,
    tiles: {
      provider: String(raw.provider ?? 'mapbox-vector'),
      templateUrl,
      minZoom,
      maxZoom,
      attribution: String(raw.attribution ?? '© Mapbox © OpenStreetMap'),
    },
    recommendedCacheZoom: Array.isArray(raw.recommendedCacheZoom)
      ? (raw.recommendedCacheZoom as number[])
      : zoomRange(minZoom, maxZoom),
    vectorTiles: explicit.length ? explicit : undefined,
    styleUrl: typeof raw.styleUrl === 'string' ? raw.styleUrl : undefined,
  };
}

/** 矢量 manifest 优先用于离线下载；无矢量时回退栅格 */
export function pickTileManifestForDownload(
  raster: TileManifest,
  vector?: TileManifest | null
): TileManifest {
  if (!vector) return raster;
  const hasVectorTiles =
    (vector.vectorTiles?.length ?? 0) > 0 ||
    vector.tiles.provider.toLowerCase().includes('vector') ||
    vector.tiles.templateUrl.includes('.pbf');
  if (hasVectorTiles) {
    return {
      ...vector,
      packKey: vector.packKey || raster.packKey,
      bounds: vector.bounds ?? raster.bounds,
    };
  }
  return raster;
}
