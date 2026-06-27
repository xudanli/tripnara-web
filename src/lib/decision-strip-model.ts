import type { OptionComparison } from '@/api/planning-workbench';
import {
  getSegmentEditorDegradation,
  isRouteTopologyLocked,
  canRunRouteRecalculation,
  resolvePlanningBannerText,
} from '@/lib/world-model-guards';
import {
  formatPersonaAlertReasonSummary,
  getPersonaAlertSupportingPreview,
  getPersonaAlertUserBody,
  getPersonaAlertUserTitle,
  isPersonaAlertHardBlocked,
  isUserVisiblePersonaAlert,
} from '@/lib/persona-alert-display';
import type { PersonaAlert, PersonaAlertDeepLink } from '@/types/trip';
import type { WorldModelGuards } from '@/types/world-model-guards';
import type { RouteRunExplainOptimization } from '@/types/world-model-guards';

export type DecisionStripState = 'idle' | 'running' | 'conclusion' | 'blocked' | 'error';

export type DecisionStripCtaType =
  | 'open_assistant'
  | 'open_plan_gate'
  | 'adjust_schedule'
  | 'open_feasibility'
  | 'optimize'
  | 'confirm_continue'
  | 'open_negotiation'
  | 'open_budget'
  | 'open_conflicts'
  | 'confirm_regret'
  | 'open_team';

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
  | 'confirmContinue'
  | 'openNegotiation'
  | 'viewProgress'
  | 'openBudget'
  | 'openConflicts'
  | 'confirmRegret'
  | 'openTeam';

