import { enumerateTilesInBounds, formatTileTemplate, type TileCoord } from '@/lib/offline-tile-math';
import type { TileManifest } from '@/types/hiking-offline';
import type { OfflineTileFormat } from '@/types/trail-offline';

export type { OfflineTileFormat };

export type OfflineTileDownloadItem = TileCoord & {
  url: string;
  format: OfflineTileFormat;
};

export type OfflineTileDownloadPlan = {
  packKey: string;
  provider: string;
  format: OfflineTileFormat;
  items: OfflineTileDownloadItem[];
  capped: boolean;
};

function inferFormat(provider: string, templateUrl: string): OfflineTileFormat {
  const p = provider.toLowerCase();
  const u = templateUrl.toLowerCase();
  if (p.includes('vector') || u.includes('.pbf') || u.includes('vector')) return 'vector';
  return 'raster';
}

function appendMapboxToken(url: string, token?: string): string {
  if (!token || url.includes('access_token=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}access_token=${encodeURIComponent(token)}`;
}

/**
 * 由 tileManifest 生成待下载瓦片列表（XYZ 模板或显式 vectorTiles 清单）
 */
export function buildOfflineTileDownloadPlan(
  manifest: TileManifest,
  options?: { mapboxToken?: string; maxTiles?: number }
): OfflineTileDownloadPlan {
  const maxTiles = options?.maxTiles ?? 600;
  const packKey = manifest.packKey;
  const provider = manifest.tiles.provider;
  const explicit = manifest.vectorTiles;

  if (explicit?.length) {
    const format: OfflineTileFormat = 'vector';
    const items = explicit.slice(0, maxTiles).map((t) => ({
      z: t.z,
      x: t.x,
      y: t.y,
      format,
      url: appendMapboxToken(t.url, options?.mapboxToken),
    }));
    return {
      packKey,
      provider,
      format,
      items,
      capped: explicit.length > maxTiles,
    };
  }

  const templateUrl = manifest.tiles.templateUrl;
  const format = inferFormat(provider, templateUrl);
  const zooms =
    manifest.recommendedCacheZoom?.length > 0
      ? manifest.recommendedCacheZoom.filter(
          (z) => z >= manifest.tiles.minZoom && z <= manifest.tiles.maxZoom
        )
      : [manifest.tiles.minZoom, manifest.tiles.maxZoom].filter(
          (z, i, arr) => arr.indexOf(z) === i
        );

  const coords = enumerateTilesInBounds(manifest.bounds, zooms, maxTiles);
  const items: OfflineTileDownloadItem[] = coords.map((c) => ({
    ...c,
    format,
    url: appendMapboxToken(formatTileTemplate(templateUrl, c.z, c.x, c.y), options?.mapboxToken),
  }));

  return {
    packKey,
    provider,
    format,
    items,
    capped: coords.length >= maxTiles,
  };
}
