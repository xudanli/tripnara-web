import type {
  CascadeAffectedItem,
  CascadeCausalPreAnalysis,
  CascadeCausalPreAnalysisSummary,
  CascadeImpactAlgebra,
  CascadeRecommendation,
  CascadeRiskLevel,
  CascadeUiHint,
} from '@/types/readiness-cascade';

export const CASCADE_RECOMMENDATION_LABEL_ZH: Record<CascadeRecommendation, string> = {
  AVOID: '建议避开',
  ADJUST: '建议调整',
  DELAY: '建议延后',
  REPLACE: '建议替换',
  ASK_USER: '需您确认',
};

export const CASCADE_RECOMMENDATION_LABEL_EN: Record<CascadeRecommendation, string> = {
  AVOID: 'Avoid',
  ADJUST: 'Adjust',
  DELAY: 'Delay',
  REPLACE: 'Replace',
  ASK_USER: 'Your confirmation',
};

export const CASCADE_RISK_LEVEL_ORDER: Record<CascadeRiskLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const VALID_RISK_LEVELS = new Set<CascadeRiskLevel>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const VALID_RECOMMENDATIONS = new Set<CascadeRecommendation>([
  'AVOID',
  'ADJUST',
  'DELAY',
  'REPLACE',
  'ASK_USER',
]);

export function getCascadeRecommendationLabel(
  recommendation: CascadeRecommendation,
  isZh: boolean
): string {
  return isZh
    ? CASCADE_RECOMMENDATION_LABEL_ZH[recommendation]
    : CASCADE_RECOMMENDATION_LABEL_EN[recommendation];
}

export function getCascadeRiskLevelStyles(level: CascadeRiskLevel): {
  badge: string;
  border: string;
  dot: string;
} {
  switch (level) {
    case 'CRITICAL':
      return {
        badge: 'bg-red-100 text-red-800 border-red-200',
        border: 'border-l-red-500',
        dot: 'bg-red-500',
      };
    case 'HIGH':
      return {
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        border: 'border-l-orange-500',
        dot: 'bg-orange-500',
      };
    case 'MEDIUM':
      return {
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        border: 'border-l-amber-500',
        dot: 'bg-amber-500',
      };
    case 'LOW':
    default:
      return {
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        border: 'border-l-slate-400',
        dot: 'bg-slate-400',
      };
  }
}

export function formatCascadeTriggerLabel(factType: string | undefined, isZh: boolean): string {
  if (!factType) return isZh ? '未知触发' : 'Unknown trigger';
  const key = factType.toUpperCase();
  const zh: Record<string, string> = {
    ROAD: '道路',
    WEATHER: '天气',
    FLIGHT_STATUS: '航班',
  };
  const en: Record<string, string> = {
    ROAD: 'Road',
    WEATHER: 'Weather',
    FLIGHT_STATUS: 'Flight',
  };
  return (isZh ? zh[key] : en[key]) ?? factType;
}

export function formatCascadeTriggerSourceLabel(
  source: string | undefined,
  isZh: boolean
): string | undefined {
  if (!source) return undefined;
  const key = source.toLowerCase();
  const zh: Record<string, string> = {
    physical_validator: '物理校验',
    readiness_blocker: '准备度阻塞',
  };
  const en: Record<string, string> = {
    physical_validator: 'Physical validator',
    readiness_blocker: 'Readiness blocker',
  };
  return (isZh ? zh[key] : en[key]) ?? source;
}

/** 卡片级扁平字段 → Impact Algebra */
export function getImpactAlgebraFromHint(hint: CascadeUiHint): CascadeImpactAlgebra | undefined {
  return parseCascadeImpactAlgebra(hint);
}

function parseRiskLevel(raw: unknown): CascadeRiskLevel {
  const value = String(raw ?? 'MEDIUM').toUpperCase() as CascadeRiskLevel;
  return VALID_RISK_LEVELS.has(value) ? value : 'MEDIUM';
}