export const DECISION_STRIP_CTA_LABEL_KEY: Record<DecisionStripCtaType, DecisionStripCtaLabelKey> = {
  open_assistant: 'openAssistant',
  open_plan_gate: 'openPlanGate',
  adjust_schedule: 'adjustSchedule',
  open_feasibility: 'openFeasibility',
  optimize: 'optimize',
  confirm_continue: 'confirmContinue',
  open_negotiation: 'openNegotiation',
  open_budget: 'openBudget',
  open_conflicts: 'openConflicts',
  confirm_regret: 'confirmRegret',
  open_team: 'openTeam',
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

export type DecisionStripPersonaPresentationMode = 'single_lead' | 'committee';

export interface DecisionStripPersonaResolution {
  line: DecisionStripPersonaLine | null;
  mode: DecisionStripPersonaPresentationMode | null;
  /** single_lead 时 BFF presentation.headline */
  leadHeadline?: string;
}

function resolveLeadSpeakerLabel(leadSpeaker?: string, fallbackPersona?: string): string {
  if (leadSpeaker === 'DR_DRE') return 'Dr.Dre';
  if (leadSpeaker === 'NEPTUNE') return 'Neptune';
  if (leadSpeaker === 'ABU') return 'Abu';
  if (fallbackPersona && PERSONA_LABEL[fallbackPersona]) return PERSONA_LABEL[fallbackPersona];
  return fallbackPersona ?? '守护者';
}

/** BFF `presentation.mode=single_lead` 时合并为单条主角摘要；否则走 committee 优先级 */
export function resolveDecisionStripPersonaLine(
  alerts: PersonaAlert[],
): DecisionStripPersonaResolution {
  const visible = alerts.filter(isUserVisiblePersonaAlert);
  if (visible.length === 0) return { line: null, mode: null };

  const singleLeadAlert = visible.find((alert) => alert.presentation?.mode === 'single_lead');
  if (singleLeadAlert?.presentation) {
    const presentation = singleLeadAlert.presentation;
    const personaLabel = resolveLeadSpeakerLabel(
      presentation.leadSpeaker,
      singleLeadAlert.persona,
    );
    const leadHeadline =
      presentation.headline?.trim() || getPersonaAlertUserTitle(singleLeadAlert);
    const text = getPersonaAlertUserBody(singleLeadAlert) || leadHeadline;
    if (!text.trim()) return { line: null, mode: null };
    return {
      line: { personaLabel, text },
      mode: 'single_lead',
      leadHeadline,
    };
  }

  const line = pickTopPersonaAlert(alerts);
  return { line, mode: line ? 'committee' : null };
}

export type GuardianDigestPersona = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export type GuardianDigestItem = {
  id: string;
  persona: GuardianDigestPersona;
  title: string;
  body: string;
  reasonSummary?: string;
  deepLink?: PersonaAlertDeepLink;
  hardConstraintBlocked?: boolean;
  supportingPreview?: string;
};

const GUARDIAN_DIGEST_PERSONAS = new Set<GuardianDigestPersona>(['ABU', 'DR_DRE', 'NEPTUNE']);

const ALERT_SEVERITY_ORDER: Record<PersonaAlert['severity'], number> = {
  warning: 0,
  info: 1,
  success: 2,
};

/** 时间轴侧栏：最多 N 条三人格提醒（每人格一条，warning 优先） */
export function pickGuardianDigestAlerts(
  alerts: PersonaAlert[],
  limit = 3,
): GuardianDigestItem[] {
  const visible = alerts.filter(
    (alert) =>
      isUserVisiblePersonaAlert(alert) &&
      alert.severity !== 'success' &&
      GUARDIAN_DIGEST_PERSONAS.has(alert.persona as GuardianDigestPersona),
  );

  const sorted = [...visible].sort((a, b) => {
    const severityDelta = ALERT_SEVERITY_ORDER[a.severity] - ALERT_SEVERITY_ORDER[b.severity];
    if (severityDelta !== 0) return severityDelta;
    return PERSONA_PRIORITY.indexOf(a.persona) - PERSONA_PRIORITY.indexOf(b.persona);
  });

  const seenPersonas = new Set<GuardianDigestPersona>();
  const items: GuardianDigestItem[] = [];

  for (const alert of sorted) {
    const persona = alert.persona as GuardianDigestPersona;
    if (seenPersonas.has(persona)) continue;
    const body = getPersonaAlertUserBody(alert);
    if (!body.trim()) continue;
    seenPersonas.add(persona);
    items.push({
      id: alert.id,
      persona,
      title: getPersonaAlertUserTitle(alert),
      body,
      reasonSummary: formatPersonaAlertReasonSummary(alert) || undefined,
      deepLink: alert.metadata?.deepLink,
      hardConstraintBlocked: isPersonaAlertHardBlocked(alert) || undefined,
      supportingPreview: getPersonaAlertSupportingPreview(alert) || undefined,
    });
    if (items.length >= limit) break;
  }

  return items;
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
  needConfirmation?: { approvalId: string; summary?: string } | null;
  needNegotiation?: { negotiationSessionId: string; impact?: string; reason?: string } | null;
}): DecisionStripPrimaryCta {
  if (input.compareSummary) {
    return { type: 'open_plan_gate' };
  }
  if (input.needConfirmation?.approvalId) {
    return { type: 'confirm_continue' };
  }
  if (input.needNegotiation?.negotiationSessionId) {
    return { type: 'open_negotiation' };
  }
  if (isRouteTopologyLocked(input.guards)) {
    return { type: 'adjust_schedule' };
  }
  if (input.optimizeSuggested && canRunRouteRecalculation(input.guards)) {
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

export function resolveDecisionStripNeedConfirmationPresentation(input: {
  summary?: string;
  skillName?: string;
}): { headline: string; subline: string; state: DecisionStripState } {
  const headline =
    input.summary?.trim() ||
    (input.skillName?.trim() ? `需要确认：${input.skillName.trim()}` : '需要你的确认才能继续');
  return {
    headline,
    subline: '请确认或拒绝后继续规划',
    state: 'blocked',
  };
}

export function resolveDecisionStripNegotiationPresentation(input: {
  impact?: string;
  reason?: string;
  recommendationSummary?: string;
}): { headline: string; subline: string; state: DecisionStripState } {
  const headline =
    input.impact?.trim() ||
    input.reason?.trim() ||
    '需要你选择一个调整方案';
  const subline =
    input.recommendationSummary?.trim() ||
    '请在弹窗中对比方案并确认';
  return {
    headline,
    subline,
    state: 'blocked',
  };
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
