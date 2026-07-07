import { optionKindLabel } from '@/dto/frontend-planning-decision-card.util';
import type { PlanningDecisionPackOption } from '@/dto/frontend-planning-decision-pack.types';
import {
  getOptionBadge,
  getOptionDisplayTitle,
  getOptionLetter,
  resolveOptionCostItems,
  resolveOptionOutcomeItems,
} from '@/dto/frontend-planning-decision-option.util';
import { buildDecisionSpaceResultLayersFromAction } from '@/lib/decision-space-result-card.util';
import { resultLayersFromPlanningOption } from '@/lib/planning-decision-pack.adapter';
import { decisionActionDisplayTitle } from '@/lib/decision-action-display.util';
import type { DecisionOption } from '@/types/decision-problem';
import type { DecisionAction } from '@/generated/unified-decision-contracts';

export type DecisionProposalCardTone = 'recommended' | 'neutral' | 'risky';
export type DecisionProposalItemTone = 'good' | 'caution' | 'risk' | 'neutral';

export interface DecisionProposalStructuredItem {
  id?: string;
  text: string;
  tone: DecisionProposalItemTone;
}

export interface DecisionProposalDataBasisView {
  id?: string;
  iconKey: string;
  label: string;
  reliability?: 'high' | 'medium' | 'low';
}

export interface DecisionProposalImpactScopeChips {
  timePointCount?: number;
  routeSegmentCount?: number;
  memberCount?: number;
  skipRouteRecalc?: boolean;
  highRisk?: boolean;
  extraLines?: string[];
}

export interface DecisionProposalOptionView {
  id: string;
  badge: string;
  letter: string;
  tone: DecisionProposalCardTone;
  recommended?: boolean;
  kindLabel?: string;
  title: string;
  description?: string;
  outcomeItems: DecisionProposalStructuredItem[];
  costItems: DecisionProposalStructuredItem[];
  dataBasis: DecisionProposalDataBasisView[];
  /** @deprecated 使用 outcomeItems / costItems / dataBasis */
  outcomes: string[];
  /** @deprecated */
  costs: string[];
  /** @deprecated 无 dataBasis 时兜底 */
  impactScope: DecisionProposalImpactScopeChips;
  disabled?: boolean;
  blockedReason?: string;
}

function toneFromOptionKind(kind: string, recommended: boolean): DecisionProposalCardTone {
  const normalized = String(kind).toUpperCase();
  if (normalized === 'ACCEPT_RISK') return 'risky';
  if (recommended) return 'recommended';
  return 'neutral';
}

function parseImpactScopeChips(
  lines: string[],
  optionKind?: string,
): DecisionProposalImpactScopeChips {
  const chips: DecisionProposalImpactScopeChips = { extraLines: [] };
  const normalized = String(optionKind ?? '').toUpperCase();

  for (const line of lines) {
    const timeMatch = line.match(/(\d+)\s*个?(时间|行程项|时间点)/);
    if (timeMatch) chips.timePointCount = Number(timeMatch[1]);

    const routeMatch = line.match(/(\d+)\s*段?(路线|路段)/);
    if (routeMatch) chips.routeSegmentCount = Number(routeMatch[1]);

    const memberMatch = line.match(/(\d+)\s*名?(成员|人)/);
    if (memberMatch) chips.memberCount = Number(memberMatch[1]);

    if (/不重算|无需重算|无路线/.test(line)) chips.skipRouteRecalc = true;
    if (/高风险|连锁延误|风险较高/.test(line)) chips.highRisk = true;

    if (!timeMatch && !routeMatch && !memberMatch) {
      chips.extraLines?.push(line);
    }
  }

  if (normalized === 'ACCEPT_RISK' && !chips.highRisk) {
    chips.highRisk = true;
  }

  return chips;
}

function dataBasisFromPackOption(option: PlanningDecisionPackOption): DecisionProposalDataBasisView[] {
  if (option.dataBasis?.length) {
    return option.dataBasis.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      iconKey: item.icon,
      label: item.label,
      ...(item.reliability ? { reliability: item.reliability } : {}),
    }));
  }
  return [];
}

export function decisionProposalViewFromPackOption(
  option: PlanningDecisionPackOption,
  index: number,
): DecisionProposalOptionView {
  const layers = resultLayersFromPlanningOption(option);
  const recommended = Boolean(option.recommended);
  const outcomeItems = resolveOptionOutcomeItems(option);
  const costItems = resolveOptionCostItems(option);
  const dataBasis = dataBasisFromPackOption(option);

  return {
    id: option.id,
    badge: getOptionBadge(option, index),
    letter: getOptionLetter(option, index),
    tone: toneFromOptionKind(option.optionKind, recommended),
    recommended,
    kindLabel: optionKindLabel(option.optionKind),
    title: getOptionDisplayTitle(option),
    description: option.description?.trim() || option.systemJudgment,
    outcomeItems,
    costItems,
    dataBasis,
    outcomes: outcomeItems.map((item) => item.text),
    costs: costItems.map((item) => item.text),
    impactScope: parseImpactScopeChips(layers.impactScope, option.optionKind),
  };
}

export function decisionProposalViewFromAction(
  action: DecisionAction,
  option: DecisionOption | null,
  index: number,
  recommended: boolean,
): DecisionProposalOptionView {
  const layers = buildDecisionSpaceResultLayersFromAction(action, option);
  const optionType = option?.type ?? action.kind;
  const letter = String.fromCharCode(65 + index);
  const outcomeItems: DecisionProposalStructuredItem[] = layers.outcomes.map((text) => ({
    text,
    tone: 'good',
  }));
  const defaultCostTone: DecisionProposalItemTone =
    String(optionType ?? '').toUpperCase() === 'ACCEPT_RISK' ? 'risk' : 'caution';
  const costItems: DecisionProposalStructuredItem[] = layers.costs.map((text) => ({
    text,
    tone: defaultCostTone,
  }));

  return {
    id: action.actionId,
    badge: `方案 ${letter}`,
    letter,
    tone: toneFromOptionKind(String(optionType ?? ''), recommended),
    recommended,
    kindLabel: option?.type ? optionKindLabel(option.type) : undefined,
    title: decisionActionDisplayTitle(action),
    description: action.summary ?? action.description ?? option?.description,
    outcomeItems,
    costItems,
    dataBasis: [],
    outcomes: outcomeItems.map((item) => item.text),
    costs: costItems.map((item) => item.text),
    impactScope: parseImpactScopeChips(layers.impactScope, optionType),
    disabled: !action.allowed,
    blockedReason: action.blockedReason,
  };
}

export function decisionProposalViewsFromActions(
  actions: DecisionAction[],
  options: DecisionOption[] = [],
): DecisionProposalOptionView[] {
  return actions.map((action, index) => {
    const matched = options.find((row) => row.id === action.actionId) ?? null;
    const recommended = index === 0;
    return decisionProposalViewFromAction(action, matched, index, recommended);
  });
}

export function resolvePackOptionActionId(option: PlanningDecisionPackOption): string {
  return option.action?.actionId?.trim() || option.id;
}

export function matchPackOptionIdForAction(
  packOptions: PlanningDecisionPackOption[],
  actionId?: string | null,
): string | null {
  if (!actionId?.trim()) return null;
  const direct = packOptions.find((option) => option.id === actionId);
  if (direct) return direct.id;
  const linked = packOptions.find((option) => option.action?.actionId === actionId);
  return linked?.id ?? null;
}

export function decisionProposalViewsFromPackOptions(
  options: PlanningDecisionPackOption[],
): DecisionProposalOptionView[] {
  return options.map(decisionProposalViewFromPackOption);
}
