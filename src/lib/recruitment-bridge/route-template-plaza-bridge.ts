import type { DayPlan, RouteTemplate } from '@/types/places-routes';
import type { PlanningStyle, RecruitmentPostCard, TrekActivityProfile } from '@/types/match-square';
import type {
  RouteTemplateIntentMatchPlan,
  RouteTemplatePrimaryMatch,
} from '@/types/route-template-intent';
import {
  TREK_SCENARIOS,
  inferActivityProfileFromText,
  type TrekPlazaSearchParams,
} from './trek-plaza-bridge';
import { buildTrekkingOrchestrationPlan } from './trekking-orchestration';
import { activityProfileFromScriptId } from './trekking-orchestration/script-id-map';
import {
  ROUTE_TEMPLATE_CATALOG,
  type RouteTemplateCatalogEntry,
} from './route-template-intent/route-template-intent-bindings.config';

export type RouteTemplatePlazaSearchParams = {
  routeTemplateCatalogId?: string;
  routeTemplateId?: number;
  routeDirectionId?: number;
  routeDirectionName?: string;
  confirmTemplate?: boolean;
  vibeSeed?: string;
};

export type RecruitmentCreateInitial = Partial<RecruitmentPostCard> & {
  vibeRawText?: string;
  planningStyle?: PlanningStyle;
  slotsNeeded?: number;
  budgetMinRmb?: number;
  budgetMaxRmb?: number;
  startDate?: string;
  endDate?: string;
  routeTemplateCatalogId?: string;
  routeTemplateId?: number;
  autoConfirmRouteTemplate?: boolean;
};

function isTruthyParam(v: string | null | undefined): boolean {
  return v === '1' || v === 'true' || v === 'yes';
}

export function getCatalogEntryById(catalogId: string): RouteTemplateCatalogEntry | undefined {
  return ROUTE_TEMPLATE_CATALOG.find((c) => c.catalogId === catalogId);
}

export function parseRouteTemplatePlazaSearchParams(
  params: URLSearchParams | Record<string, string | undefined>
): RouteTemplatePlazaSearchParams {
  const get = (key: string) =>
    params instanceof URLSearchParams ? params.get(key) ?? undefined : params[key];

  const catalogId = get('routeTemplateCatalogId')?.trim() || get('catalogId')?.trim() || undefined;
  const templateIdRaw = get('routeTemplateId');
  const routeTemplateId =
    templateIdRaw != null && templateIdRaw !== '' && Number.isFinite(Number(templateIdRaw))
      ? Number(templateIdRaw)
      : undefined;

  const rdRaw = get('routeDirectionId');
  const routeDirectionId =
    rdRaw != null && rdRaw !== '' && Number.isFinite(Number(rdRaw)) ? Number(rdRaw) : undefined;

  return {
    routeTemplateCatalogId: catalogId,
    routeTemplateId,
    routeDirectionId,
    routeDirectionName: get('routeDirectionName')?.trim() || undefined,
    confirmTemplate: isTruthyParam(get('confirmTemplate')),
    vibeSeed: get('vibeSeed')?.trim() || undefined,
  };
}

