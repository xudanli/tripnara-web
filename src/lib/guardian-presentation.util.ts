import type {
  GuardianAction,
  GuardianActionSlot,
  GuardianPersonaPresentation,
  LeadSpeakerScenario,
} from '@/types/guardian-presentation';
import type {
  NegotiationDecision,
  NegotiationResponse,
  TeamNegotiationResponse,
} from '@/types/optimization-v2';

export interface GuardianChooseContext {
  presentation?: GuardianPersonaPresentation;
  humanDecisionPoints?: string[];
  humanDecisionPointsFlat?: string[];
  consolidatedDecision?: { nextSteps?: string[] };
  negotiation?: Pick<
    NegotiationResponse,
    'humanDecisionPoints' | 'hardConstraintBlocked' | 'decision'
  >;
  teamNegotiation?: Pick<
    TeamNegotiationResponse,
    'humanDecisionPointsFlat' | 'hardConstraintBlocked' | 'decision'
  >;
  hardConstraintBlocked?: boolean;
}

const HARD_BLOCK_SCENARIOS: LeadSpeakerScenario[] = ['SAFETY_BLOCK'];

/** 硬约束/安全阻断类文案（negotiation / team negotiation 兜底判定） */
export const HARD_CONSTRAINT_CONCERN_PATTERN =
  /封路|合规|硬约束|不可忽略|阻断|hard.?constraint|BLOCK/i;

function matchesHardConstraintText(text: string): boolean {
  return HARD_CONSTRAINT_CONCERN_PATTERN.test(text);
}

const ACTION_SLOT_ORDER: GuardianActionSlot[] = ['abu', 'dre', 'neptune', 'user'];

const SLOT_LABEL_ZH: Record<GuardianActionSlot, string> = {
  abu: 'Abu',
  dre: 'Dr.Dre',
  neptune: 'Neptune',
  user: '您',
};

export const GUARDIAN_ACTION_LABEL_ZH: Record<GuardianAction, string> = {
  BLOCK: '阻止继续',
  ADJUST: '调整节奏',
  REPAIR: '替代修复',
  CHOOSE: '需要您选择',
};

export const GUARDIAN_SCENARIO_LABEL_ZH: Record<LeadSpeakerScenario, string> = {
  SAFETY_BLOCK: '安全阻断',
  SAFETY_WARN: '安全提醒',
  PACE_COST: '节奏与体力',
  INTENT_REPAIR: '意图修复',
  MULTI_FACTOR: '综合权衡',
  ALL_CLEAR: '评估通过',
};

function isPresentation(value: unknown): value is GuardianPersonaPresentation {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.headline === 'string' &&
    typeof o.narrative === 'string' &&
    typeof o.leadSpeaker === 'string' &&
    typeof o.displayStyle === 'string'
  );
}

function readPresentationFromRecord(
  record: Record<string, unknown> | null | undefined,
): GuardianPersonaPresentation | undefined {
  if (!record) return undefined;
  const raw = record.presentation ?? record.guardianPresentation;
  return isPresentation(raw) ? raw : undefined;
}

/**
 * 从 planning workbench / planning assistant / trip planner 响应中抽取单主角 presentation。
 *
 * 优先级（与 workbench 一致）：
 * 1. personaEvaluation.presentation（Planning Assistant）
 * 2. uiOutput.presentation / uiOutput.personas.presentation
 * 3. guardianPresentation（Trip Planner 等）
 */
