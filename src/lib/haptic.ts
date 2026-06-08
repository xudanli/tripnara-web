/** 离散滑块档位切换时的系统级轻震反馈 */
export function triggerHapticPulse(durationMs = 15): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(durationMs);
  }
}