/** 从 API RouteTemplate 反查 catalog（metadata.catalogId 优先，否则关键词 + 天数） */
export function resolveCatalogEntryFromTemplate(
  template: Pick<
    RouteTemplate,
    'id' | 'nameCN' | 'nameEN' | 'durationDays' | 'metadata' | 'routeDirection'
  >
): RouteTemplateCatalogEntry | null {
  const metaId =
    (typeof template.metadata?.catalogId === 'string' && template.metadata.catalogId) ||
    (typeof template.metadata?.routeTemplateCatalogId === 'string' &&
      template.metadata.routeTemplateCatalogId) ||
    null;

  if (metaId) {
    const hit = getCatalogEntryById(metaId);
    if (hit) return hit;
  }

  const blob = [
    template.nameCN,
    template.nameEN,
    template.routeDirection?.nameCN,
    template.routeDirection?.nameEN,
    ...(template.routeDirection?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ');

  let best: { entry: RouteTemplateCatalogEntry; score: number } | null = null;
  for (const entry of ROUTE_TEMPLATE_CATALOG) {
    let score = 0;
    for (const kw of entry.intentKeywords) {
      if (new RegExp(kw, 'i').test(blob)) score += 1;
    }
    if (entry.durationDays === template.durationDays) score += 2;
    if (!best || score > best.score) best = { entry, score };
  }

  if (best && best.score >= 2) return best.entry;

  const titleZh =
    template.nameCN ||
    template.nameEN ||
    template.routeDirection?.nameCN ||
    template.routeDirection?.nameEN ||
    `路线模板 #${template.id}`;
  const routeDirectionName =
    template.routeDirection?.nameCN ||
    template.routeDirection?.nameEN ||
    titleZh;
  const routeDirectionKey =
    (template.routeDirection?.id != null ? `route_direction_${template.routeDirection.id}` : null) ||
    `ROUTE_TEMPLATE_${template.id}`;
  const keywordText = `${titleZh} ${routeDirectionName} ${(template.routeDirection?.tags ?? []).join(' ')}`;
  const heavyPattern = /高地|F路|徒步|野营|荒野|重装|涉水|Highland|Trek|Wilderness/i;

  return {
    catalogId: `route_template_${template.id}`,
    titleZh,
    scriptId: heavyPattern.test(keywordText) ? 'chuanxi_heavy_trek' : 'light_trek_dyl_retreat',
    routeDirectionKey,
    routeDirectionName,
    durationDays: template.durationDays,
    intentKeywords: [
      titleZh,
      routeDirectionName,
      ...(template.routeDirection?.tags ?? []),
    ].filter(Boolean),
  };
}

export function buildItinerarySummaryFromDayPlans(dayPlans: DayPlan[] | undefined): string {
  if (!dayPlans?.length) return '';
  return dayPlans
    .slice(0, 6)
    .map((d) => {
      const theme = d.theme?.trim();
      return theme ? `D${d.day} ${theme}` : `D${d.day}`;
    })
    .join(' · ');
}

function datesFromDurationDays(durationDays: number): { startDate: string; endDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + Math.max(0, durationDays - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function resolveActivityProfile(entry: RouteTemplateCatalogEntry): TrekActivityProfile | null {
  if (entry.scriptId === 'mountain_dyl_retreat') return 'light_trek';
  return activityProfileFromScriptId(entry.scriptId);
}

function resolveVisionText(
  entry: RouteTemplateCatalogEntry,
  vibeSeed?: string,
  dayPlans?: DayPlan[]
): string {
  if (vibeSeed?.trim()) return vibeSeed.trim();
  const profile = resolveActivityProfile(entry);
  const scenarioVision = profile ? TREK_SCENARIOS[profile].visionTemplate : '';
  const itineraryHint = buildItinerarySummaryFromDayPlans(dayPlans);
  const prefix = `以此路线模板《${entry.titleZh}》发起车队招募。`;
  if (itineraryHint) {
    return `${prefix}${scenarioVision.slice(0, 120)}… 日计划：${itineraryHint}`;
  }
  return `${prefix}${scenarioVision}`;
}

export function catalogEntryToPrimaryMatch(
  entry: RouteTemplateCatalogEntry,
  matchPercent = 95
): RouteTemplatePrimaryMatch {
  return {
    catalogId: entry.catalogId,
    routeDirectionName: entry.routeDirectionName,
    durationDays: entry.durationDays,
    titleZh: entry.titleZh,
    matchPercent,
    confidence: matchPercent >= 85 ? 'highlight' : 'suggest',
    launchRecruitmentAction: 'confirm_template',
    slotAugmentations: entry.slotAugmentations,
  };
}

export function catalogEntryToMatchPlan(
  entry: RouteTemplateCatalogEntry,
  matchPercent = 95
): RouteTemplateIntentMatchPlan {
  const primaryMatch = catalogEntryToPrimaryMatch(entry, matchPercent);
  return {
    version: 'route_template_intent_v1',
    associationHint: `🗺️ 已绑定路线模板：《${entry.titleZh}》`,
    primaryMatch,
    suggestions: [],
  };
}

export function buildRouteTemplateRecruitmentUrl(input: {
  catalogId: string;
  routeTemplateId?: number;
  routeDirectionId?: number;
  routeDirectionName?: string;
  vibeSeed?: string;
  confirmTemplate?: boolean;
}): string {
  const q = new URLSearchParams();
  q.set('routeTemplateCatalogId', input.catalogId);
  if (input.routeTemplateId != null) q.set('routeTemplateId', String(input.routeTemplateId));
  if (input.routeDirectionId != null) q.set('routeDirectionId', String(input.routeDirectionId));
  if (input.routeDirectionName) q.set('routeDirectionName', input.routeDirectionName);
  if (input.vibeSeed) q.set('vibeSeed', input.vibeSeed);
  if (input.confirmTemplate) q.set('confirmTemplate', '1');
  return `/dashboard/trusted-projects/new?${q.toString()}`;
}

export function buildRecruitmentInitialFromRouteTemplate(input: {
  catalogEntry: RouteTemplateCatalogEntry;
  routeDirectionId?: number;
  routeDirectionName?: string;
  routeTemplateId?: number;
  dayPlans?: DayPlan[];
  destination?: string;
  vibeSeed?: string;
  autoConfirm?: boolean;
}): RecruitmentCreateInitial {
  const { catalogEntry: entry } = input;
  const profile =
    resolveActivityProfile(entry) ??
    inferActivityProfileFromText(input.vibeSeed ?? entry.titleZh) ??
    null;
  const scenario = profile ? TREK_SCENARIOS[profile] : null;
  const vision = resolveVisionText(entry, input.vibeSeed, input.dayPlans);
  const dates = datesFromDurationDays(entry.durationDays);
  const itinerarySummary = buildItinerarySummaryFromDayPlans(input.dayPlans);

  const destination =
    input.destination?.trim() ||
    input.routeDirectionName?.trim() ||
    entry.titleZh.split('·')[0]?.trim() ||
    entry.titleZh;

  const trekkingOrchestration =
    buildTrekkingOrchestrationPlan({
      visionText: vision,
      activityProfile: profile ?? undefined,
      routeDirectionId: input.routeDirectionId ?? null,
      routeDirectionName: input.routeDirectionName ?? entry.routeDirectionName,
    }) ?? undefined;

  return {
    routeTemplateCatalogId: entry.catalogId,
    routeTemplateId: input.routeTemplateId,
    routeDirectionId: input.routeDirectionId ?? null,
    routeDirectionName: input.routeDirectionName ?? entry.routeDirectionName,
    activityProfile: profile,
    destination,
    recruitmentVision: vision,
    vibeRawText: vision,
    itinerarySummary: itinerarySummary || undefined,
    planningStyle: scenario?.planningStyle ?? 'co_planning',
    slotsNeeded: scenario?.defaultSlots ?? 2,
    budgetMinRmb: entry.budgetMinRmb ?? scenario?.budgetMinRmb,
    budgetMaxRmb: entry.budgetMaxRmb ?? scenario?.budgetMaxRmb,
    startDate: dates.startDate,
    endDate: dates.endDate,
    trekkingOrchestration,
    autoConfirmRouteTemplate: input.autoConfirm,
    teamStatus: {
      slotsFilled: 0,
      slotsNeeded: scenario?.defaultSlots ?? 2,
      slotsRemaining: scenario?.defaultSlots ?? 2,
    },
    budgetRange:
      entry.budgetMinRmb != null || entry.budgetMaxRmb != null
        ? {
            minCents: entry.budgetMinRmb != null ? entry.budgetMinRmb * 100 : null,
            maxCents: entry.budgetMaxRmb != null ? entry.budgetMaxRmb * 100 : null,
          }
        : scenario?.budgetMinRmb != null || scenario?.budgetMaxRmb != null
          ? {
              minCents: scenario.budgetMinRmb != null ? scenario.budgetMinRmb * 100 : null,
              maxCents: scenario.budgetMaxRmb != null ? scenario.budgetMaxRmb * 100 : null,
            }
          : undefined,
  };
}

export function mergeRecruitmentCreateInitial(
  trek?: RecruitmentCreateInitial,
  template?: RecruitmentCreateInitial
): RecruitmentCreateInitial | undefined {
  if (!trek && !template) return undefined;
  if (!trek) return template;
  if (!template) return trek;

  return {
    ...trek,
    ...template,
    destination: template.destination || trek.destination || '',
    routeDirectionId: template.routeDirectionId ?? trek.routeDirectionId,
    routeDirectionName: template.routeDirectionName ?? trek.routeDirectionName,
    activityProfile: template.activityProfile ?? trek.activityProfile,
    trekkingOrchestration: template.trekkingOrchestration ?? trek.trekkingOrchestration,
    vibeRawText: template.vibeRawText ?? trek.vibeRawText,
    recruitmentVision: template.recruitmentVision ?? trek.recruitmentVision,
    itinerarySummary: template.itinerarySummary ?? trek.itinerarySummary,
    startDate: template.startDate ?? trek.startDate,
    endDate: template.endDate ?? trek.endDate,
    planningStyle: template.planningStyle ?? trek.planningStyle,
    slotsNeeded: template.slotsNeeded ?? trek.slotsNeeded,
    budgetMinRmb: template.budgetMinRmb ?? trek.budgetMinRmb,
    budgetMaxRmb: template.budgetMaxRmb ?? trek.budgetMaxRmb,
    budgetRange: template.budgetRange ?? trek.budgetRange,
    routeTemplateCatalogId: template.routeTemplateCatalogId,
    routeTemplateId: template.routeTemplateId ?? trek.routeTemplateId,
    autoConfirmRouteTemplate: template.autoConfirmRouteTemplate ?? trek.autoConfirmRouteTemplate,
    teamStatus: template.teamStatus ?? trek.teamStatus,
  };
}

export function routeTemplateBridgeHeadline(initial: Pick<RecruitmentCreateInitial, 'routeTemplateCatalogId'>): string | null {
  if (!initial.routeTemplateCatalogId) return null;
  const entry = getCatalogEntryById(initial.routeTemplateCatalogId);
  return entry ? `🗺️ ${entry.titleZh}` : null;
}

/** 从 RouteTemplate API 实体构建跳转 URL（链路 A） */
export function buildRecruitmentUrlFromRouteTemplate(template: RouteTemplate): string | null {
  const entry = resolveCatalogEntryFromTemplate(template);
  if (!entry) return null;

  return buildRouteTemplateRecruitmentUrl({
    catalogId: entry.catalogId,
    routeTemplateId: template.id,
    routeDirectionId: template.routeDirectionId,
    routeDirectionName: template.routeDirection?.nameCN ?? template.nameCN,
    confirmTemplate: true,
  });
}

/** 从 RouteTemplate API 实体构建 create 页 initial */
export function buildRecruitmentInitialFromRouteTemplateEntity(
  template: RouteTemplate,
  opts?: { autoConfirm?: boolean; vibeSeed?: string }
): RecruitmentCreateInitial | null {
  const entry = resolveCatalogEntryFromTemplate(template);
  if (!entry) return null;

  return buildRecruitmentInitialFromRouteTemplate({
    catalogEntry: entry,
    routeDirectionId: template.routeDirectionId,
    routeDirectionName: template.routeDirection?.nameCN ?? template.nameCN,
    routeTemplateId: template.id,
    dayPlans: template.dayPlans,
    destination: template.routeDirection?.nameCN ?? template.nameCN,
    vibeSeed: opts?.vibeSeed,
    autoConfirm: opts?.autoConfirm ?? true,
  });
}

export function trekParamsFromPlazaSearch(
  trek: TrekPlazaSearchParams,
  template: RouteTemplatePlazaSearchParams
): TrekPlazaSearchParams {
  return {
    routeDirectionId: template.routeDirectionId ?? trek.routeDirectionId,
    routeDirectionName: template.routeDirectionName ?? trek.routeDirectionName,
    activityProfile: trek.activityProfile,
    vibeSeed: template.vibeSeed ?? trek.vibeSeed,
  };
}