function parseRecommendation(raw: unknown): CascadeRecommendation {
  const value = String(raw ?? 'ADJUST').toUpperCase() as CascadeRecommendation;
  return VALID_RECOMMENDATIONS.has(value) ? value : 'ADJUST';
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseOptionalNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() && !Number.isNaN(Number(raw))) return Number(raw);
  return undefined;
}

export function parseCascadeImpactAlgebra(raw: unknown): CascadeImpactAlgebra | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const netImpactMinutes = parseOptionalNumber(o.netImpactMinutes ?? o.net_impact_minutes);
  const absorbedMinutes = parseOptionalNumber(o.absorbedMinutes ?? o.absorbed_minutes);
  let cascadeConfidence = parseOptionalNumber(o.cascadeConfidence ?? o.cascade_confidence);
  if (cascadeConfidence != null && cascadeConfidence > 1) {
    cascadeConfidence = cascadeConfidence / 100;
  }
  const propagationHop = parseOptionalNumber(o.propagationHop ?? o.propagation_hop);

  if (
    netImpactMinutes == null &&
    absorbedMinutes == null &&
    cascadeConfidence == null &&
    propagationHop == null
  ) {
    return undefined;
  }

  return {
    ...(netImpactMinutes != null ? { netImpactMinutes } : {}),
    ...(absorbedMinutes != null ? { absorbedMinutes } : {}),
    ...(cascadeConfidence != null ? { cascadeConfidence } : {}),
    ...(propagationHop != null ? { propagationHop } : {}),
  };
}

export function hasCascadeImpactAlgebra(algebra: CascadeImpactAlgebra | undefined): boolean {
  if (!algebra) return false;
  return (
    algebra.netImpactMinutes != null ||
    algebra.absorbedMinutes != null ||
    algebra.cascadeConfidence != null ||
    algebra.propagationHop != null
  );
}

export function normalizeCascadeAffectedItem(raw: unknown): CascadeAffectedItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const entityRef = a.entityRef ?? a.entity_ref;
  if (!entityRef || typeof entityRef !== 'object') return null;
  const ref = entityRef as Record<string, unknown>;
  const message = String(a.message ?? '').trim();
  if (!message) return null;

  const impactAlgebra =
    parseCascadeImpactAlgebra(a.impactAlgebra ?? a.impact_algebra) ??
    parseCascadeImpactAlgebra(a);

  return {
    riskLevel: parseRiskLevel(a.riskLevel ?? a.risk_level),
    message,
    recommendation: parseRecommendation(a.recommendation),
    entityRef: {
      kind: String(ref.kind ?? 'UNKNOWN'),
      id: String(ref.id ?? ''),
      label: ref.label != null ? String(ref.label) : undefined,
    },
    userConfirmationRequired: parseStringArray(
      a.userConfirmationRequired ?? a.user_confirmation_required
    ),
    ...(impactAlgebra ? { impactAlgebra } : {}),
  };
}

export function normalizeCascadeAffectedList(raw: unknown): CascadeAffectedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeCascadeAffectedItem)
    .filter((item): item is CascadeAffectedItem => item != null);
}

export function getCascadeAffectedFromPreAnalysis(
  preAnalysis: CascadeCausalPreAnalysis | CascadeCausalPreAnalysisSummary | null | undefined
): CascadeAffectedItem[] {
  if (!preAnalysis || !('impact' in preAnalysis)) return [];
  return preAnalysis.impact?.affected ?? [];
}

