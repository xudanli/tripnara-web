/**
 * @deprecated 请用 `useLongestHike()` 或 `resolveLongestHike()`（profile / URL query）
 * 保留同步入口供非 React 模块在传入 profile 时使用。
 */

import type { FitnessProfile } from '@/types/fitness';
import { resolveLongestHike } from '@/lib/longest-hike-resolve';

/** @deprecated 不再读写 localStorage */
export function getStoredLongestHike(): number | null {
  return null;
}

/** @deprecated 问卷提交后由后端 profile 持久化 */
export function setStoredLongestHike(_value: number): void {
  /* no-op */
}

/** 同步解析；React 页请用 useLongestHike */
export function resolveLongestHikeForPreview(profile?: FitnessProfile | null): number {
  return resolveLongestHike({ profile });
}