export function extractGuardianPresentation(
  res: unknown,
): GuardianPersonaPresentation | undefined {
  if (!res || typeof res !== 'object') return undefined;
  const root = res as Record<string, unknown>;

  const personaEvaluation = root.personaEvaluation;
  if (personaEvaluation && typeof personaEvaluation === 'object') {
    const pe = personaEvaluation as Record<string, unknown>;
    const fromShell = readPresentationFromRecord(pe);
    if (fromShell) return fromShell;

    const uiOutput = pe.uiOutput as Record<string, unknown> | undefined;
    const fromUi = readPresentationFromRecord(uiOutput);
    if (fromUi) return fromUi;

    const personas = uiOutput?.personas ?? pe.personas;
    if (personas && typeof personas === 'object') {
      const fromPersonas = readPresentationFromRecord(
        personas as Record<string, unknown>,
      );
      if (fromPersonas) return fromPersonas;
    }
  }

  const data = root.data as Record<string, unknown> | undefined;
  const candidates: unknown[] = [root.workbenchResponse, data, root];

  for (const node of candidates) {
    if (!node || typeof node !== 'object') continue;
    const n = node as Record<string, unknown>;

    const direct = readPresentationFromRecord(n);
    if (direct) return direct;

    const workbench = n.workbenchResponse as Record<string, unknown> | undefined;
    const wbData = workbench?.data as Record<string, unknown> | undefined;
    const uiOutput =
      (n.uiOutput as Record<string, unknown> | undefined) ??
      (wbData?.uiOutput as Record<string, unknown> | undefined);

    const fromUi = readPresentationFromRecord(uiOutput);
    if (fromUi) return fromUi;

    const personas = uiOutput?.personas;
    if (personas && typeof personas === 'object') {
      const fromPersonas = readPresentationFromRecord(
        personas as Record<string, unknown>,
      );
      if (fromPersonas) return fromPersonas;
    }
  }

  return readPresentationFromRecord(root);
}

/**
 * 场景 2 — Planning Assistant 对话
 * `POST /api/agent/planning-assistant/chat` 响应直读 `personaEvaluation.presentation`
 *（{@link PersonaShellOutput}，与 workbench `uiOutput.presentation` 同型）。
 */
export function extractPlanningAssistantPresentation(
  res: unknown,
): GuardianPersonaPresentation | undefined {
  if (!res || typeof res !== 'object') return undefined;
  const pe = (res as Record<string, unknown>).personaEvaluation;
  if (pe && typeof pe === 'object') {
    const fromShell = readPresentationFromRecord(pe as Record<string, unknown>);
    if (fromShell) return fromShell;
  }
  return extractGuardianPresentation(res);
}

export function isHardConstraintBlock(
  presentation: GuardianPersonaPresentation,
): boolean {
  if (presentation.hardConstraintBlocked === true) return true;
  if (HARD_BLOCK_SCENARIOS.includes(presentation.scenario)) return true;
  const existence = presentation.structuredStatus?.abu?.existence;
  return existence === 'BLOCK' || presentation.actions.abu === 'BLOCK';
}

/** negotiation 硬约束：hardConstraintBlocked / REJECT 优先，关键词仅兜底 */
export function isNegotiationHardBlocked(result: NegotiationResponse): boolean {
  if (result.hardConstraintBlocked === true) return true;
  if (result.decision === 'REJECT') return true;
  if (result.hardConstraintBlocked === false) return false;
  const concerns = result.evaluationSummary?.criticalConcerns ?? [];
  if (concerns.length === 0) return false;
  return concerns.some((c) => matchesHardConstraintText(c));
}

/** 团队协商关键风险摘要：evaluationSummary 优先，成员/冲突仅兜底 */
export function collectTeamNegotiationCriticalConcerns(
  result: TeamNegotiationResponse,
): string[] {
  const fromSummary = result.evaluationSummary?.criticalConcerns ?? [];
  if (fromSummary.length > 0) return [...new Set(fromSummary)];

  const items: string[] = [];

  if (result.decision === 'REJECT') {
    items.push('团队协商未通过，方案存在需修改的重大问题');
  }
  if (result.teamConstraintsSatisfied === false) {
    items.push('团队最弱链约束未满足，存在不可妥协的硬限制');
  }

  for (const member of result.memberEvaluations ?? []) {
    for (const concern of member.concerns ?? []) {
      if (matchesHardConstraintText(concern)) items.push(concern);
    }
  }

  for (const conflict of result.conflicts ?? []) {
    if (matchesHardConstraintText(conflict.description)) {
      items.push(conflict.description);
    }
  }

  return [...new Set(items)];
}

/** 团队协商硬约束：hardConstraintBlocked / REJECT / 最弱链 / 关键词兜底 */
export function isTeamNegotiationHardBlocked(
  result: TeamNegotiationResponse,
): boolean {
  if (result.hardConstraintBlocked === true) return true;
  if (result.decision === 'REJECT') return true;
  if (result.teamConstraintsSatisfied === false) return true;
  if (result.hardConstraintBlocked === false) return false;
  return collectTeamNegotiationCriticalConcerns(result).some((c) =>
    matchesHardConstraintText(c),
  );
}

