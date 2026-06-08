import { enumerateTilesInBounds } from '@/lib/offline-tile-math';
import { trailOfflineTileStore } from '@/services/trail-offline-tile-store';
import type { HikingOfflinePackBounds } from '@/types/hiking-offline';
import type { OfflineTileFormat } from '@/types/trail-offline';

const PROTOCOL = 'tripnara-offline';

/** 1×1 透明 PNG，瓦片尚未从 IndexedDB 读出时使用 */
export const EMPTY_TILE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const blobUrlByTileUrl = new Map<string, string>();

export function offlineTileUrl(
  packKey: string,
  z: number,
  x: number,
  y: number,
  format: OfflineTileFormat
): string {
  const ext = format === 'vector' ? 'pbf' : 'png';
  return `${PROTOCOL}://${packKey}/${z}/${x}/${y}.${ext}`;
}

export function getCachedBlobUrl(tileUrl: string): string | undefined {
  return blobUrlByTileUrl.get(tileUrl);
}

export function isOfflineTileUrl(url: string): boolean {
  return url.startsWith(`${PROTOCOL}://`);
}

export async function cacheTileBlob(
  packKey: string,
  z: number,
  x: number,
  y: number,
  format: OfflineTileFormat
): Promise<void> {
  const tileUrl = offlineTileUrl(packKey, z, x, y, format);
  if (blobUrlByTileUrl.has(tileUrl)) return;

  const cached = await trailOfflineTileStore.get(packKey, { z, x, y });
  if (!cached?.data?.byteLength) return;

  const blob = new Blob([cached.data], { type: cached.contentType });
  blobUrlByTileUrl.set(tileUrl, URL.createObjectURL(blob));
}

export async function warmOfflineTilesForBounds(
  packKey: string,
  bounds: HikingOfflinePackBounds,
  zooms: number[],
  format: OfflineTileFormat,
  maxTiles = 120
): Promise<number> {
  const coords = enumerateTilesInBounds(bounds, zooms, maxTiles);
  await Promise.all(
    coords.map((c) => cacheTileBlob(packKey, c.z, c.x, c.y, format))
  );
  return coords.length;
}

export function clearOfflineTileBlobCache(): void {
  for (const url of blobUrlByTileUrl.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrlByTileUrl.clear();
}
