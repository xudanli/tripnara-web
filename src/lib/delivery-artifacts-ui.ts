import type { RouteAndRunResponse } from '@/api/agent';
import type { DeliveryArtifactsPayload } from '@/types/delivery-artifacts';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function isDeliveryArtifactsPayload(v: unknown): v is DeliveryArtifactsPayload {
  if (!isRecord(v)) return false;
  if (v.schema !== 'tripnara.delivery_artifacts@v1') return false;
  if (!Array.isArray(v.links)) return false;
  return v.links.every(
    (link) =>
      isRecord(link) &&
      typeof link.kind === 'string' &&
      typeof link.label_zh === 'string' &&
      link.label_zh.trim().length > 0
  );
}

/** 展示层：result.payload.ui_display.delivery_artifacts */
export function pickDeliveryArtifactsFromRouteRun(
  response: RouteAndRunResponse
): DeliveryArtifactsPayload | null {
  if (response.result?.status !== 'OK') return null;

  const payload = response.result?.payload as Record<string, unknown> | undefined;
  const uiDisplay = isRecord(payload?.ui_display) ? payload.ui_display : undefined;
  const fromUi = uiDisplay?.delivery_artifacts;
  if (isDeliveryArtifactsPayload(fromUi)) return fromUi;

  return null;
}

export function hasDeliveryArtifactsUi(payload: DeliveryArtifactsPayload | null | undefined): boolean {
  return Boolean(payload?.links?.length);
}