/**
 * CHOOSE 选项列表（全场景统一优先级）。
 * humanDecisionPoints → humanDecisionPointsFlat → nextSteps → supportingLines
 */
export function extractChooseOptions(ctx: GuardianChooseContext): string[] {
  const fromNegotiation = ctx.negotiation?.humanDecisionPoints;
  const fromTeam = ctx.teamNegotiation?.humanDecisionPointsFlat;
  const fromNextSteps = ctx.consolidatedDecision?.nextSteps;
  const fromSupporting =
    ctx.presentation?.actions.user === 'CHOOSE'
      ? ctx.presentation.supportingLines
          .map((line) => line.text.trim())
          .filter(Boolean)
      : undefined;

  const raw =
    ctx.humanDecisionPoints ??
    ctx.humanDecisionPointsFlat ??
    fromNegotiation ??
    fromTeam ??
    fromNextSteps ??
    fromSupporting ??
    [];

  return [...new Set(raw.map((s) => s.trim()).filter(Boolean))];
}

export function resolveNegotiationHardBlocked(
  result: NegotiationResponse,
  presentation?: GuardianPersonaPresentation,
): boolean {
  if (presentation && isHardConstraintBlock(presentation)) return true;
  return isNegotiationHardBlocked(result);
}

export function resolveTeamNegotiationHardBlocked(
  result: TeamNegotiationResponse,
): boolean {
  return isTeamNegotiationHardBlocked(result);
}

/** 是否应展示 CHOOSE（硬约束时一律 false） */
export function canShowGuardianChoose(opts: {
  presentation?: GuardianPersonaPresentation;
  decision?: NegotiationDecision;
  hardConstraintBlocked?: boolean;
  chooseOptions?: string[];
}): boolean {
  if (opts.hardConstraintBlocked === true) return false;
  if (opts.presentation && isHardConstraintBlock(opts.presentation)) return false;

  const hasChooseAction = opts.presentation?.actions.user === 'CHOOSE';
  const needsHuman = opts.decision === 'NEEDS_HUMAN';
  const hasOptions = (opts.chooseOptions?.length ?? 0) > 0;

  return (hasChooseAction || needsHuman) && hasOptions;
}

export function formatRevalidationPassLabel(
  pass: 'POST_NEPTUNE_REPAIR',
): string {
  if (pass === 'POST_NEPTUNE_REPAIR') return '修复后复核';
  return pass;
}

export function formatGuardianActionsSummary(
  actions: Partial<Record<GuardianActionSlot, GuardianAction>>,
): string {
  return ACTION_SLOT_ORDER.flatMap((slot) => {
    const action = actions[slot];
    if (!action) return [];
    return [`${SLOT_LABEL_ZH[slot]}·${GUARDIAN_ACTION_LABEL_ZH[action]}`];
  }).join(' · ');
}

export function shouldShowPersonaInsightCards(
  presentation: GuardianPersonaPresentation | undefined,
): boolean {
  if (!presentation) return true;
  return presentation.mode === 'decision_committee';
}

export function guardianBriefLines(
  presentation: GuardianPersonaPresentation,
): string[] {
  if (presentation.briefLines && presentation.briefLines.length > 0) {
    return presentation.briefLines;
  }
  if (presentation.narrative.trim()) {
    return presentation.narrative.split('\n').filter(Boolean);
  }
  return [presentation.headline];
}

/** @deprecated 优先 {@link extractChooseOptions} */
export function resolveGuardianChoosePoints(
  presentation: GuardianPersonaPresentation,
  fallback?: string[],
): string[] | undefined {
  if (presentation.actions.user !== 'CHOOSE' && !fallback?.length) return undefined;
  const options = extractChooseOptions({
    presentation,
    consolidatedDecision: fallback?.length ? { nextSteps: fallback } : undefined,
  });
  if (options.length > 0) return options;
  return presentation.actions.user === 'CHOOSE' ? [presentation.headline] : undefined;
}
