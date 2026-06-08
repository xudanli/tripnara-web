/** 解析 trustAssetLine 为可渲染的 trust pill 片段（去掉 emoji 盾） */
export function parseTrustAssetSegments(line: string): string[] {
  return line
    .split(/\s*[·•]\s*/)
    .map((segment) => segment.replace(/^🛡️\s*/u, '').trim())
    .filter(Boolean);
}