export function extractCascadeAffectedFromExplain(explain: unknown): CascadeAffectedItem[] {
  if (!explain || typeof explain !== 'object') return [];
  const o = explain as Record<string, unknown>;

  const fromPre = normalizeCascadeCausalPreAnalysis(o.causal_pre_analysis ?? o.causalPreAnalysis);
  const dep = o.dependency_impact ?? o.dependencyImpact;
  const depRecord = dep && typeof dep === 'object' ? (dep as Record<string, unknown>) : undefined;
  const depImpact = depRecord?.impact;
  const depAffected =
    depImpact && typeof depImpact === 'object'
      ? normalizeCascadeAffectedList((depImpact as Record<string, unknown>).affected)
      : normalizeCascadeAffectedList(depRecord?.affected);

  const merged = [...(fromPre?.impact.affected ?? []), ...depAffected];
  if (merged.length === 0) return [];

  const seen = new Set<string>();
  const out: CascadeAffectedItem[] = [];
  for (const item of merged) {
    const key = `${item.entityRef.kind}|${item.entityRef.id}|${item.entityRef.label ?? ''}|${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function matchCascadeHintToAffected(
  hint: CascadeUiHint,
  affected: CascadeAffectedItem[]
): CascadeAffectedItem | undefined {
  if (affected.length === 0) return undefined;

  const hintLabel = hint.entityLabel?.trim().toLowerCase();
  const hintKind = hint.entityKind?.trim().toUpperCase();

  for (const item of affected) {
    const refLabel = item.entityRef.label?.trim().toLowerCase();
    const refKind = item.entityRef.kind?.trim().toUpperCase();
    const refId = item.entityRef.id?.trim();

    if (hint.id && refId && hint.id === refId) return item;
    if (hintLabel && refLabel && hintLabel === refLabel) {
      if (!hintKind || !refKind || hintKind === refKind) return item;
    }
    if (hintKind && refKind && hintKind === refKind && hintLabel && refLabel && hintLabel === refLabel) {
      return item;
    }
  }

  const hintMsg = hint.message.trim().toLowerCase();
  for (const item of affected) {
    const itemMsg = item.message.trim().toLowerCase();
    if (hintMsg.includes(itemMsg.slice(0, 16)) || itemMsg.includes(hintMsg.slice(0, 16))) {
      return item;
    }
  }

  return undefined;
}

export function resolveImpactAlgebraForHint(
  hint: CascadeUiHint,
  hintIndex: number,
  affected: CascadeAffectedItem[] | undefined
): CascadeImpactAlgebra | undefined {
  const fromHint = getImpactAlgebraFromHint(hint);
  if (fromHint && hasCascadeImpactAlgebra(fromHint)) return fromHint;

  if (!affected?.length) return undefined;

  const matched = matchCascadeHintToAffected(hint, affected);
  if (matched?.impactAlgebra && hasCascadeImpactAlgebra(matched.impactAlgebra)) {
    return matched.impactAlgebra;
  }

  if (affected.length === 1 && hasCascadeImpactAlgebra(affected[0].impactAlgebra)) {
    return affected[0].impactAlgebra;
  }

  const byIndex = affected[hintIndex];
  if (byIndex?.impactAlgebra && hasCascadeImpactAlgebra(byIndex.impactAlgebra)) {
    return byIndex.impactAlgebra;
  }

  return undefined;
}

export function formatCascadeImpactAlgebraLines(
  algebra: CascadeImpactAlgebra,
  isZh: boolean
): string[] {
  const lines: string[] = [];

  if (algebra.netImpactMinutes != null) {
    if (algebra.netImpactMinutes === 0 && (algebra.absorbedMinutes ?? 0) > 0) {
      lines.push(
        isZh
          ? `净影响 0 分钟（${algebra.absorbedMinutes} 分钟已被 buffer 吸收）`
          : `Net impact 0 min (${algebra.absorbedMinutes} min absorbed by buffer)`
      );
    } else {
      lines.push(
        isZh
          ? `净影响 ${algebra.netImpactMinutes} 分钟`
          : `Net impact ${algebra.netImpactMinutes} min`
      );
    }
  } else if (algebra.absorbedMinutes != null && algebra.absorbedMinutes > 0) {
    lines.push(
      isZh
        ? `buffer 吸收 ${algebra.absorbedMinutes} 分钟`
        : `Buffer absorbed ${algebra.absorbedMinutes} min`
    );
  }

  if (algebra.cascadeConfidence != null) {
    const pct = Math.round(Math.min(1, Math.max(0, algebra.cascadeConfidence)) * 100);
    lines.push(isZh ? `级联置信度 ${pct}%` : `Cascade confidence ${pct}%`);
  }

  if (algebra.propagationHop != null) {
    lines.push(isZh ? `传播 ${algebra.propagationHop} 跳` : `${algebra.propagationHop} hop(s)`);
  }

  return lines;
}

/** Agent route-and-run 等 snake_case 入口 → 统一 CascadeUiHint */
export function normalizeCascadeUiHint(raw: unknown): CascadeUiHint | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const message = String(o.message ?? o.summary ?? '').trim();
  if (!message) return null;

  const id = String(o.id ?? o.hint_id ?? o.hintId ?? `cascade-${message.slice(0, 24)}`);

  const impactAlgebra = parseCascadeImpactAlgebra(o);

  return {
    id,
    riskLevel: parseRiskLevel(o.riskLevel ?? o.risk_level),
    message,
    recommendation: parseRecommendation(o.recommendation),
    entityKind: o.entityKind != null ? String(o.entityKind) : o.entity_kind != null ? String(o.entity_kind) : undefined,
    entityLabel:
      o.entityLabel != null
        ? String(o.entityLabel)
        : o.entity_label != null
          ? String(o.entity_label)
          : undefined,
    userConfirmationRequired: parseStringArray(
      o.userConfirmationRequired ?? o.user_confirmation_required
    ),
    ...(impactAlgebra?.netImpactMinutes != null ? { netImpactMinutes: impactAlgebra.netImpactMinutes } : {}),
    ...(impactAlgebra?.absorbedMinutes != null ? { absorbedMinutes: impactAlgebra.absorbedMinutes } : {}),
    ...(impactAlgebra?.cascadeConfidence != null ? { cascadeConfidence: impactAlgebra.cascadeConfidence } : {}),
    ...(impactAlgebra?.propagationHop != null ? { propagationHop: impactAlgebra.propagationHop } : {}),
    ...(o.triggerFactType != null || o.trigger_fact_type != null
      ? { triggerFactType: String(o.triggerFactType ?? o.trigger_fact_type) }
      : {}),
    ...(o.triggerSource != null || o.trigger_source != null
      ? { triggerSource: String(o.triggerSource ?? o.trigger_source) }
      : {}),
  };
}

export function normalizeCascadeUiHints(raw: unknown): CascadeUiHint[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeCascadeUiHint)
    .filter((hint): hint is CascadeUiHint => hint != null);
}

export function normalizeCascadeCausalPreAnalysis(raw: unknown): CascadeCausalPreAnalysis | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const trigger = o.trigger as Record<string, unknown> | undefined;
  const impact = o.impact as Record<string, unknown> | undefined;
  const analyzedAt = String(o.analyzedAt ?? o.analyzed_at ?? '').trim();
  if (!trigger || !impact || !analyzedAt) return undefined;

  const affectedRaw = Array.isArray(impact.affected) ? impact.affected : [];
  const affected = affectedRaw
    .map(normalizeCascadeAffectedItem)
    .filter((item): item is CascadeAffectedItem => item != null);

  return {
    trigger: {
      factType: String(trigger.factType ?? trigger.fact_type ?? ''),
    },
    impact: { affected },
    coverage:
      o.coverage && typeof o.coverage === 'object'
        ? (o.coverage as Record<string, unknown>)
        : undefined,
    analyzedAt,
  };
}

export function normalizeCascadeCausalPreAnalysisSummary(
  raw: unknown
): CascadeCausalPreAnalysisSummary | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const triggerFactType =
    o.triggerFactType != null
      ? String(o.triggerFactType)
      : o.trigger_fact_type != null
        ? String(o.trigger_fact_type)
        : undefined;
  const affectedCount =
    typeof o.affectedCount === 'number'
      ? o.affectedCount
      : typeof o.affected_count === 'number'
        ? o.affected_count
        : undefined;
  const maxRiskLevelRaw = o.maxRiskLevel ?? o.max_risk_level;
  const maxRiskLevel =
    maxRiskLevelRaw != null ? parseRiskLevel(maxRiskLevelRaw) : undefined;

  if (!triggerFactType && affectedCount == null && !maxRiskLevel) return undefined;
  return { triggerFactType, affectedCount, maxRiskLevel };
}

export function sortCascadeUiHints(hints: CascadeUiHint[]): CascadeUiHint[] {
  return [...hints].sort(
    (a, b) => CASCADE_RISK_LEVEL_ORDER[b.riskLevel] - CASCADE_RISK_LEVEL_ORDER[a.riskLevel]
  );
}

export function summarizeCascadeImpact(
  hints: CascadeUiHint[],
  causalPreAnalysis?: CascadeCausalPreAnalysis | CascadeCausalPreAnalysisSummary | null
): {
  affectedCount: number;
  maxRiskLevel?: CascadeRiskLevel;
  triggerFactType?: string;
} {
  let affectedCount = hints.length;
  if (causalPreAnalysis && 'affectedCount' in causalPreAnalysis && causalPreAnalysis.affectedCount != null) {
    affectedCount = causalPreAnalysis.affectedCount;
  } else if (
    causalPreAnalysis &&
    'impact' in causalPreAnalysis &&
    causalPreAnalysis.impact?.affected?.length
  ) {
    affectedCount = causalPreAnalysis.impact.affected.length;
  }

  let maxRiskLevel =
    causalPreAnalysis && 'maxRiskLevel' in causalPreAnalysis
      ? causalPreAnalysis.maxRiskLevel
      : undefined;

  if (!maxRiskLevel && hints.length > 0) {
    maxRiskLevel = hints.reduce<CascadeRiskLevel>(
      (max, hint) =>
        CASCADE_RISK_LEVEL_ORDER[hint.riskLevel] > CASCADE_RISK_LEVEL_ORDER[max]
          ? hint.riskLevel
          : max,
      'LOW'
    );
  }

  let triggerFactType =
    causalPreAnalysis && 'trigger' in causalPreAnalysis && causalPreAnalysis.trigger
      ? causalPreAnalysis.trigger.factType
      : causalPreAnalysis && 'triggerFactType' in causalPreAnalysis
        ? causalPreAnalysis.triggerFactType
        : undefined;

  if (!triggerFactType) {
    triggerFactType = hints.find((h) => h.triggerFactType)?.triggerFactType;
  }

  return { affectedCount, maxRiskLevel, triggerFactType };
}

export function extractAffectedFromDependencyImpact(dep: unknown): CascadeAffectedItem[] {
  if (!dep || typeof dep !== 'object') return [];
  return extractCascadeAffectedFromExplain({ dependency_impact: dep });
}

/** ASK_USER 或需用户确认项 → 禁止「自动执行」类 CTA */
export function cascadeHintRequiresUserAction(hint: CascadeUiHint): boolean {
  return (
    hint.recommendation === 'ASK_USER' ||
    (hint.userConfirmationRequired != null && hint.userConfirmationRequired.length > 0)
  );
}

export function pickCascadeUiHintsFromExplain(explain: unknown): CascadeUiHint[] {
  if (!explain || typeof explain !== 'object') return [];
  const o = explain as Record<string, unknown>;
  return normalizeCascadeUiHints(o.cascade_ui_hints ?? o.cascadeUiHints);
}

export function pickCascadeAffectedFromExplain(explain: unknown): CascadeAffectedItem[] {
  return extractCascadeAffectedFromExplain(explain);
}
