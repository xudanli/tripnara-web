/**
 * impactScopeView narrative / trigger / chain — 前端 i18n 渲染
 */
import type { TFunction } from 'i18next';
import type {
  ImpactScopeArrangement,
  ImpactScopeChainLink,
  ImpactScopeNarrative,
  ImpactScopeTrigger,
  ImpactScopeView,
} from '@/types/impact-scope';

const LEGACY_HEADLINE_KEY = 'impact._legacy_headline';

/** 列表/摘要用：Oxford-style 简化为 locale 分隔符 */
export function formatImpactScopeList(
  labels: string[],
  language: string,
): string {
  const items = labels.map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return '';
  const sep = language.startsWith('zh') ? '、' : ', ';
  if (items.length === 1) return items[0];
  if (language.startsWith('zh')) {
    return items.join(sep);
  }
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(sep)}, and ${items[items.length - 1]}`;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is number => typeof item === 'number' && Number.isFinite(item),
  );
}

function resolvePrimaryDisplayDayIndex(
  params: Record<string, unknown> | undefined,
): number | undefined {
  if (!params) return undefined;
  if (
    typeof params.primaryDayIndex === 'number' &&
    Number.isFinite(params.primaryDayIndex) &&
    params.primaryDayIndex > 0
  ) {
    return params.primaryDayIndex;
  }
  const dayIndexes = normalizeNumberArray(params.dayIndexes);
  if (dayIndexes.length > 0) return dayIndexes[0];
  if (typeof params.dayIndex === 'number' && params.dayIndex > 0) {
    return params.dayIndex;
  }
  return undefined;
}

/** narrative.params → i18n 插值（primaryDayIndex 为 SSOT） */
export function buildImpactScopeInterpolation(
  params: Record<string, unknown> | undefined,
  language: string,
): Record<string, string | number> {
  const raw = params ?? {};
  const primaryDay = resolvePrimaryDisplayDayIndex(raw);
  const dayIndexes = normalizeNumberArray(raw.dayIndexes);
  const arrangementLabels = normalizeStringArray(raw.arrangementLabels);
  const subjectId = String(raw.subjectId ?? raw.roadId ?? raw.entityRef ?? '');

  return {
    subjectId,
    road: subjectId,
    roadId: subjectId,
    entityRef: String(raw.entityRef ?? subjectId),
    status: String(raw.status ?? ''),
    day: primaryDay ?? dayIndexes[0] ?? 0,
    primaryDayIndex: primaryDay ?? dayIndexes[0] ?? 0,
    dayIndexes: (primaryDay != null
      ? [primaryDay, ...dayIndexes.filter((d) => d !== primaryDay)]
      : dayIndexes
    ).join(language.startsWith('zh') ? '、' : ', '),
    count: Number(
      raw.arrangementCount ?? arrangementLabels.length ?? raw.count ?? 0,
    ),
    arrangementCount: Number(
      raw.arrangementCount ?? arrangementLabels.length ?? 0,
    ),
    directCount: Number(raw.directCount ?? 0),
    downstreamCount: Number(raw.downstreamCount ?? 0),
    names: formatImpactScopeList(arrangementLabels, language),
    arrangementLabels: formatImpactScopeList(arrangementLabels, language),
    text: String(raw.text ?? ''),
  };
}

export function formatImpactScopeNarrative(
  narrative: ImpactScopeNarrative | null | undefined,
  t: TFunction,
  language: string,
): string | undefined {
  if (!narrative?.templateKey?.trim()) return undefined;
  const key = narrative.templateKey.trim();
  const interpolation = buildImpactScopeInterpolation(narrative.params, language);
  const rendered = t(key, {
    ...interpolation,
    defaultValue: key === LEGACY_HEADLINE_KEY ? String(interpolation.text) : key,
  });
  const trimmed = rendered?.trim();
  return trimmed && trimmed !== key ? trimmed : undefined;
}

export function formatImpactScopeHeadline(
  view: ImpactScopeView | null | undefined,
  t: TFunction,
  language: string,
): string | undefined {
  if (!view) return undefined;
  return formatImpactScopeNarrative(view.narrative, t, language);
}

export function formatImpactScopeDetailNarrative(
  view: ImpactScopeView | null | undefined,
  t: TFunction,
  language: string,
): string | undefined {
  if (!view) return undefined;
  return formatImpactScopeNarrative(view.detailNarrative, t, language);
}

export function resolveImpactScopeDay(
  view: ImpactScopeView,
): number | undefined {
  const fromNarrative = resolvePrimaryDisplayDayIndex(view.narrative?.params);
  if (fromNarrative != null) return fromNarrative;

  const params = view.narrative?.params;
  const fromParams = Array.isArray(params?.dayIndexes)
    ? (params!.dayIndexes as unknown[]).find(
        (d): d is number => typeof d === 'number' && Number.isFinite(d) && d > 0,
      )
    : typeof params?.dayIndex === 'number' && params.dayIndex > 0
      ? params.dayIndex
      : undefined;
  if (fromParams != null) return fromParams;

  if (typeof view.trigger?.dayIndex === 'number' && view.trigger.dayIndex > 0) {
    return view.trigger.dayIndex;
  }

  const fromArrangement = view.arrangements?.find((a) => a.dayIndex != null)?.dayIndex;
  if (fromArrangement != null) return fromArrangement;

  if (view.trigger?.subjectKind === 'DAY' && view.trigger.subjectId) {
    const parsed = Number(view.trigger.subjectId);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return undefined;
}

/** 影响范围涉及的全部天次（去重、升序；primaryDayIndex 优先） */
export function resolveImpactScopeDays(
  view: ImpactScopeView | null | undefined,
): number[] {
  if (!view) return [];

  const days = new Set<number>();
  const primary = resolvePrimaryDisplayDayIndex(view.narrative?.params);
  if (primary != null) days.add(primary);

  const params = view.narrative?.params;
  if (Array.isArray(params?.dayIndexes)) {
    for (const day of params.dayIndexes as unknown[]) {
      if (typeof day === 'number' && Number.isFinite(day) && day > 0) {
        days.add(day);
      }
    }
  }
  if (typeof params?.dayIndex === 'number' && params.dayIndex > 0) {
    days.add(params.dayIndex);
  }

  if (typeof view.trigger?.dayIndex === 'number' && view.trigger.dayIndex > 0) {
    days.add(view.trigger.dayIndex);
  }

  for (const arrangement of view.arrangements ?? []) {
    if (arrangement.dayIndex != null && Number.isFinite(arrangement.dayIndex)) {
      const day = arrangement.dayIndex >= 1 ? arrangement.dayIndex : arrangement.dayIndex + 1;
      if (day > 0) days.add(day);
    }
  }

  if (days.size === 0) {
    const single = resolveImpactScopeDay(view);
    if (single != null) days.add(single);
  }

  return [...days].sort((a, b) => a - b);
}

export function formatDecisionDayLabel(
  days: number[],
  language = 'zh',
): string | null {
  if (!days.length) return null;
  if (language.startsWith('zh')) {
    if (days.length === 1) return `第 ${days[0]} 天`;
    return `第 ${days.join('、')} 天`;
  }
  if (days.length === 1) return `Day ${days[0]}`;
  return `Day ${days.join(', ')}`;
}

/** 去掉标题内嵌的天次，避免与顶栏 dayLabel 重复或冲突 */
export function stripEmbeddedDayFromDecisionTitle(title: string): string {
  return title
    .replace(/[：:]\s*第\s*\d+\s*日[^\s]*/u, '')
    .replace(/^第\s*\d+\s*日\s*[··\-—]\s*/u, '')
    .replace(/^第\s*\d+\s*天\s*[··\-—]\s*/u, '')
    .replace(/\s*[··\-—]\s*第\s*\d+\s*天\s*$/u, '')
    .trim();
}

export interface DecisionDayLabelContext {
  impactScopeView?: ImpactScopeView | null;
  problem?: {
    title?: string;
    affectedDayNumbers?: number[];
  } | null;
  language?: string;
}

/** 顶栏 / 列表天次：优先 impactScopeView，再回落 problem */
export function dayLabelForDecisionContext({
  impactScopeView,
  problem,
  language = 'zh',
}: DecisionDayLabelContext): string | null {
  const impactDays = resolveImpactScopeDays(impactScopeView);
  if (impactDays.length) {
    return formatDecisionDayLabel(impactDays, language);
  }

  if (!problem) return null;
  const days = problem.affectedDayNumbers;
  if (days?.length) {
    return formatDecisionDayLabel(days, language);
  }

  const match = problem.title?.match(/第(\d+)日/u);
  if (match) return formatDecisionDayLabel([Number(match[1])], language);

  const dayMatch = problem.title?.match(/第(\d+)天/u);
  if (dayMatch) return formatDecisionDayLabel([Number(dayMatch[1])], language);

  return null;
}

export function formatImpactScopeTrigger(
  trigger: ImpactScopeTrigger | null | undefined,
  t: TFunction,
  context?: { day?: number },
): string | undefined {
  if (!trigger) return undefined;
  if (trigger.capability) {
    const day =
      context?.day ??
      (typeof trigger.dayIndex === 'number' && trigger.dayIndex > 0
        ? trigger.dayIndex
        : undefined) ??
      (trigger.subjectKind === 'DAY' && trigger.subjectId
        ? Number(trigger.subjectId)
        : undefined);
    const statusLabel = trigger.status
      ? t(`impact.status.${trigger.status}`, {
          defaultValue: trigger.status,
        })
      : '';
    const rendered = t(`impact.trigger.${trigger.capability}`, {
      subjectId: trigger.subjectId ?? (day != null ? String(day) : ''),
      day: day ?? '',
      status: statusLabel,
      defaultValue: [trigger.subjectId, trigger.status].filter(Boolean).join(' · '),
    });
    const trimmed = rendered?.trim();
    if (!trimmed || trimmed.startsWith('impact.trigger.')) return undefined;
    if (/第\s*日|Day\s+driving/i.test(trimmed)) return undefined;
    return trimmed;
  }
  return trigger.label?.trim() || trigger.detail?.trim() || undefined;
}

export function formatImpactScopeChainLink(
  link: ImpactScopeChainLink,
  t: TFunction,
): { kindLabel?: string; body: string; detail?: string } {
  const kindKey = link.kind?.toLowerCase();
  const kindLabel = kindKey
    ? t(`impact.chain.kind.${kindKey}`, {
        defaultValue: t(`impact.chain.kind.${link.kind}`, { defaultValue: link.kind }),
      })
    : undefined;

  if (link.label?.trim()) {
    return { kindLabel, body: link.label.trim(), detail: link.detail };
  }

  if (link.consequenceKind) {
    return {
      kindLabel,
      body: t(`impact.chain.consequence.${link.consequenceKind}`, {
        defaultValue: link.consequenceKind,
      }),
      detail: link.detail,
    };
  }

  if (link.kind === 'route' && link.entityRef) {
    return {
      kindLabel,
      body: link.entityRef,
      detail: link.detail,
    };
  }

  if (link.entityRef) {
    return { kindLabel, body: link.entityRef, detail: link.detail };
  }

  return { kindLabel, body: link.detail ?? '—' };
}

export function arrangementDisplayLabel(arrangement: ImpactScopeArrangement): string {
  return arrangement.label?.trim() || '';
}
