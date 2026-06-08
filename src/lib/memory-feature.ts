/**
 * Memory OS 前端 Feature Flags
 * 与后端 FEATURE_MEMORY_CONSOLE / FEATURE_MEMORY_CONSTRAINT_SINK 对齐。
 */
export function isMemoryConsoleEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_MEMORY_CONSOLE === '1';
}

export function isConstraintSinkEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_MEMORY_CONSTRAINT_SINK === '1';
}
