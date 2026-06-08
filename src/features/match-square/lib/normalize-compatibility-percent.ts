/** 统一契合度刻度 — API 可能返回 0–1 或 0–100 */
export function normalizeCompatibilityPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value > 0 && value <= 1) return Math.round(value * 100);
  return Math.round(Math.min(100, Math.max(0, value)));
}
