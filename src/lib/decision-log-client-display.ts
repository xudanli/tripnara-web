import type { DecisionLogEntry } from '@/api/agent';

/**
 * 决策日志展示层清洗：与 BFF `sanitizeDecisionLogForClientDisplay` 对齐的轻量兜底。
 * 主展示仍绑定顶层 `outputs_summary`（结果）与 `inputs_summary`（输入）；
 * `metadata.plan_gen_day_digest` 按天明细由 `PlanGenDayDigestExtras` 渲染（旧日志可由 BFF 出站补全）。
 */
export function sanitizeDecisionLogSummaryText(text: string | undefined | null): string {
  if (text == null) return '';
  let s = String(text).trim();
  if (!s) return '';

  s = s.replace(/\s*[（(]Kernel[）)]\s*/gi, '');
  s = s.replace(/你的原话[：:]\s*/g, '用户请求：');
  s = s.replace(/写入统一决策状态[（(]DSO[）)]/g, '同步到决策状态');
  s = s.replace(/统一决策状态[（(]DSO[）)]/g, '决策状态');
  s = s.replace(/[（(]DSO[）)]/g, '');
  s = s.replace(/识别绑定\s*Trip\s*上的/g, '针对当前行程的');
  s = s.replace(/绑定\s*Trip/g, '当前行程');
  s = s.replace(/\s{2,}/g, ' ').trim();

  return s;
}

/** 单条决策日志：仅清洗 inputs_summary / outputs_summary，metadata 原样保留供折叠区使用 */
export function sanitizeDecisionLogEntryForDisplay(entry: DecisionLogEntry): DecisionLogEntry {
  return {
    ...entry,
    inputs_summary: sanitizeDecisionLogSummaryText(entry.inputs_summary),
    outputs_summary: sanitizeDecisionLogSummaryText(entry.outputs_summary),
  };
}

export function sanitizeDecisionLogForClientDisplay(entries: DecisionLogEntry[]): DecisionLogEntry[] {
  return entries.map(sanitizeDecisionLogEntryForDisplay);
}
