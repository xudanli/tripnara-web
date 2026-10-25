import { getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import {
  buildPersonaValidationDimensions,
  buildPersonaValidationDimensionsFromOption,
  type PersonaValidationDimension,
} from '@/lib/persona-validation-dimensions.util';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import type { DecisionOption, DecisionProblemSummary } from '@/types/decision-problem';
import type { PersonaAlert } from '@/types/trip';

export type DecisionProfessionalReviewProblem = Pick<
  DecisionProblemSummary,
  'id' | 'title' | 'affectedDayNumbers' | 'semanticKey' | 'decisionCase'
>;

function extractDayMentions(text: string): number[] {
  const days = new Set<number>();
  for (const match of text.matchAll(/第\s*(\d+)\s*天/g)) {
    days.add(Number(match[1]));
  }
  for (const match of text.matchAll(/\b(?:day|Day)\s*(\d+)\b/g)) {
    days.add(Number(match[1]));
  }
  return [...days];
}

/**
 * 决策空间「AI 专业审查」：只保留与当前 DecisionProblem 相关的 trip personaAlerts。
 * 不相关（如 Day 5 安全告警挂在 Day 1 冰川案上）一律丢弃，禁止全量回退。
 */
export function filterPersonaAlertsForDecisionProblem(
  alerts: PersonaAlert[],
  problem?: DecisionProfessionalReviewProblem | null,
): PersonaAlert[] {
  if (!alerts.length || !problem) return [];

  const problemDays = new Set(
    (problem.affectedDayNumbers ?? []).filter((day) => Number.isFinite(day) && day > 0),
  );
  const title = problem.title?.trim().toLowerCase() ?? '';
  const titleNeedle = title.slice(0, 10);
  const idNeedle = problem.id?.trim().toLowerCase() ?? '';

  const scored = alerts.map((alert) => {
    const body = `${alert.title ?? ''} ${getPersonaAlertUserBody(alert) ?? ''}`.toLowerCase();
    const deepLinkDay = alert.metadata?.deepLink?.dayIndex;
    const bodyDays = extractDayMentions(body);
    if (deepLinkDay != null && deepLinkDay > 0) bodyDays.push(deepLinkDay);

    let score = 0;

    if (idNeedle && (body.includes(idNeedle) || alert.id?.toLowerCase().includes(idNeedle))) {
      score += 4;
    }

    if (titleNeedle.length >= 4 && body.includes(titleNeedle)) {
      score += 3;
    }

    const overlappingDays = bodyDays.filter((day) => problemDays.has(day));
    if (overlappingDays.length > 0) {
      score += 3;
    } else if (bodyDays.length > 0) {
      // 正文/深链明确指向其他天 → 与本案无关
      score -= 6;
    }

    return { alert, score };
  });

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((row) => row.alert);
}

/**
 * 优先方案 tradeoffs；否则仅用本案相关 personaAlerts。
 * 两者皆无 → 空数组（UI 不展示错位的 trip 级审查）。
 */
export function buildDecisionProfessionalReviewDimensions(input: {
  selectedOption?: DecisionOption | null;
  selectedOptionLetter?: string;
  personaAlerts?: PersonaAlert[];
  problem?: DecisionProfessionalReviewProblem | null;
}): PersonaValidationDimension[] {
  const letter = input.selectedOptionLetter ?? 'A';
  if (input.selectedOption?.tradeoffs?.length) {
    return buildPersonaValidationDimensionsFromOption(input.selectedOption, letter);
  }

  const scoped = filterPersonaAlertsForDecisionProblem(
    resolveTripPersonaAlerts(input.personaAlerts ?? []),
    input.problem,
  );
  if (!scoped.length) return [];

  return buildPersonaValidationDimensions(scoped, letter);
}
