/** @see docs/api/embedded-hiking-trip-metadata.md */

const EMBEDDED_HIKING_ERROR_MESSAGES: Record<string, string> = {
  MISSING_TRIP_ID: '混合出行须关联行程：创建徒步计划时请带上 tripId',
  TRIP_SEGMENT_LIMIT: '每条行程最多 3 个徒步片段',
  SEGMENT_DATE_OUT_OF_RANGE: '徒步日期须落在行程起止日期内',
  HIKE_PLAN_TRIP_MISMATCH: '该徒步计划不属于本行程，请重新关联',
  VALIDATION_ERROR: '行程 metadata 校验失败',
  READINESS_REQUIRED: '行前准备未完成，请先完成清单与许可后再出发',
  METADATA_TOO_LARGE: '行程扩展信息过大，请减少片段数量或精简备注后重试',
};

type ApiErrorLike = Error & { code?: string };

export function getEmbeddedHikingErrorMessage(err: unknown): string {
  const e = err as ApiErrorLike;
  if (e?.code && EMBEDDED_HIKING_ERROR_MESSAGES[e.code]) {
    return EMBEDDED_HIKING_ERROR_MESSAGES[e.code];
  }
  if (err instanceof Error && err.message) return err.message;
  return '操作失败，请稍后重试';
}
