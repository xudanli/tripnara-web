import type { OptionComparison } from '@/api/planning-workbench';
import {
  getSegmentEditorDegradation,
  isRouteTopologyLocked,
  resolvePlanningBannerText,
} from '@/lib/world-model-guards';
import {
  getPersonaAlertUserBody,
  isUserVisiblePersonaAlert,
} from '@/lib/persona-alert-display';
import type { PersonaAlert } from '@/types/trip';
import type { WorldModelGuards } from '@/types/world-model-guards';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';

export type DecisionStripState = 'idle' | 'running' | 'conclusion' | 'blocked' | 'error';

export type DecisionStripCtaType =
  | 'open_assistant'
  | 'open_plan_gate'
  | 'adjust_schedule'
  | 'open_feasibility'
  | 'optimize';

export interface DecisionStripCompareSummary {
  recommendedOptionId: string;
  reason: string;
  divergesFromLlm: boolean;
  llmRecommendedOptionId?: string;
  recommendedByGate?: string;
  optionCount: number;
}

export interface DecisionStripPersonaLine {
  personaLabel: string;
  text: string;
}

export interface DecisionStripPrimaryCta {
  type: DecisionStripCtaType;
  /** 来自 suggested_operations 的文案覆盖 */
  labelOverride?: string;
}

export type DecisionStripCtaLabelKey =
  | 'openAssistant'
  | 'openPlanGate'
  | 'adjustSchedule'
  | 'openFeasibility'
  | 'optimize'
  | 'viewProgress';

export const DECISION_STRIP_CTA_LABEL_KEY: Record<DecisionStripCtaType, DecisionStripCtaLabelKey> = {
  open_assistant: 'openAssistant',
  open_plan_gate: 'openPlanGate',
  adjust_schedule: 'adjustSchedule',
  open_feasibility: 'openFeasibility',
  optimize: 'optimize',
};

const PERSONA_PRIORITY: PersonaAlert['persona'][] = ['ABU', 'DR_DRE', 'NEPTUNE'];

const PERSONA_LABEL: Record<string, string> = {
  ABU: 'Abu',
  DR_DRE: 'Dr.Dre',
  NEPTUNE: 'Neptune',
};

export function buildDecisionStripCompareSummary(
  comparison: OptionComparison | null | undefined,
): DecisionStripCompareSummary | null {
  if (!comparison?.recommendation?.optionId) return null;
  const { recommendation, kernelGateEval, options = [] } = comparison;
  return {
    recommendedOptionId: recommendation.optionId,
    reason: recommendation.reason?.trim() || `推荐方案 ${recommendation.optionId}`,
    divergesFromLlm: kernelGateEval?.divergesFromLlmRecommendation === true,
    llmRecommendedOptionId: kernelGateEval?.llmRecommendedOptionId,
    recommendedByGate: kernelGateEval?.recommendedByGate,
    optionCount: options.length,
  };
}

export function pickTopPersonaAlert(alerts: PersonaAlert[]): DecisionStripPersonaLine | null {
  const visible = alerts.filter(isUserVisiblePersonaAlert);
  if (visible.length === 0) return null;

  const pickFrom = (pool: PersonaAlert[]) => {
    for (const persona of PERSONA_PRIORITY) {
      const match = pool.find((a) => a.persona === persona);
      if (match) return match;
    }
    return pool[0];
  };

  const warnings = visible.filter((a) => a.severity === 'warning');
  const alert = pickFrom(warnings.length > 0 ? warnings : visible);
  const personaLabel = PERSONA_LABEL[alert.persona] ?? alert.persona;
  const text = getPersonaAlertUserBody(alert);
  if (!text) return null;
  return { personaLabel, text };
}

export function resolveDecisionStripScore(
  explainOptimization: RouteRunExplainOptimization | undefined,
): number | null {
  const score = explainOptimization?.score;
  if (typeof score === 'number' && Number.isFinite(score)) {
    return Math.round(score <= 1 ? score * 100 : score);
  }
  return null;
}

export function resolveDecisionStripPrimaryCta(input: {
  guards: WorldModelGuards | null;
  compareSummary: DecisionStripCompareSummary | null;
  hasBlockGuard: boolean;
  optimizeSuggested?: { label: string } | null;
}): DecisionStripPrimaryCta {
  if (input.compareSummary) {
    return { type: 'open_plan_gate' };
  }
  if (isRouteTopologyLocked(input.guards)) {
    return { type: 'adjust_schedule' };
  }
  if (input.optimizeSuggested) {
    return { type: 'optimize', labelOverride: input.optimizeSuggested.label };
  }
  if (input.hasBlockGuard) {
    return { type: 'open_feasibility' };
  }
  return { type: 'open_assistant' };
}

export function resolveDecisionStripPresentation(input: {
  guards: WorldModelGuards | null;
  compareSummary: DecisionStripCompareSummary | null;
  personaLine: DecisionStripPersonaLine | null;
  fallbackAnswerText?: string | null;
  explainOptimization?: RouteRunExplainOptimization | undefined;
}): { headline: string | null; subline: string | null; state: DecisionStripState } {
  const bannerText = resolvePlanningBannerText(input.guards);
  const degradation = getSegmentEditorDegradation(input.guards);
  const hasBlock =
    input.guards?.segment_editor_mode === 'readonly' ||
    degradation.isTopologyLocked ||
    Boolean(bannerText?.includes('不可') || bannerText?.includes('拒绝'));

  if (input.compareSummary) {
    const headline = input.compareSummary.reason;
    const subParts: string[] = [];
    subParts.push(`推荐 ${input.compareSummary.recommendedOptionId}`);
    if (input.compareSummary.divergesFromLlm) {
      const llm = input.compareSummary.llmRecommendedOptionId;
      const gate =
        input.compareSummary.recommendedByGate ?? input.compareSummary.recommendedOptionId;
      subParts.push(
        llm ? `Kernel 门控推荐 ${gate}（LLM 原为 ${llm}）` : `Kernel 门控推荐 ${gate}`,
      );
    } else if (input.compareSummary.optionCount > 1) {
      subParts.push(`共 ${input.compareSummary.optionCount} 个方案`);
    }
    return {
      headline,
      subline: subParts.join(' · '),
      state: hasBlock ? 'blocked' : 'conclusion',
    };
  }

  if (bannerText) {
    return {
      headline: bannerText,
      subline: input.personaLine
        ? `${input.personaLine.personaLabel}：${input.personaLine.text}`
        : input.fallbackAnswerText?.trim() || null,
      state: hasBlock ? 'blocked' : 'conclusion',
    };
  }

  if (input.personaLine) {
    return {
      headline: `${input.personaLine.personaLabel}：${input.personaLine.text}`,
      subline: input.fallbackAnswerText?.trim() || null,
      state: 'conclusion',
    };
  }

  if (input.fallbackAnswerText?.trim()) {
    return {
      headline: input.fallbackAnswerText.trim(),
      subline: null,
      state: 'conclusion',
    };
  }

  return { headline: null, subline: null, state: 'idle' };
}

export function shouldHidePlanningBannerForStrip(input: {
  stripState: DecisionStripState;
  hasCompare: boolean;
  hasHeadline: boolean;
}): boolean {
  return (
    input.stripState === 'conclusion' ||
    input.stripState === 'blocked' ||
    input.hasCompare ||
    input.hasHeadline
  );
}
