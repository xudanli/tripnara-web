import type { RecruitmentPostCard } from '@/types/match-square';
import { TRAVEL_MODE_LABELS } from './constants';
import {
  BUDGET_SUMMARY_PREFIX,
  buildListCardHardGatesLine,
  resolveBudgetGateLabel,
} from './resolve-budget-gate';
import { sanitizeVibeBudgetCopy } from './vibe-budget-coherence';

function stripBudgetSummaryPrefix(line: string): string {
  return line.startsWith(BUDGET_SUMMARY_PREFIX)
    ? line.slice(BUDGET_SUMMARY_PREFIX.length).trim()
    : line.trim();
}

function isBudgetSummaryLine(line: string): boolean {
  return line.startsWith(BUDGET_SUMMARY_PREFIX) || /^(💰|¥|\d+[wW万])/.test(line.replace(/\s/g, ''));
}

/** HARD GATES 一行摘要 — 合并预算/出行/组队与 Vibe 硬门槛，去重 */
export function buildHardGatesSummary(post: RecruitmentPostCard): string[] {
  const rows: string[] = [];

  const budget = resolveBudgetGateLabel(post);
  if (budget) rows.push(`${BUDGET_SUMMARY_PREFIX}${budget}`);

  if (post.travelMode) {
    const mode =
      TRAVEL_MODE_LABELS[post.travelMode as keyof typeof TRAVEL_MODE_LABELS] ?? post.travelMode;
    rows.push(post.vehicleInfo ? `${mode} · ${post.vehicleInfo}` : mode);
  }

  if (post.teamworkStyleCapsule?.trim()) {
    rows.push(post.teamworkStyleCapsule.trim());
  } else if (post.planningStyleLabel) {
    const trustLine = post.verifiedCredentials?.headline?.trustAssetLine ?? '';
    const alreadyShown =
      trustLine.includes('组队') || trustLine.includes(post.planningStyleLabel);
    if (!alreadyShown) {
      rows.push(`组队风格：${post.planningStyleLabel}`);
    }
  }

  const vibe = post.vibeLlm?.hardGatesSummary ?? [];
  for (const line of vibe) {
    const sanitized = sanitizeVibeBudgetCopy(line, post);
    if (!sanitized) continue;
    if (isBudgetSummaryLine(sanitized)) continue;
    if (/组队风格/.test(sanitized) && post.teamworkStyleCapsule?.includes('组队风格')) continue;
    const normalized = stripBudgetSummaryPrefix(sanitized);
    if (rows.some((r) => r === sanitized || r.endsWith(normalized))) continue;
    rows.push(sanitized);
  }

  return rows;
}

export function formatHardGatesInline(post: RecruitmentPostCard): string | null {
  const rows = buildHardGatesSummary(post);
  return rows.length ? rows.join(' · ') : null;
}

/** §7.0.2 列表 Card — 单行 Hard Gates（💰 预算 · 组队风格胶囊） */
export function buildListCardGatePills(post: RecruitmentPostCard): string[] {
  const line = buildListCardHardGatesLine(post);
  return line ? [line] : [];
}
