/**
 * `explain.optimization` 展示辅助（决策闭环 L0–L2，snake_case）。
 * @see docs/api/decision-closure-explain-frontend.md
 */

import type { RouteAndRunResponse } from '@/api/agent';
import {
  pickExplainOptimizationFromRouteRun,
  pickOptimizationExplain,
} from '@/lib/world-model-guards';
import type {
  OptimizationExplain,
  RouteRunExplainOptimization,
  RouteRunOptimizationMethod,
  WorldConstraintMaterialization,
} from '@/types/world-model-guards';

export { pickOptimizationExplain };

export type { OptimizationExplain };

const METHOD_LABEL_ZH: Record<RouteRunOptimizationMethod, string> = {
  HEURISTIC: '快速优化',
  CGUS: '综合约束优化',
  MONTE_CARLO: '稳健方案（考虑不确定性）',
};

const REJECTION_REASON_ZH: Record<string, string> = {
  'HARD:TIME_SLACK': '日程缓冲不足，无法排进当日',
  TIME_SLACK: '日程缓冲不足',
};

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

export function formatOptimizationMethodZh(
  method: string | undefined
): string | undefined {
  if (!method?.trim()) return undefined;
  const key = method.trim().toUpperCase() as RouteRunOptimizationMethod;
  return METHOD_LABEL_ZH[key] ?? method.trim();
}

export function humanizeRejectionReason(raw: string): string {
  const t = raw.trim();
  if (!t) return '未满足行程约束';
  const upper = t.toUpperCase();
  for (const [code, label] of Object.entries(REJECTION_REASON_ZH)) {
    if (upper.includes(code.toUpperCase())) return label;
  }
  if (upper.startsWith('HARD:')) return '硬性约束未满足';
  if (upper.startsWith('SOFT:')) return '软性约束未满足';
  return '未满足行程约束';
}

/** L1 路政 Banner：`applied_events === 0` 不展示；需有道路或天气日 */
export function shouldShowRoadBanner(
  wm: WorldConstraintMaterialization | undefined
): boolean {
  if (!wm) return false;
  if ((wm.applied_events ?? 0) === 0) return false;
  return (wm.road_ids?.length ?? 0) > 0 || (wm.weather_dates?.length ?? 0) > 0;
}

/** L1 路政 Banner 文案（冰岛等场景） */
export function roadBannerText(
  wm: WorldConstraintMaterialization
): string {
  const roads = wm.road_ids?.length ? wm.road_ids.join('、') : '—';
  const dates = wm.weather_dates?.length ? wm.weather_dates.join('、') : '—';
  return `已纳入 ${wm.applied_events ?? 0} 条路况/公告约束（道路：${roads}；天气日：${dates}）`;
}

export function formatWorldConstraintBannerZh(
  materialization: WorldConstraintMaterialization | undefined
): string | null {
  if (!materialization || !shouldShowRoadBanner(materialization)) return null;
  return roadBannerText(materialization);
}

/** @deprecated 使用 shouldShowRoadBanner */
export function shouldShowWorldConstraintBanner(
  materialization: WorldConstraintMaterialization | undefined
): boolean {
  return shouldShowRoadBanner(materialization);
}

export type AlternativeViolationTags = {
  hard: string[];
  soft: string[];
};

function pushTag(bucket: string[], label: string) {
  if (label && !bucket.includes(label)) bucket.push(label);
}

export function extractAlternativeViolationTags(row: unknown): AlternativeViolationTags {
  const hard: string[] = [];
  const soft: string[] = [];
  const r = asRecord(row);
  const raw = r?.violations;
  if (!Array.isArray(raw)) return { hard, soft };

  for (const v of raw) {
    if (typeof v === 'string') {
      const u = v.trim().toUpperCase();
      if (u.startsWith('HARD')) pushTag(hard, 'HARD');
      else if (u.startsWith('SOFT')) pushTag(soft, 'SOFT');
      else pushTag(soft, '约束');
      continue;
    }
    const vo = asRecord(v);
    if (!vo) continue;
    const sev = String(vo.severity ?? vo.type ?? vo.level ?? '').toUpperCase();
    const code = String(vo.code ?? vo.detail ?? vo.reason ?? '').trim();
    if (sev.includes('HARD') || code.toUpperCase().includes('HARD')) {
      pushTag(hard, code ? `HARD·${code}` : 'HARD');
    } else if (sev.includes('SOFT') || code.toUpperCase().includes('SOFT')) {
      pushTag(soft, code ? `SOFT·${code}` : 'SOFT');
    } else if (code) {
      pushTag(soft, code);
    }
  }
  return { hard, soft };
}

/** 规划 OK + 非咨询：结构化 explain.optimization */
export function pickRouteRunExplainOptimizationForMessage(
  res: RouteAndRunResponse,
  opts?: { uiSurface?: string; status?: string }
): RouteRunExplainOptimization | undefined {
  const surface = (opts?.uiSurface ?? '').toLowerCase();
  if (surface === 'consultation') return undefined;
  if (opts?.status && opts.status !== 'OK') return undefined;
  return pickExplainOptimizationFromRouteRun(res);
}

export function hasOptimizationDecisionUi(opt: RouteRunExplainOptimization | undefined): boolean {
  if (!opt) return false;
  if (opt.decision_verdict_narration_zh?.trim()) return true;
  if (opt.meta_decision_audit?.trim()) return true;
  const v = opt.decision_verdict;
  if (v?.monte_carlo_summary?.total_samples) return true;
  return Boolean(v?.chosen_plan_id || (v?.rejected_plans?.length ?? 0) > 0);
}

/** L2：是否展示弃选方案表 */
export function shouldShowRejectedPlansTable(opt: RouteRunExplainOptimization | undefined): boolean {
  return (opt?.decision_verdict?.rejected_plans?.length ?? 0) > 0;
}
