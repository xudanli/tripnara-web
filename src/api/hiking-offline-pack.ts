/**
 * 徒步离线包元数据与资源下载
 * GET /api/hiking/route-directions/:routeDirectionId/offline-pack（@Public，无需登录）
 */

import apiClient from './client';
import {
  normalizeRasterTileManifest,
  normalizeVectorTileManifest,
  pickTileManifestForDownload,
} from '@/lib/normalize-tile-manifest';
import type { HikingOfflinePack, TileManifest } from '@/types/hiking-offline';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error: { code?: string; message: string };
}

type ApiResponseWrapper<T> = SuccessResponse<T> | ErrorResponse;

function handleResponse<T>(response: { data: ApiResponseWrapper<T> }): T {
  if (!response?.data?.success) {
    throw new Error(
      (response.data as ErrorResponse)?.error?.message ?? 'offline-pack 请求失败'
    );
  }
  return response.data.data;
}

export const hikingOfflinePackApi = {
  /** GET /hiking/route-directions/:id/offline-pack */
  fetchMeta: async (routeDirectionId: number): Promise<HikingOfflinePack> => {
    const response = await apiClient.get<ApiResponseWrapper<HikingOfflinePack>>(
      `/hiking/route-directions/${routeDirectionId}/offline-pack`
    );
    return handleResponse(response);
  },

  /** 拉取 GeoJSON + 栅格/矢量 manifest（矢量优先用于瓦片下载） */
  downloadAssets: async (meta: HikingOfflinePack) => {
    const packKey =
      meta.routeDirectionName?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
      `rd-${meta.routeDirectionId}`;

    const fetches: Promise<Response>[] = [
      fetch(meta.geojsonUrl),
      fetch(meta.tileManifestUrl),
    ];
    if (meta.vectorTileManifestUrl) {
      fetches.push(fetch(meta.vectorTileManifestUrl));
    }

    const results = await Promise.all(fetches);
    const geoRes = results[0];
    const rasterRes = results[1];
    const vectorRes = meta.vectorTileManifestUrl ? results[2] : undefined;

    if (!geoRes.ok || !rasterRes.ok) {
      throw new Error('下载离线资源失败（GeoJSON 或瓦片清单）');
    }

    const geojson = (await geoRes.json()) as GeoJSON.FeatureCollection;
    const rasterTileManifest = normalizeRasterTileManifest(
      (await rasterRes.json()) as TileManifest
    );

    let vectorTileManifest: TileManifest | undefined;
    if (vectorRes?.ok) {
      const raw = (await vectorRes.json()) as Record<string, unknown>;
      vectorTileManifest = normalizeVectorTileManifest(
        raw,
        String(raw.packKey ?? packKey)
      );
    }

    const tileManifest = pickTileManifestForDownload(
      rasterTileManifest,
      vectorTileManifest
    );

    return {
      geojson,
      tileManifest,
      rasterTileManifest,
      vectorTileManifest,
    };
  },
};

export async function fetchOfflinePackMeta(
  routeDirectionId: number
): Promise<HikingOfflinePack> {
  return hikingOfflinePackApi.fetchMeta(routeDirectionId);
}

export async function downloadOfflineAssets(meta: HikingOfflinePack) {
  return hikingOfflinePackApi.downloadAssets(meta);
}
