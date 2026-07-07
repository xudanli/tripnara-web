/**
 * data.impactScopeView 归一化 — tripnara.impact_scope@v1
 */
import type {
  ImpactScopeArrangement,
  ImpactScopeChainLink,
  ImpactScopeNarrative,
  ImpactScopeTrigger,
  ImpactScopeView,
} from '@/types/impact-scope';

function trimString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeNarrative(raw: unknown): ImpactScopeNarrative | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const templateKey = trimString(record.templateKey);
  if (!templateKey) return null;
  const params =
    record.params && typeof record.params === 'object' && !Array.isArray(record.params)
      ? (record.params as Record<string, unknown>)
      : undefined;
  return { templateKey, params };
}

function normalizeChainLink(raw: unknown): ImpactScopeChainLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const entityRef = trimString(record.entityRef);
  const consequenceKind = trimString(record.consequenceKind) as ImpactScopeChainLink['consequenceKind'];
  const label = trimString(record.label);
  const detail = trimString(record.detail);
  const kind = trimString(record.kind) as ImpactScopeChainLink['kind'];

  if (!entityRef && !consequenceKind && !label && !detail) return null;

  return {
    kind,
    entityRef,
    consequenceKind,
    label,
    detail,
  };
}

/** 同日同 label 去重（后端 direct/cascade 常重复发同一 POI） */
export function dedupeImpactScopeArrangements(
  arrangements: ImpactScopeArrangement[],
): ImpactScopeArrangement[] {
  const merged = new Map<string, ImpactScopeArrangement>();

  for (const item of arrangements) {
    const label = item.label?.trim();
    if (!label) continue;
    const key = `${item.dayIndex ?? 'na'}|${label.toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, item);
      continue;
    }
    merged.set(key, {
      ...existing,
      id: existing.id ?? item.id,
      arrangementKind: existing.arrangementKind ?? item.arrangementKind,
      isDirect:
        existing.isDirect === true || item.isDirect === true
          ? true
          : existing.isDirect === false && item.isDirect === false
            ? false
            : existing.isDirect ?? item.isDirect,
    });
  }

  return [...merged.values()];
}

function normalizeArrangement(raw: unknown): ImpactScopeArrangement | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const label =
    trimString(record.label) ??
    trimString(record.name);
  if (!label) return null;
  const dayIndex =
    typeof record.dayIndex === 'number' && Number.isFinite(record.dayIndex)
      ? record.dayIndex
      : undefined;
  return {
    id: trimString(record.id),
    label,
    dayIndex,
    isDirect: record.isDirect === true ? true : record.isDirect === false ? false : undefined,
    arrangementKind: trimString(record.arrangementKind) as ImpactScopeArrangement['arrangementKind'],
  };
}

function normalizeTrigger(raw: unknown): ImpactScopeTrigger | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const capability = trimString(record.capability) as ImpactScopeTrigger['capability'];
  const subjectKind = trimString(record.subjectKind) as ImpactScopeTrigger['subjectKind'];
  const subjectId = trimString(record.subjectId);
  const status = trimString(record.status);
  const dayIndex =
    typeof record.dayIndex === 'number' && Number.isFinite(record.dayIndex) && record.dayIndex > 0
      ? record.dayIndex
      : undefined;
  const label = trimString(record.label);
  const detail = trimString(record.detail);
  const kind = trimString(record.kind);

  if (!capability && !subjectId && !label && !detail && !kind && dayIndex == null) return undefined;

  return {
    capability,
    subjectKind,
    subjectId,
    dayIndex,
    status,
    kind,
    label,
    detail,
  };
}

function legacyHeadlineNarrative(headline: string): ImpactScopeNarrative {
  return {
    templateKey: 'impact._legacy_headline',
    params: { text: headline },
  };
}

export function normalizeImpactScopeView(raw: unknown): ImpactScopeView | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  let narrative = normalizeNarrative(record.narrative);
  if (!narrative) {
    const legacyHeadline =
      trimString(record.headline) ?? trimString(record.impactHeadline);
    if (!legacyHeadline) return null;
    narrative = legacyHeadlineNarrative(legacyHeadline);
  }

  const detailNarrative =
    normalizeNarrative(record.detailNarrative) ??
    (trimString(record.summary)
      ? legacyHeadlineNarrative(trimString(record.summary)!)
      : undefined);

  const chain = Array.isArray(record.chain)
    ? record.chain
        .map(normalizeChainLink)
        .filter((link): link is ImpactScopeChainLink => link != null)
    : undefined;

  const arrangements = Array.isArray(record.arrangements)
    ? dedupeImpactScopeArrangements(
        record.arrangements
          .map(normalizeArrangement)
          .filter((item): item is ImpactScopeArrangement => item != null),
      )
    : undefined;

  return {
    schemaId: trimString(record.schemaId),
    narrative,
    detailNarrative: detailNarrative ?? undefined,
    chain,
    arrangements,
    trigger: normalizeTrigger(record.trigger),
  };
}

/** 从 Gateway data / detail 载荷提取 impactScopeView */
export function extractImpactScopeFromPayload(data: unknown): ImpactScopeView | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const nested = normalizeImpactScopeView(record.impactScopeView);
  if (nested) return nested;

  const narrative = normalizeNarrative(record.impactNarrative);
  if (narrative) {
    return normalizeImpactScopeView({ narrative, ...record });
  }

  const legacyHeadline = trimString(record.impactHeadline);
  if (legacyHeadline) {
    return normalizeImpactScopeView({ headline: legacyHeadline });
  }

  return null;
}

/** @deprecated 列表/摘要请用 formatImpactScopeHeadline(view, t, language) */
export function impactScopeHeadline(view: ImpactScopeView | null | undefined): string | undefined {
  if (!view?.narrative) return undefined;
  if (view.narrative.templateKey === 'impact._legacy_headline') {
    const text = view.narrative.params?.text;
    return typeof text === 'string' ? text.trim() || undefined : undefined;
  }
  return undefined;
}
