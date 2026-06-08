/**
 * 与后端 coverage-gap / readiness-findings 约定对齐：
 * findings[].id 可能为 `coverage-gap:${gapId}`（stable id），用于 solutions、去重与调试。
 */
export function isCoverageGapFindingId(id: string | undefined | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return id.startsWith('coverage-gap:');
}
