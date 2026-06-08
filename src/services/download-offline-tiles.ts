import { buildOfflineTileDownloadPlan } from '@/lib/offline-tile-plan';
import { getMapboxAccessToken } from '@/lib/mapbox-token';
import {
  trailOfflineTileStore,
  type CachedOfflineTile,
} from '@/services/trail-offline-tile-store';
import type { TileManifest } from '@/types/hiking-offline';
import type {
  OfflineTileFormat,
  TrailOfflineTileCacheMeta,
} from '@/types/trail-offline';

export type TileDownloadProgress = {
  done: number;
  total: number;
  failed: number;
};

const CONCURRENCY = 6;

function contentTypeForFormat(format: OfflineTileFormat): string {
  return format === 'vector' ? 'application/x-protobuf' : 'image/png';
}

async function fetchTileBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
  onProgress?: () => void
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
      onProgress?.();
    }
  });
  await Promise.all(runners);
}

export async function downloadOfflineTiles(
  manifest: TileManifest,
  options?: {
    onProgress?: (p: TileDownloadProgress) => void;
    skipIfCached?: boolean;
  }
): Promise<TrailOfflineTileCacheMeta> {
  const plan = buildOfflineTileDownloadPlan(manifest, {
    mapboxToken: getMapboxAccessToken() || undefined,
  });

  if (plan.items.length === 0) {
    return {
      packKey: plan.packKey,
      provider: plan.provider,
      format: plan.format,
      tileCount: 0,
      bytesCached: 0,
      cachedAt: new Date().toISOString(),
      capped: plan.capped,
    };
  }

  if (options?.skipIfCached) {
    const existing = await trailOfflineTileStore.countForPack(plan.packKey);
    if (existing >= Math.min(plan.items.length, 1)) {
      const stats = await trailOfflineTileStore.statsForPack(plan.packKey);
      return {
        packKey: plan.packKey,
        provider: plan.provider,
        format: plan.format,
        tileCount: stats.tileCount,
        bytesCached: stats.bytesCached,
        cachedAt: new Date().toISOString(),
        capped: plan.capped,
      };
    }
  }

  let done = 0;
  let failed = 0;
  const report = () =>
    options?.onProgress?.({ done, total: plan.items.length, failed });

  report();

  await runPool(
    plan.items,
    async (item) => {
      try {
        const data = await fetchTileBuffer(item.url);
        const row: CachedOfflineTile = {
          key: `${plan.packKey}/${item.z}/${item.x}/${item.y}`,
          packKey: plan.packKey,
          z: item.z,
          x: item.x,
          y: item.y,
          format: item.format,
          contentType: contentTypeForFormat(item.format),
          data,
          cachedAt: new Date().toISOString(),
        };
        await trailOfflineTileStore.put(row);
        done += 1;
      } catch {
        failed += 1;
      }
      report();
    },
    CONCURRENCY
  );

  const stats = await trailOfflineTileStore.statsForPack(plan.packKey);
  return {
    packKey: plan.packKey,
    provider: plan.provider,
    format: plan.format,
    tileCount: stats.tileCount,
    bytesCached: stats.bytesCached,
    cachedAt: new Date().toISOString(),
    capped: plan.capped,
    failed,
  };
}
