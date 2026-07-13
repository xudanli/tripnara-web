import type { PlanningStyle } from '@/types/match-square';
import type { TeamworkContractModel, VibeEducationBaseline, VibeHardGates, VibeSecurityLevel } from '@/types/vibe-llm';
import { teamworkModelToPlanningStyle } from '@/types/vibe-llm';
import { PLANNING_STYLE_CAPSULES, PLANNING_STYLE_LABELS } from '../recruitment-constants';
import { resolveParseBudgetGateLine } from '../resolve-budget-gate';

const EDUCATION_LABELS: Record<Exclude<VibeEducationBaseline, 'None'>, string> = {
  Bachelor: '本科',
  Master: '硕士',
  Doctorate: '博士',
};

const SECURITY_LABELS: Record<VibeSecurityLevel, string> = {
  Standard: '标准授信',
  Medium: '中等授信',
  High: '高授信（需身份认证）',
};

/** 用户可见组队契约中文标签 — 优先 API label，否则本地映射 */
export function resolveTeamworkContractModelLabel(
  model?: TeamworkContractModel | string | null,
  apiLabel?: string | null
): string | null {
  const trimmed = apiLabel?.trim();
  if (trimmed) return trimmed;
  if (!model) return null;
  const style = teamworkModelToPlanningStyle(model as TeamworkContractModel);
  return PLANNING_STYLE_LABELS[style] ?? null;
}

/** 用户可见组队风格胶囊 — 与 Card teamworkStyleCapsule 一致 */
export function resolveTeamworkStyleCapsule(
  model?: TeamworkContractModel | string | null,
  planningStyle?: PlanningStyle | null
): string | null {
  if (planningStyle) return PLANNING_STYLE_CAPSULES[planningStyle];
  if (!model) return null;
  const style = teamworkModelToPlanningStyle(model as TeamworkContractModel);
  return PLANNING_STYLE_CAPSULES[style];
}

/** 发布页 / 详情 Hard Gates 预览文案（Medium 仅展示，不阻断） */
export function buildVibeHardGatesPreviewLines(
  gates: VibeHardGates | undefined,
  formBudget?: { min?: number; max?: number }
): string[] {
  if (!gates) return [];
  const lines: string[] = [];

  const budgetLine = resolveParseBudgetGateLine(gates, formBudget);
  if (budgetLine) lines.push(budgetLine);

  if (gates.education_baseline && gates.education_baseline !== 'None') {
    lines.push(`学历门槛：${EDUCATION_LABELS[gates.education_baseline]} 及以上`);
  }
  if (gates.industry_preference?.length) {
    lines.push(`圈层偏好：${gates.industry_preference.join('、')}`);
  }
  if (gates.security_level && gates.security_level !== 'Standard') {
    const suffix = gates.security_level === 'Medium' ? '（仅展示）' : '';
    lines.push(`授信等级：${SECURITY_LABELS[gates.security_level]}${suffix}`);
  }

  return lines;
}
