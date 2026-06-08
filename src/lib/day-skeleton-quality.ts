import type { DaySkeleton } from '@/types/hiking';

function normalizeThemeTemplate(theme: string): string {
  return theme.replace(/第\s*\d+\s*日/g, '第 N 日');
}

/** 各天里程/爬升相同且主题仅为「第 N 日」递增 → 多为后端均分占位 */
export function isPlaceholderDaySkeleton(days: DaySkeleton[]): boolean {
  if (days.length < 2) return false;
  const { distanceKm, ascentM } = days[0];
  const sameMetrics = days.every(
    (d) => d.distanceKm === distanceKm && d.ascentM === ascentM
  );
  if (!sameMetrics) return false;
  const templates = new Set(days.map((d) => normalizeThemeTemplate(d.theme)));
  return templates.size === 1;
}

export const PLACEHOLDER_DAY_SKELETON_HINT =
  '当前各日里程与爬升相同，为后端按总里程均分的占位数据，非真实分段。需运营/后端填入真实 daySkeleton（如 Landmannalaugar → Hrafntinnusker 各段里程爬升）。';
