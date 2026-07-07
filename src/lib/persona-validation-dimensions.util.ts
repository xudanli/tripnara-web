import { getPersonaAlertUserBody } from '@/lib/persona-alert-display';
import { resolveTripPersonaAlerts } from '@/lib/resolve-trip-persona-alerts';
import {
  pickPrimaryTradeoffRow,
  resolveTradeoffRowSummary,
} from '@/lib/tradeoff-display.util';
import type { DecisionOption, DecisionTradeoffRow, TradeoffDimension } from '@/types/decision-problem';
import type { PersonaAlert } from '@/types/trip';
import type { Rfc001EvaluateCandidateView } from '@/types/unified-decision';

export type PersonaValidationDimensionKey = 'feasibility' | 'pace' | 'experience';

export type PersonaValidationStance = 'ok' | 'adjust' | 'oppose';

export interface PersonaValidationDimension {
  key: PersonaValidationDimensionKey;
  label: string;
  persona: 'ABU' | 'DR_DRE' | 'NEPTUNE';
  officerRole: string;
  stance: PersonaValidationStance;
  stanceLabel: string;
  summary: string;
  alert?: PersonaAlert;
}

const PERSONA_TO_DIMENSION: Record<
  PersonaValidationDimension['persona'],
  PersonaValidationDimensionKey
> = {
  ABU: 'feasibility',
  DR_DRE: 'pace',
  NEPTUNE: 'experience',
};

const DIMENSION_META: Record<
  PersonaValidationDimensionKey,
  { label: string; persona: PersonaValidationDimension['persona']; officerRole: string }
> = {
  feasibility: { label: '可行性', persona: 'ABU', officerRole: '安全官' },
  pace: { label: '节奏', persona: 'DR_DRE', officerRole: '节奏官' },
  experience: { label: '体验保留', persona: 'NEPTUNE', officerRole: '方案官' },
};

const STANCE_LABELS: Record<PersonaValidationStance, string> = {
  ok: '可接受',
  adjust: '建议调整',
  oppose: '需关注',
};

function resolveStance(alert: PersonaAlert | undefined): PersonaValidationStance {
  if (!alert) return 'ok';
  if (alert.severity === 'warning') return 'oppose';
  if (alert.severity === 'info') return 'adjust';
  return 'ok';
}

function defaultSummary(
  stance: PersonaValidationStance,
  selectedOptionLetter: string,
): string {
  if (stance === 'oppose') {
    return `对方案 ${selectedOptionLetter} 仍有保留意见，建议查看 tradeoffs。`;
  }
  if (stance === 'adjust') {
    return `方案 ${selectedOptionLetter} 可考虑，但建议关注体验与节奏平衡。`;
  }
  return `方案 ${selectedOptionLetter} 在当前约束下整体可接受。`;
}

export function buildPersonaValidationDimensions(
  personaAlerts: PersonaAlert[] | undefined,
  selectedOptionLetter = 'A',
): PersonaValidationDimension[] {
  const alerts = resolveTripPersonaAlerts(personaAlerts ?? []);
  const byPersona = new Map(alerts.map((alert) => [alert.persona, alert]));

  return (Object.keys(DIMENSION_META) as PersonaValidationDimensionKey[]).map((key) => {
    const meta = DIMENSION_META[key];
    const alert = byPersona.get(meta.persona);
    const tradeoffRows =
      alert?.metadata?.tradeoffDimensions?.filter(
        (row) => TRADEOFF_TO_DIMENSION[row.dimension as TradeoffDimension] === key,
      ) ?? [];
    const primaryTradeoff = pickPrimaryTradeoffRow(tradeoffRows);
    const tradeoffSummary = primaryTradeoff
      ? resolveTradeoffRowSummary(primaryTradeoff)
      : null;

    const stance = primaryTradeoff
      ? stanceFromTradeoff(primaryTradeoff as DecisionTradeoffRow)
      : resolveStance(alert);
    const summary =
      tradeoffSummary ??
      (alert?.metadata?.tradeoffDimensions?.length
        ? defaultSummary(stance, selectedOptionLetter)
        : null) ??
      (alert ? getPersonaAlertUserBody(alert) : null) ??
      defaultSummary(stance, selectedOptionLetter);

    return {
      key,
      label: meta.label,
      persona: meta.persona,
      officerRole: meta.officerRole,
      stance,
      stanceLabel: STANCE_LABELS[stance],
      summary,
      alert,
    };
  });
}

const TRADEOFF_TO_DIMENSION: Partial<
  Record<TradeoffDimension, PersonaValidationDimensionKey>
> = {
  SAFETY: 'feasibility',
  FLEXIBILITY: 'feasibility',
  FATIGUE: 'pace',
  TIME: 'pace',
  POI_COVERAGE: 'experience',
  COMFORT: 'experience',
};

