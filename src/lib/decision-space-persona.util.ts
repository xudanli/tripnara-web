import { getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import { getPersonaName } from '@/lib/persona-icons';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import type { DecisionSpaceProblemTemplateKind } from '@/lib/decision-space-problem-template.util';
import type { DecisionProblemDetail, DecisionProblemSummary } from '@/types/decision-problem';
import type { PersonaAlert } from '@/types/trip';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';

export type DecisionSpaceLeadPersona = 'ABU' | 'DR_DRE' | 'NEPTUNE';

export interface DecisionSpacePersonaOneLiner {
  persona: DecisionSpaceLeadPersona;
  name: string;
  quote: string;
}

const DEFAULT_QUOTES: Record<
  DecisionSpaceProblemTemplateKind,
  Record<DecisionSpaceLeadPersona, string>
> = {
  reservation: {
    ABU: '这是硬性门控：缺预约凭证前，行程不应锁定。',
    DR_DRE: '建议把预订时段与当日节奏对齐，避免压缩前后缓冲。',
    NEPTUNE: '若改替代 POI，优先保留同类核心体验。',
  },
  daily_load: {
    ABU: '超长驾驶存在安全风险，不建议维持原方案。',
    DR_DRE: '当日负荷明显超标，拆天或减点更稳妥。',
    NEPTUNE: '结构调整时尽量保留标志性 POI。',
  },
  route: {
    ABU: '当前路段可达性不足，需修复后才能执行。',
    DR_DRE: '绕行或拆段会改变当日节奏，请对比时间代价。',
    NEPTUNE: '换路线时关注核心体验是否保留。',
  },
  weather: {
    ABU: '天气/安全条件允许前，不建议按原计划进入。',
    DR_DRE: '改期或替换活动可减轻当日强度波动。',
    NEPTUNE: '备选活动应匹配团队预期体验。',
  },
  generic: {
    ABU: '请先确认该决策不会引入新的安全或合规风险。',
    DR_DRE: '关注方案对整体节奏与体力分配的影响。',
    NEPTUNE: '对比各选项对核心体验保留程度的差异。',
  },
};

const LEAD_PERSONA_BY_TEMPLATE: Record<
  DecisionSpaceProblemTemplateKind,
  DecisionSpaceLeadPersona
> = {
  reservation: 'ABU',
  daily_load: 'DR_DRE',
  route: 'ABU',
  weather: 'ABU',
  generic: 'ABU',
};

function filterAlertsForProblem(
  alerts: PersonaAlert[],
  problem?: DecisionProblemSummary | null,
): PersonaAlert[] {
  if (!problem || alerts.length <= 3) return alerts;

  const titleNeedle = problem.title.trim().toLowerCase().slice(0, 8);
  const days = new Set(problem.affectedDayNumbers ?? []);

  const scored = alerts.map((alert) => {
    const body = (getPersonaAlertUserBody(alert) ?? alert.title ?? '').toLowerCase();
    let score = 0;
    if (titleNeedle && body.includes(titleNeedle)) score += 2;
    for (const day of days) {
      if (body.includes(`第${day}天`) || body.includes(`day ${day}`)) score += 1;
    }
    return { alert, score };
  });

  const best = scored.filter((row) => row.score > 0).sort((a, b) => b.score - a.score);
  if (best.length > 0) return best.map((row) => row.alert);
  return alerts;
}

function personaFromLabel(label: string | undefined | null): DecisionSpaceLeadPersona | null {
  const normalized = label?.trim().toUpperCase() ?? '';
  if (normalized.includes('DR') && normalized.includes('DRE')) return 'DR_DRE';
  if (normalized.includes('NEPTUNE')) return 'NEPTUNE';
  if (normalized.includes('ABU')) return 'ABU';
  return null;
}

/** P2 · 决策空间主视角三人格一句话 */
export function resolveDecisionSpacePersonaOneLiner(input: {
  templateKind: DecisionSpaceProblemTemplateKind;
  problem?: DecisionProblemSummary | null;
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  personaAlerts?: PersonaAlert[];
  primaryEnforcement?: string | null;
}): DecisionSpacePersonaOneLiner {
  const lead =
    personaFromLabel(input.detail?.personaLabel ?? input.problem?.personaLabel) ??
    (input.primaryEnforcement === 'BLOCK' && input.templateKind === 'reservation'
      ? 'ABU'
      : LEAD_PERSONA_BY_TEMPLATE[input.templateKind]);

  const alerts = filterAlertsForProblem(
    resolveTripPersonaAlerts(input.personaAlerts ?? []),
    input.problem,
  );
  const leadAlert = alerts.find((alert) => alert.persona === lead) ?? alerts[0];
  const effectivePersona = (leadAlert?.persona ?? lead) as DecisionSpaceLeadPersona;
  const quote =
    (leadAlert ? getPersonaAlertUserBody(leadAlert) : null)?.trim() ||
    DEFAULT_QUOTES[input.templateKind][effectivePersona] ||
    DEFAULT_QUOTES[input.templateKind][lead];

  return {
    persona: effectivePersona,
    name: getPersonaName(effectivePersona),
    quote,
  };
}
