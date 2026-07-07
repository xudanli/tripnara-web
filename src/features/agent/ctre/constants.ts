/**
 * CTRE 进度数据来源优先级（与后端 PRD §11.1 对齐）
 *
 * 1. SSE `payload.ctre_compilation`（TRAVEL_COMPILE 阶段）
 * 2. route_and_run RESULT `state.metadata.ctre_compile_progress`
 * 3. HTTP `GET /trips/:tripId/ctre/compile-progress`（Graph 已持久化后的离线/兜底）
 *
 * 注意：
 * - 生成过程中仅轮询 Trip Graph API 时，面板短暂为空或 404 是正常现象
 * - 无 trip_id 的草稿会话不会落 Trip Graph，面板只能读 SSE / RESULT
 * - 需后端 `TRAVEL_COMPILER_ENABLED=true` 或请求 `options.enable_travel_compiler: true`
 */

import { CONFIG } from '@/constants/config';

export const CTRE_COMPILE_PROGRESS_SCHEMA = 'tripnara.ctre_compile_progress@v0';

/** 前端是否默认开启 Travel Compiler（对应后端 TRAVEL_COMPILER_ENABLED） */
export function isTravelCompilerEnabledByEnv(): boolean {
  const raw = String(CONFIG.FEATURES.TRAVEL_COMPILER_ENABLED ?? '')
    .trim()
    .toLowerCase();
  return raw === 'true' || raw === '1';
}

/** 是否应在 route_and_run 请求中附带 enable_travel_compiler */
export function shouldEnableTravelCompilerOnRouteRun(
  explicit?: boolean | null,
): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return isTravelCompilerEnabledByEnv();
}

export const CTRE_PROGRESS_HINTS = {
  sseOnlyDraft:
    '无 trip_id 时不会写入 Trip Graph，CTRE 进度仅来自 Agent SSE / 终态 RESULT。',
  graphPending:
    'Graph 落库前 HTTP 可能为空或 404，属正常现象；实时进度请优先看 Agent SSE。',
  compilerDisabled:
    'Travel Compiler 未启用。请设置 TRAVEL_COMPILER_ENABLED 或传 enable_travel_compiler: true。',
} as const;

/** §11.14 Trip 页是否渲染 CTRE 结构化进度区块 */
export function shouldShowTripCtrePanel(tripId: string | null | undefined): boolean {
  return isTravelCompilerEnabledByEnv() && Boolean(tripId?.trim());
}

/** §11.14.1 空态主文案 */
export function ctreEmptyStateCopy(): string {
  return (
    '要在该 Trip 上看到结构化进度，请在规划工作台重新「生成方案」。' +
    '需同时满足：前端 VITE_TRAVEL_COMPILER_ENABLED=true、后端 TRAVEL_COMPILER_ENABLED=true' +
    '（或请求 enable_travel_compiler: true），且 execute 必须带上与当前 Trip 一致的 tripId。' +
    '生成完成后本页读取 compile-progress；进行中的细粒度进度见 Workbench 任务 currentStage。'
  );
}

/** §11.14.1 短版（侧栏 / Tooltip） */
export function ctreEmptyStateShortCopy(): string {
  return '要在该 Trip 上看到结构化进度，请在规划工作台重新「生成方案」，并开启旅行编译（CTRE）。';
}

export const CTRE_SKIPPED_REASON_COPY: Record<string, string> = {
  travel_compiler_disabled:
    '旅行编译未开启（TRAVEL_COMPILER_ENABLED 或 enable_travel_compiler）。',
  no_segments: '当前方案无 itinerary segments，无法触发 CTRE。',
  compare_only: '「对比方案」不会触发 CTRE，请改用「生成方案」。',
};

export function getCtreSkippedReasonCopy(reason: string | undefined): string | null {
  if (!reason?.trim()) return null;
  return CTRE_SKIPPED_REASON_COPY[reason.trim()] ?? null;
}
