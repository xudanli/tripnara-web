/**
 * Feature flag：混合出行徒步片段（Trip + HikePlan）
 * 与后端 `FEATURE_FLAG_EMBEDDED_HIKING_SEGMENTS` 须**同时**开启。
 * 前端：`embedded_hiking_segments` / `VITE_FF_EMBEDDED_HIKING_SEGMENTS` / `VITE_FF_EMBEDDED_HIKING`
 * @see docs/api/embedded-hiking-trip-metadata.md
 */
export function isEmbeddedHikingEnabled(): boolean {
  const v =
    import.meta.env.VITE_FF_EMBEDDED_HIKING_SEGMENTS ??
    import.meta.env.VITE_EMBEDDED_HIKING_SEGMENTS ??
    import.meta.env.VITE_FF_EMBEDDED_HIKING;
  if (v === 'false' || v === '0') return false;
  if (v === 'true' || v === '1') return true;
  return import.meta.env.DEV;
}
