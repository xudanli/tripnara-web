/** PDI-4 · 决策画像跨行程沿用（默认开；设 VITE_FEATURE_DECISION_PROFILING_REUSE=0 关闭） */
export function isDecisionProfilingReuseEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_DECISION_PROFILING_REUSE !== '0';
}