function stanceFromTradeoff(row: DecisionTradeoffRow | undefined): PersonaValidationStance {
  if (!row) return 'ok';
  if (row.direction === 'WORSEN') return 'oppose';
  if (row.direction === 'IMPROVE') return 'ok';
  return 'adjust';
}

function summaryFromTradeoff(
  row: DecisionTradeoffRow | undefined,
  label: string,
  optionLetter: string,
): string {
  const narrative = resolveTradeoffRowSummary(row);
  if (narrative) return narrative;
  if (!row) return `方案 ${optionLetter} 暂无${label}验证数据。`;
  if (row.direction === 'WORSEN') {
    return `方案 ${optionLetter} 在${label}维度存在风险，未被推荐。`;
  }
  if (row.direction === 'IMPROVE') {
    return `方案 ${optionLetter} 在${label}维度表现更优。`;
  }
  return `方案 ${optionLetter} 在${label}维度可接受。`;
}

/** 从候选 tradeoffs 投影验证维度（优先于 trip 级 personaAlerts） */
export function buildPersonaValidationDimensionsFromOption(
  option: DecisionOption | null | undefined,
  selectedOptionLetter = 'A',
): PersonaValidationDimension[] {
  const tradeoffs = option?.tradeoffs ?? [];
  const byDimension = new Map<PersonaValidationDimensionKey, DecisionTradeoffRow>();

  for (const row of tradeoffs) {
    const key = TRADEOFF_TO_DIMENSION[row.dimension];
    if (!key) continue;
    const existing = byDimension.get(key);
    if (!existing || row.direction === 'WORSEN') {
      byDimension.set(key, row);
    }
  }

  return (Object.keys(DIMENSION_META) as PersonaValidationDimensionKey[]).map((key) => {
    const meta = DIMENSION_META[key];
    const row = byDimension.get(key);
    const stance = stanceFromTradeoff(row);
    return {
      key,
      label: meta.label,
      persona: meta.persona,
      officerRole: meta.officerRole,
      stance,
      stanceLabel: STANCE_LABELS[stance],
      summary: summaryFromTradeoff(row, meta.label, selectedOptionLetter),
    };
  });
}

function verdictToStance(verdict: string | undefined): PersonaValidationStance {
  const normalized = String(verdict ?? '').trim().toUpperCase();
  if (normalized === 'BLOCK' || normalized === 'REJECT' || normalized === 'FAIL') return 'oppose';
  if (normalized === 'WARNING' || normalized === 'ADJUST' || normalized === 'WARN') return 'adjust';
  return 'ok';
}

/** POST evaluate candidates[] → 验证维度（优先于 trip personaAlerts） */
export function buildPersonaValidationFromEvaluateCandidate(
  candidate: Rfc001EvaluateCandidateView | undefined,
  optionLetter = 'A',
): PersonaValidationDimension[] | null {
  if (!candidate) return null;

  const feasibilityStance =
    candidate.blocked === true
      ? 'oppose'
      : verdictToStance(candidate.abuVerdict);
  const paceStance = verdictToStance(candidate.dreVerdict);
  const experienceStance =
    candidate.utility != null && candidate.utility >= 0.15
      ? 'ok'
      : candidate.utility != null && candidate.utility < 0.05
        ? 'adjust'
        : verdictToStance(candidate.neptuneVerdict);

  const build = (
    key: PersonaValidationDimensionKey,
    stance: PersonaValidationStance,
    summary: string,
  ): PersonaValidationDimension => {
    const meta = DIMENSION_META[key];
    return {
      key,
      label: meta.label,
      persona: meta.persona,
      officerRole: meta.officerRole,
      stance,
      stanceLabel: STANCE_LABELS[stance],
      summary,
    };
  };

  const utilityPct =
    candidate.utility != null ? `${Math.round(candidate.utility * 100)}%` : null;

  return [
    build(
      'feasibility',
      feasibilityStance,
      candidate.blocked
        ? `方案 ${optionLetter} 未通过可行性验证（Abu：${candidate.abuVerdict ?? 'BLOCK'}）`
        : candidate.abuVerdict
          ? `Abu：${candidate.abuVerdict}`
          : `方案 ${optionLetter} 可行性可接受`,
    ),
    build(
      'pace',
      paceStance,
      candidate.dreVerdict
        ? `Dr.Dre：${candidate.dreVerdict}`
        : `方案 ${optionLetter} 节奏在可接受范围`,
    ),
    build(
      'experience',
      experienceStance,
      candidate.neptuneVerdict
        ? `Neptune：${candidate.neptuneVerdict}`
        : utilityPct
          ? `Decision Core 效用 ${utilityPct}`
          : `方案 ${optionLetter} 体验保留待确认`,
    ),
  ];
}
