/**
 * @deprecated Gate 0-1 信任体系重构 — 芝麻信用 / 综合信用 / 陌生人互评
 * 保留解析适配，停止用于展示、推荐与权限决策。
 */

/** 从 trustAssetLine 片段中剔除已下线的芝麻/综合信用文案 */
export function filterDeprecatedTrustSegments(segments: string[]): string[] {
  return segments.filter((segment) => !/芝麻|信用分|互评|Reputation OS/i.test(segment));
}

/** 从整行 trustAssetLine 剔除芝麻段，仅保留组队风格等中性胶囊 */
export function sanitizeTrustAssetLine(line: string | null | undefined): string | null {
  if (!line?.trim()) return null;
  const parts = line
    .split(/\s*[·•]\s*/)
    .map((segment) => segment.replace(/^🛡️\s*/u, '').trim())
    .filter(Boolean);
  const kept = filterDeprecatedTrustSegments(parts);
  return kept.length > 0 ? kept.join(' · ') : null;
}
