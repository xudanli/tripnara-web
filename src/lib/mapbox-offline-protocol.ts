/**
 * mapbox-gl@3 无 addProtocol（MapLibre 专有）。
 * 离线瓦片经 transformRequest + offline-tile-blob-cache 提供。
 */

export function setActiveOfflineTilePackKey(_packKey: string | null): void {
  /* 保留 API；packKey 已编码在 tripnara-offline:// URL 中 */
}

/** @deprecated 无操作，避免旧代码调用 addProtocol 崩溃 */
export function ensureMapboxOfflineProtocol(): void {
  /* no-op */
}
