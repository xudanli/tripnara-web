/**
 * 下载行程 PDF：统一入口（详情页 / 交付条 / Dashboard）
 */

import { tripsApi } from '@/api/trips';
import apiClient from '@/api/client';
import {
  messageFromBlobHttpError,
  normalizeTripExportApiPath,
  parseContentDispositionFilename,
  triggerBlobDownload,
} from '@/lib/trip-pdf-export.util';

export async function downloadTripPdf(tripId: string): Promise<void> {
  const { blob, filename } = await tripsApi.exportTripPdf(tripId);
  triggerBlobDownload(blob, filename);
}

/**
 * 按交付物 api_action 下载 PDF；无 path 时回退到 GET /trips/:id/export/pdf
 */
export async function downloadTripPdfFromApiAction(
  path: string | undefined,
  fallbackTripId?: string | null,
): Promise<void> {
  if (path?.trim()) {
    const normalized = normalizeTripExportApiPath(path);
    try {
      const response = await apiClient.get<Blob>(normalized, {
        responseType: 'blob',
      });
      const disposition =
        (response.headers?.['content-disposition'] as string | undefined) ??
        (response.headers?.['Content-Disposition'] as string | undefined);
      const filename = parseContentDispositionFilename(disposition) ?? 'trip.pdf';
      triggerBlobDownload(response.data, filename);
      return;
    } catch (err) {
      throw new Error(await messageFromBlobHttpError(err));
    }
  }

  if (fallbackTripId) {
    await downloadTripPdf(fallbackTripId);
    return;
  }

  throw new Error('需要有效行程 ID 才能导出 PDF');
}
