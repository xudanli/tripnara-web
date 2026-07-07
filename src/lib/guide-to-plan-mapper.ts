/**
 * Guide-to-Plan API 视图 → 前端 UI 模型映射
 */

import type {
  GuideBundleSummary,
  GuideClaim,
  GuideRiskHint,
  GuideSource,
  GuideSourceType,
  GuideTripContext,
  ExtractedPlace,
  PlanAdjustmentRow,
  PlanCandidate,
} from '@/types/guide-import';
import type {
  ComparisonDiffRow,
  GuidePlanCandidateDetailView,
  GuideTravelContext,
  GuideTravelers,
  GuideUnderstandingSummaryView,
  GuideUnderstandingView,
  ImportedGuideView,
  ItineraryDraftAccommodation,
  ItineraryDraftDay,
  ItineraryDraftView,
  PendingConfirmation,
  PendingConfirmationField,
  PlanVariant,
  PoiMatchStatus,
  UnderstandingPlaceView,
} from '@/types/guide-to-plan-api';

export interface UnderstandingUiMeta {
  pendingConfirmations: PendingConfirmation[];
  requiresTravelContext: boolean;
  suggestedTripDays?: number | null;
  parseRequired?: boolean;
  parsedGuideCount?: number;
  inspirationCandidateCount?: number;
  unmatchedPlaceCount?: number;
}

const INSPIRATION_CANDIDATE_TYPES = new Set<UnderstandingPlaceView['candidateType']>([
  'poi',
  'restaurant',
  'hotel',
  'activity',
]);

/** 与「攻略中的地点」列表及后端 unmatchedPlaceCount 统计范围一致 */
export const MATCHABLE_PLACE_CANDIDATE_TYPES = INSPIRATION_CANDIDATE_TYPES;

function placeMatchStatus(place: UnderstandingPlaceView): PoiMatchStatus | undefined {
  return place.matchStatus ?? place.poiMatchStatus;
}

export function isUnmatchedPlaceCandidate(place: UnderstandingPlaceView): boolean {
  if (!MATCHABLE_PLACE_CANDIDATE_TYPES.has(place.candidateType)) return false;
  const match = placeMatchStatus(place);
  return match === 'unmatched' || match === 'ambiguous';
}

/** 从 places[] 实时统计待匹配数，避免 summary.unmatchedPlaceCount 缓存过期 */
export function countUnmatchedPlaceCandidates(places: UnderstandingPlaceView[]): number {
  return places.filter(isUnmatchedPlaceCandidate).length;
}

export function resolveUnmatchedPlaceCount(view: GuideUnderstandingView): number {
  const places = view.places ?? [];
  if (places.length > 0) return countUnmatchedPlaceCandidates(places);
  return view.summary.unmatchedPlaceCount ?? 0;
}

const UNMATCHED_POI_HINT_PATTERN = /尚未匹配|待匹配|POI\s*数据库/i;

function normalizeUnmatchedRiskHints(
  hints: GuideRiskHint[],
  places: UnderstandingPlaceView[],
): GuideRiskHint[] {
  if (places.length === 0) return hints;

  const unmatchedPlaces = places.filter(isUnmatchedPlaceCandidate);
  const unmatchedCount = unmatchedPlaces.length;
  const otherHints = hints.filter(
    (h) =>
      !UNMATCHED_POI_HINT_PATTERN.test(h.title) &&
      !UNMATCHED_POI_HINT_PATTERN.test(h.description),
  );

  if (unmatchedCount === 0) return otherHints;

  const names = unmatchedPlaces.map((p) => p.rawName).filter(Boolean);
  return [
    {
      id: 'unmatched_poi',
      title: `${unmatchedCount} 个地点尚未匹配到 POI 数据库`,
      description:
        names.length > 0
          ? `包括：${names.join('、')}。可使用「搜索 POI」绑定或标记「无需匹配」。`
          : '可使用「搜索 POI」绑定或标记「无需匹配」。',
      severity: 'warning',
      needsVerification: true,
      sourceGuideIds: [],
    },
    ...otherHints,
  ];
}

export function countInspirationCandidates(
  places: UnderstandingPlaceView[],
  summary?: GuideUnderstandingSummaryView,
): number {
  const fromPlaces = places.filter((p) => INSPIRATION_CANDIDATE_TYPES.has(p.candidateType)).length;
  if (fromPlaces > 0) return fromPlaces;
  if (!summary) return 0;
  return summary.placeCount + summary.restaurantCount + summary.hotelAreaCount;
}

export function extractUnderstandingMeta(view: GuideUnderstandingView): UnderstandingUiMeta {
  return {
    pendingConfirmations: view.pendingConfirmations ?? [],
    requiresTravelContext: view.requiresTravelContext ?? false,
    suggestedTripDays: view.summary.suggestedTripDays,
    parseRequired: view.parseRequired ?? false,
    parsedGuideCount: view.parsedGuideCount ?? 0,
    inspirationCandidateCount: countInspirationCandidates(view.places ?? [], view.summary),
    unmatchedPlaceCount: resolveUnmatchedPlaceCount(view),
  };
}

const GENERATE_ALLOWED_STATUSES = new Set(['understanding', 'awaiting_context', 'draft_ready']);

export interface SessionGenerateCheckInput {
  status: string;
  parseRequired?: boolean;
  parsedGuideCount?: number;
  inspirationCandidateCount?: number;
  pendingConfirmations?: PendingConfirmation[];
  /** 本地已填写的出行条件，用于在 PATCH / understanding 刷新前解除误拦截 */
  tripContext?: GuideTripContext;
}

export function isTravelersContextSatisfied(ctx: GuideTripContext): boolean {
  if (ctx.travelerProfile) return true;
  const t = ctx.travelers;
  if (!t) return false;
  return (t.adults ?? 0) + (t.children ?? 0) + (t.seniors ?? 0) > 0;
}

/** 同行 profile → 后端 travelers 结构（pendingConfirmations 可能校验 travelers 字段） */
export function travelersFromProfile(
  profile: NonNullable<GuideTripContext['travelerProfile']>,
): GuideTravelers {
  switch (profile) {
    case 'solo':
      return { adults: 1 };
    case 'couple':
      return { adults: 2 };
    case 'friends':
      return { adults: 2 };
    case 'family_with_kids':
      return { adults: 2, children: 1 };
    case 'family_with_elderly':
      return { adults: 1, seniors: 1 };
    default:
      return { adults: 1 };
  }
}

export function isTravelContextFieldSatisfied(
  field: PendingConfirmationField,
  ctx: GuideTripContext,
): boolean {
  switch (field) {
    case 'startDate':
      return Boolean(ctx.startDate?.trim());
    case 'endDate':
      return Boolean(ctx.endDate?.trim());
    case 'travelerProfile':
    case 'travelers':
      return isTravelersContextSatisfied(ctx);
    case 'transportMode':
      return Boolean(ctx.transportMode);
    case 'countryCode':
      return Boolean(ctx.countryCode?.trim());
    case 'destination':
      return Boolean(ctx.destination?.trim());
    case 'vehicleType':
      if (ctx.transportMode !== 'self_drive') return true;
      return Boolean(ctx.vehicleType);
    case 'mustKeepExperiences':
      return (ctx.mustKeepExperiences?.length ?? 0) > 0;
    default:
      return false;
  }
}

export function pendingConfirmationReason(p: PendingConfirmation): string | undefined {
  return p.reason ?? p.message;
}

export function checkSessionCanGenerate(input: SessionGenerateCheckInput): {
  allowed: boolean;
  message?: string;
} {
  const {
    status,
    parseRequired,
    parsedGuideCount = 0,
    inspirationCandidateCount = 0,
    pendingConfirmations = [],
    tripContext,
  } = input;

  if (status === 'parsing' || status === 'generating') {
    return { allowed: false, message: '请等待当前解析或生成完成' };
  }

  if (status === 'collecting' || parseRequired) {
    return { allowed: false, message: '请先完成攻略解析后再生成草案' };
  }

  if (!GENERATE_ALLOWED_STATUSES.has(status)) {
    return { allowed: false, message: '请先完成攻略解析后再生成草案' };
  }

  if (parsedGuideCount < 1) {
    return { allowed: false, message: '请先完成攻略解析后再生成草案' };
  }

  if (inspirationCandidateCount < 1) {
    return { allowed: false, message: '解析结果为空，请补充攻略内容或重新解析' };
  }

  const missingRequired = pendingConfirmations.filter((p) => {
    if (!p.required) return false;
    if (tripContext && isTravelContextFieldSatisfied(p.field, tripContext)) return false;
    return true;
  });
  if (missingRequired.length > 0) {
    return {
      allowed: false,
      message: `生成草案前请先完善出行条件：${missingRequired.map((p) => p.label).join('、')}`,
    };
  }

  return { allowed: true };
}

/** 联调手册：导入 / 删除守卫 */
export function sessionCanImport(status: string): boolean {
  return !['parsing', 'generating', 'abandoned', 'accepted'].includes(status);
}

/** 联调手册：发起解析守卫 */
export function sessionCanParse(status: string, importedGuideCount: number): boolean {
  return importedGuideCount > 0 && !['generating', 'abandoned', 'accepted'].includes(status);
}

export function isTripResumeRoute(resumeRoute?: string | null): boolean {
  const route = (resumeRoute ?? '').toLowerCase().trim();
  return route === 'trip' || route.endsWith('/trip');
}

const SOURCE_TYPE_MAP: Record<string, GuideSourceType> = {
  link: 'link',
  text: 'text',
  screenshot: 'screenshot',
  file: 'file',
  manual: 'inspiration',
};

const PLACE_CATEGORY_MAP: Record<UnderstandingPlaceView['candidateType'], ExtractedPlace['category']> =
  {
    poi: 'attraction',
    restaurant: 'restaurant',
    hotel: 'hotel',
    activity: 'activity',
    route_theme: 'area',
  };

export function importedGuideToSource(guide: ImportedGuideView): GuideSource {
  return {
    id: guide.id,
    type: SOURCE_TYPE_MAP[guide.sourceType] ?? 'text',
    title: guide.title ?? undefined,
    url: guide.sourceUrl ?? undefined,
    addedAt: guide.importedAt,
  };
}

export function sourcesFromSession(guides: ImportedGuideView[]): GuideSource[] {
  return guides.map(importedGuideToSource);
}

export function tripContextToApi(ctx: GuideTripContext): GuideTravelContext {
  const preserve = ctx.mustKeepExperiences;
  const travelers =
    ctx.travelers ??
    (ctx.travelerProfile ? travelersFromProfile(ctx.travelerProfile) : undefined);
  return {
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    travelerProfile: ctx.travelerProfile,
    travelers,
    transportMode: ctx.transportMode,
    vehicleType: ctx.vehicleType,
    preserveExperiences: preserve,
    mustKeepExperiences: preserve,
    destination: ctx.destination,
    countryCode: ctx.countryCode,
  };
}

export function tripContextFromApi(ctx: GuideTravelContext | null | undefined): GuideTripContext {
  if (!ctx) return {};
  const travelerProfile = ctx.travelerProfile as GuideTripContext['travelerProfile'];
  return {
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    travelerProfile,
    travelers:
      ctx.travelers ??
      (travelerProfile ? travelersFromProfile(travelerProfile) : undefined),
    transportMode: ctx.transportMode as GuideTripContext['transportMode'],
    vehicleType: ctx.vehicleType,
    mustKeepExperiences: ctx.preserveExperiences ?? ctx.mustKeepExperiences,
    destination: ctx.destination,
    countryCode: ctx.countryCode,
  };
}

/** 分步 PATCH 出行条件：仅序列化传入字段 */
export function tripContextPartialToApi(
  partial: Partial<GuideTripContext>,
): Partial<GuideTravelContext> {
  const out: Partial<GuideTravelContext> = {};
  if ('startDate' in partial) out.startDate = partial.startDate;
  if ('endDate' in partial) out.endDate = partial.endDate;
  if ('travelerProfile' in partial) {
    out.travelerProfile = partial.travelerProfile;
    if (partial.travelerProfile) {
      out.travelers = travelersFromProfile(partial.travelerProfile);
    }
  }
  if ('travelers' in partial) out.travelers = partial.travelers;
  if ('transportMode' in partial) out.transportMode = partial.transportMode;
  if ('vehicleType' in partial) out.vehicleType = partial.vehicleType;
  if ('mustKeepExperiences' in partial) {
    out.preserveExperiences = partial.mustKeepExperiences;
    out.mustKeepExperiences = partial.mustKeepExperiences;
  }
  if ('destination' in partial) out.destination = partial.destination;
  if ('countryCode' in partial) out.countryCode = partial.countryCode;
  return out;
}

export type GuideToPlanFlowStep =
  | 'import'
  | 'parsing'
  | 'summary'
  | 'draft'
  | 'compare'
  | 'review';

export function sessionStatusToFlowStep(status: string): GuideToPlanFlowStep | null {
  switch (status) {
    case 'collecting':
      return 'import';
    case 'parsing':
      return 'parsing';
    case 'understanding':
    case 'awaiting_context':
      return 'summary';
    case 'generating':
    case 'draft_ready':
      return 'draft';
    default:
      return null;
  }
}

const RESUME_ROUTE_STEP: Record<string, GuideToPlanFlowStep> = {
  import: 'import',
  collecting: 'import',
  parsing: 'parsing',
  parse: 'parsing',
  parse_progress: 'parsing',
  summary: 'summary',
  understanding: 'summary',
  context: 'summary',
  travel_context: 'summary',
  'travel-context': 'summary',
  awaiting_context: 'summary',
  draft: 'draft',
  generating: 'draft',
  draft_ready: 'draft',
  compare: 'compare',
  comparison: 'compare',
  review: 'review',
  'review-items': 'review',
};

/** 从 resumeRoute 解析流程步骤，无法解析时回退 status */
export function resumeRouteToFlowStep(
  resumeRoute?: string | null,
  fallbackStatus?: string,
): GuideToPlanFlowStep | null {
  const route = (resumeRoute ?? '').trim();
  if (route) {
    const normalized = route.toLowerCase();
    const segment = normalized.split('?')[0].split('/').filter(Boolean).pop() ?? normalized;
    if (RESUME_ROUTE_STEP[segment]) return RESUME_ROUTE_STEP[segment];
    for (const [key, step] of Object.entries(RESUME_ROUTE_STEP)) {
      if (normalized.includes(key)) return step;
    }
  }
  return sessionStatusToFlowStep(fallbackStatus ?? '');
}

export function resolveSessionFlowStep(session: {
  resumeRoute?: string | null;
  status: string;
  parseProgress?: { status?: string } | null;
}): GuideToPlanFlowStep | null {
  if (isTripResumeRoute(session.resumeRoute) || session.status === 'accepted') {
    return null;
  }
  if (session.parseProgress?.status === 'failed') {
    return 'import';
  }
  return resumeRouteToFlowStep(session.resumeRoute, session.status);
}

/** 仅 draft_ready 可 accept / confirm（联调手册 Breaking Change） */
export function sessionCanAcceptDraft(status: string): boolean {
  return status === 'draft_ready';
}

/** @deprecated 使用 sessionCanImport */
export function sessionBlocksImport(status: string): boolean {
  return !sessionCanImport(status);
}

/** 生成中不可发起解析 */
export function sessionBlocksParse(status: string): boolean {
  return status === 'generating';
}

/** 攻略正文/提取内容字数上限（与后端 GUIDE_CONTENT_MAX_CHARS 一致） */
export const GUIDE_CONTENT_MAX_CHARS = 80_000;

export function validateGuideTextContent(content: string): string | null {
  if (content.length > GUIDE_CONTENT_MAX_CHARS) {
    return `攻略内容过长（${content.length.toLocaleString()} 字），上限 ${GUIDE_CONTENT_MAX_CHARS.toLocaleString()} 字`;
  }
  return null;
}

/** 导入链接基础校验（http/https） */
export function validateGuideLinkUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return '请输入链接';
  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '链接须以 http 或 https 开头';
    }
    if (!parsed.hostname) return '请输入有效的网页链接';
    return null;
  } catch {
    return '请输入有效的网页链接';
  }
}

function mapPlace(p: UnderstandingPlaceView): ExtractedPlace {
  const match = p.matchStatus ?? p.poiMatchStatus;
  const matchConfidence =
    match === 'matched'
      ? 'HIGH'
      : match === 'ambiguous'
        ? 'MEDIUM'
        : 'NONE';

  return {
    id: p.id,
    name: p.rawName,
    nameEN: p.rawNameEn ?? undefined,
    category: PLACE_CATEGORY_MAP[p.candidateType] ?? 'other',
    sourceGuideIds: [],
    matchedPlaceId: p.matchedPoiId ?? undefined,
    matchConfidence,
    confidence: p.credibilityLevel ?? 'L1',
  };
}

export function understandingToBundleSummary(view: GuideUnderstandingView): GuideBundleSummary {
  const places = view.places.filter((p) => p.candidateType === 'poi' || p.candidateType === 'activity');
  const restaurants = view.places.filter((p) => p.candidateType === 'restaurant');
  const accommodations = view.places.filter((p) => p.candidateType === 'hotel');
  const routes = view.places.filter((p) => p.candidateType === 'route_theme');
  const allMatchablePlaces = view.places ?? [];
  const unmatchedPlaces = allMatchablePlaces.filter(isUnmatchedPlaceCandidate);

  const mappedPlaces = places.map(mapPlace);
  const mappedRestaurants = restaurants.map(mapPlace);
  const mappedHotels = accommodations.map(mapPlace);

  const claims: GuideClaim[] =
    view.claims?.map((c) => ({
      id: c.id,
      claimType: (c.claimType as GuideClaim['claimType']) ?? 'general_opinion',
      statement: c.statement,
      sourceGuideId: '',
      confidence: c.credibilityLevel ?? 'L1',
      verificationStatus: 'UNVERIFIED',
    })) ?? [];

  const baseRiskHints: GuideRiskHint[] =
    view.riskHints?.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      severity: r.severity ?? 'warning',
      needsVerification: true,
      sourceGuideIds: [],
    })) ??
    view.summary.potentialIssues.map((issue, i) => ({
      id: `issue_${i}`,
      title: issue,
      description: issue,
      severity: 'info' as const,
      needsVerification: true,
      sourceGuideIds: [],
    }));

  const riskHints = normalizeUnmatchedRiskHints(baseRiskHints, allMatchablePlaces);

  return {
    guideIds: [],
    themeSummary: view.themeNarrative ?? '已从攻略中整理出旅行主线',
    destinationHint: undefined,
    suggestedDays: view.summary.suggestedTripDays ?? undefined,
    places: mappedPlaces,
    restaurants: mappedRestaurants,
    accommodations: mappedHotels,
    tips: [],
    claims,
    routes: routes.map((r) => ({
      id: r.id,
      label: r.rawName,
      placeNames: [r.rawName],
      sourceGuideId: '',
    })),
    riskHints,
    unmatchedPlaceNames: unmatchedPlaces.map((p) => p.rawName),
    stats: {
      placeCount: view.summary.placeCount,
      restaurantCount: view.summary.restaurantCount,
      accommodationCount: view.summary.hotelAreaCount,
      tipCount: view.summary.tipCount,
      riskCount: view.summary.riskCount,
    },
  };
}

function mapDiffRow(row: ComparisonDiffRow, index: number): PlanAdjustmentRow {
  return {
    id: row.id ?? `adj_${index}`,
    category: row.category,
    originalGuide: row.originalGuide,
    adjustedPlan: row.adjustedPlan,
    reason: row.reason,
  };
}

export function planCandidateViewToUi(
  view: GuidePlanCandidateDetailView,
  sourceGuideIds: string[] = [],
): PlanCandidate {
  return {
    id: view.id,
    sourceGuideIds,
    status: 'DRAFT',
    variant: view.variant,
    label: view.label,
    description: view.description,
    recommended: view.recommended,
    feasibilityScore: view.feasibilityScore,
    pendingConfirmations: view.pendingConfirmations?.map((p) => p.label),
    itineraryDraft: view.itineraryDraft,
    retainedItems: [],
    modifiedItems: view.comparisonDiff.map((d) => d.adjustedPlan),
    rejectedItems: [],
    decisionReasons: view.warnings ?? [],
    warnings: view.warnings,
    adjustments: view.comparisonDiff.map(mapDiffRow),
    disclaimer:
      view.disclaimer ??
      '尚未完成全部约束验证。请确认可行性与风险后再进入正式规划。',
  };
}

export interface DraftDayTableRow {
  day: number;
  date?: string;
  theme: string;
  route: string;
  drive: string;
  stay: string;
  driveKm?: string;
  driveHours?: string;
}

export interface PlanVariantPresentation {
  label: string;
  description: string;
  tags: string[];
}

export const PLAN_VARIANT_PRESENTATION: Record<PlanVariant, PlanVariantPresentation> = {
  faithful: {
    label: '忠于攻略版',
    description: '尽量保留原攻略路线与顺序 / 体验最完整，节奏紧凑',
    tags: ['景点最多', '步行较多'],
  },
  comfortable: {
    label: '舒适可执行版',
    description: '优化节奏与路程，减少奔波 / 老人友好，体验更均衡',
    tags: ['节奏舒适'],
  },
  balanced: {
    label: '均衡草案',
    description: '在忠于攻略与可执行性之间取平衡，适合多数场景',
    tags: ['节奏均衡'],
  },
  risk_min: {
    label: '风险最低版',
    description: '避开高风险路段与不确定因素 / 保守稳妥，天气友好',
    tags: ['路况友好', '灵活度高'],
  },
  photography: {
    label: '摄影主题版',
    description: '优先黄金时段与经典机位 / 适合摄影爱好者',
    tags: ['黄金时段', '机位优先'],
  },
};

const PLAN_VARIANT_DISPLAY_ORDER: PlanVariant[] = [
  'faithful',
  'comfortable',
  'risk_min',
  'balanced',
  'photography',
];

export type PresentedPlanCandidate = GuidePlanCandidateDetailView & {
  displayLabel: string;
  displayDescription: string;
  displayTags: string[];
};

export function presentPlanCandidate(
  candidate: GuidePlanCandidateDetailView,
): PresentedPlanCandidate {
  const meta = PLAN_VARIANT_PRESENTATION[candidate.variant] ?? PLAN_VARIANT_PRESENTATION.balanced;
  return {
    ...candidate,
    displayLabel: candidate.label?.trim() || meta.label,
    displayDescription: candidate.description?.trim() || meta.description,
    displayTags: meta.tags,
  };
}

export function sortPlanCandidatesForDisplay(
  candidates: GuidePlanCandidateDetailView[],
): PresentedPlanCandidate[] {
  return [...candidates]
    .map(presentPlanCandidate)
    .sort((a, b) => {
      const ia = PLAN_VARIANT_DISPLAY_ORDER.indexOf(a.variant);
      const ib = PLAN_VARIANT_DISPLAY_ORDER.indexOf(b.variant);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

export type PlanVariantSlot =
  | { status: 'ready'; candidate: PresentedPlanCandidate }
  | { status: 'pending'; variant: PlanVariant; label: string; description: string; tags: string[] };

export function buildPlanVariantSlots(
  candidates: GuidePlanCandidateDetailView[],
  targetVariants: PlanVariant[] = ['faithful', 'comfortable', 'risk_min'],
): PlanVariantSlot[] {
  const presented = sortPlanCandidatesForDisplay(candidates);
  const usedIds = new Set<string>();

  const matchesVariant = (candidate: PresentedPlanCandidate, variant: PlanVariant) => {
    if (candidate.variant === variant) return true;
    if (variant === 'comfortable' && candidate.variant === 'balanced') return true;
    return false;
  };

  const slots: PlanVariantSlot[] = targetVariants.map((variant) => {
    const ready = presented.find((c) => !usedIds.has(c.id) && matchesVariant(c, variant));
    if (ready) {
      usedIds.add(ready.id);
      return { status: 'ready', candidate: ready };
    }
    const meta = PLAN_VARIANT_PRESENTATION[variant] ?? PLAN_VARIANT_PRESENTATION.balanced;
    return {
      status: 'pending',
      variant,
      label: meta.label,
      description: meta.description,
      tags: meta.tags,
    };
  });

  const orphan = presented.find((c) => !usedIds.has(c.id));
  if (orphan) {
    const comfortableIdx = targetVariants.indexOf('comfortable');
    if (comfortableIdx >= 0 && slots[comfortableIdx].status === 'pending') {
      slots[comfortableIdx] = { status: 'ready', candidate: orphan };
      usedIds.add(orphan.id);
    }
  }

  return slots;
}

export function itineraryDraftToTableRows(
  draft?: ItineraryDraftView | { days?: ItineraryDraftDay[] } | null,
): DraftDayTableRow[] {
  if (!draft?.days?.length) return [];
  return draft.days.map((d, index) => formatDraftDayRow(d, index));
}

export function routeAvailabilityBadge(level?: string): {
  label: string;
  className: string;
} | null {
  switch (level) {
    case 'route_recommended':
      return { label: '路线推荐', className: 'bg-muted text-success border-gate-allow-border' };
    case 'route_operationally_available':
      return { label: '可通行', className: 'bg-amber-100 text-amber-900 border-amber-200' };
    case 'route_legally_allowed':
      return { label: '合法但需留意', className: 'bg-orange-100 text-orange-900 border-orange-200' };
    case 'route_exists':
      return { label: '路线存在', className: 'bg-muted text-muted-foreground border-border' };
    case 'route_blocked':
      return { label: '道路拦截', className: 'bg-destructive/10 text-destructive border-destructive/30' };
    default:
      return null;
  }
}

export function routeStopsFromDraft(draft?: ItineraryDraftView | null): string[] {
  if (draft?.routeStops?.length) return draft.routeStops;
  if (!draft?.days?.length) return [];
  const stops: string[] = [];
  for (const day of draft.days) {
    const items = (day as { items?: Array<{ name?: string; type?: string }> }).items;
    const daytimeItems = items?.filter((item) => !isOvernightDraftItemType(item.type)) ?? [];
    if (daytimeItems.length > 0) {
      daytimeItems.forEach((item) => {
        if (item.name && !stops.includes(item.name)) stops.push(item.name);
      });
    } else {
      day.activities?.forEach((a) => {
        if (a.name && !stops.includes(a.name)) stops.push(a.name);
      });
    }
    if (day.theme && !stops.includes(day.theme)) stops.push(day.theme);
  }
  return stops;
}

/** 无精确里程时按自驾均速估算（与 feasibility-travel-timing 一致：约 50 km/h） */
const SELF_DRIVE_KPH = 50;

const OVERNIGHT_ITEM_TYPES = new Set([
  'hotel',
  'accommodation',
  'lodging',
  'stay',
  'overnight',
  'hotel_area',
  'area',
]);

interface DraftDayItemView {
  name?: string;
  type?: string;
  travelMinutesFromPrev?: number;
  travelDistanceKm?: number;
  travelKmFromPrev?: number;
  distanceKm?: number;
}

export function formatItineraryDraftAccommodation(
  accommodation?: ItineraryDraftAccommodation | string | null,
): string | undefined {
  if (accommodation == null) return undefined;
  if (typeof accommodation === 'string') {
    const trimmed = accommodation.trim();
    return trimmed || undefined;
  }

  const name = accommodation.name?.trim() || accommodation.nameEn?.trim();
  const areaHint = accommodation.areaHint?.trim();

  if (accommodation.type === 'area') {
    return areaHint || name;
  }

  if (name && areaHint && !name.includes(areaHint)) {
    return `${name}（${areaHint}）`;
  }

  return name || areaHint;
}

function isOvernightDraftItemType(type?: string): boolean {
  if (!type) return false;
  const normalized = type.toLowerCase();
  return (
    OVERNIGHT_ITEM_TYPES.has(normalized) ||
    /hotel|accommodation|lodging|stay|overnight/.test(normalized)
  );
}

function daytimeDraftItems(items?: DraftDayItemView[]): DraftDayItemView[] {
  return (items ?? []).filter((item) => !isOvernightDraftItemType(item.type));
}

function stayFromOvernightItems(items?: DraftDayItemView[]): string | undefined {
  if (!items?.length) return undefined;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (isOvernightDraftItemType(item.type) && item.name?.trim()) {
      return item.name.trim();
    }
  }
  return undefined;
}

function readOptionalNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function readOptionalString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function aggregateDraftItemMetrics(items?: DraftDayItemView[]): {
  travelMinutes?: number;
  travelKm?: number;
} {
  if (!items?.length) return {};

  let travelMinutes = 0;
  let travelKm = 0;
  let hasMinutes = false;
  let hasKm = false;

  for (const item of items) {
    const minutes = readOptionalNumber(item.travelMinutesFromPrev);
    if (minutes != null) {
      travelMinutes += minutes;
      hasMinutes = true;
    }

    const km = readOptionalNumber(
      item.travelDistanceKm,
      item.travelKmFromPrev,
      item.distanceKm,
    );
    if (km != null) {
      travelKm += km;
      hasKm = true;
    }
  }

  return {
    travelMinutes: hasMinutes ? travelMinutes : undefined,
    travelKm: hasKm ? travelKm : undefined,
  };
}

function inferStayFromRoute(route: string): string | undefined {
  const segments = route
    .split(/\s*(?:→|->|—|–)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (segments.length < 2) return undefined;
  const last = segments[segments.length - 1];
  if (!last || last === '—') return undefined;
  if (/瀑布|教堂|沙滩|冰川|博物馆|机场|游客中心|Bar|bar/i.test(last)) return undefined;
  return last;
}

function estimateDriveKmFromMinutes(minutes: number): string {
  return `${Math.max(1, Math.round((minutes / 60) * SELF_DRIVE_KPH))} km`;
}

function formatDriveKmLabel(km?: number, estimatedFromMinutes?: number): string | undefined {
  if (km != null) return `${Math.round(km)} km`;
  if (estimatedFromMinutes != null) return estimateDriveKmFromMinutes(estimatedFromMinutes);
  return undefined;
}
function formatDraftDayRow(d: ItineraryDraftDay, index: number): DraftDayTableRow {
  const raw = d as ItineraryDraftDay & Record<string, unknown>;
  const items = (d as { items?: DraftDayItemView[] }).items;
  const daytimeItems = daytimeDraftItems(items);
  const itemMetrics = aggregateDraftItemMetrics(daytimeItems);

  const drivingMinutes =
    readOptionalNumber(
      (d as { drivingMinutesEstimate?: number }).drivingMinutesEstimate,
      raw.driving_minutes_estimate,
      itemMetrics.travelMinutes,
    ) ?? undefined;

  const drivingKm =
    readOptionalNumber(
      d.drivingKm,
      raw.driving_km,
      raw.drivingDistanceKm,
      raw.totalDrivingKm,
      itemMetrics.travelKm,
    ) ?? undefined;

  const driveParts: string[] = [];
  if (drivingMinutes != null) driveParts.push(`${Math.round(drivingMinutes / 60)}h`);
  if (drivingKm != null) driveParts.push(`${drivingKm}km`);
  const driveTime = d.drivingDuration ?? d.drivingTime ?? readOptionalString(raw.driving_duration, raw.driving_time);
  if (driveTime) driveParts.push(driveTime);

  const route =
    d.route ??
    daytimeItems.map((item) => item.name).filter(Boolean).join(' → ') ??
    d.activities?.map((a) => a.name).filter(Boolean).join(' → ') ??
    '—';

  const stay =
    formatItineraryDraftAccommodation(d.accommodation) ??
    readOptionalString(
      d.stay,
      raw.overnightLocation,
      raw.overnight_location,
      raw.stayCity,
      raw.stay_city,
    ) ??
    d.hotels
      ?.map((hotel) => (hotel.area ? `${hotel.name}（${hotel.area}）` : hotel.name))
      .filter(Boolean)
      .join('、') ??
    stayFromOvernightItems(items) ??
    inferStayFromRoute(route) ??
    '—';

  return {
    day: d.day ?? d.dayNumber ?? index + 1,
    date: d.date,
    theme: d.theme ?? '—',
    route,
    drive: driveParts.length ? driveParts.join(' · ') : '—',
    stay,
    driveKm: formatDriveKmLabel(drivingKm, drivingMinutes) ?? extractDriveKm(driveParts),
    driveHours: extractDriveHours(driveParts, drivingMinutes, driveTime),
  };
}

function extractDriveKm(parts: string[]): string | undefined {
  const km = parts.find((p) => /km/i.test(p));
  return km ? km.replace(/km/i, ' km') : undefined;
}

function extractDriveHours(
  parts: string[],
  drivingMinutes?: number,
  driveTime?: string,
): string | undefined {
  if (drivingMinutes != null) return `${Math.max(1, Math.round(drivingMinutes / 60))}h`;
  const h = parts.find((p) => /\dh/i.test(p) || p.endsWith('h'));
  if (h) return h;
  if (driveTime) return driveTime;
  return undefined;
}

export function legacyCandidateToDetail(candidate: PlanCandidate): GuidePlanCandidateDetailView {
  return {
    id: candidate.id,
    variant: 'comfortable',
    label: '舒适可执行版',
    description: '优化节奏，减少长途驾驶，适合多数用户',
    recommended: true,
    feasibilityScore: candidate.feasibilityScore ?? 72,
    pendingConfirmations: [],
    comparisonDiff: candidate.adjustments.map((a) => ({
      id: a.id,
      category: a.category,
      originalGuide: a.originalGuide,
      adjustedPlan: a.adjustedPlan,
      reason: a.reason,
    })),
    warnings: candidate.warnings ?? candidate.decisionReasons,
    disclaimer: candidate.disclaimer,
    itineraryDraft: candidate.itineraryDraft ?? null,
  };
}

export function feasibilityScoreLabel(score?: number): string {
  if (score == null) return '待评估';
  if (score >= 80) return '高 — 多数约束已满足';
  if (score >= 60) return '中高 — 部分路段依赖天气';
  if (score >= 40) return '中 — 仍有待确认项';
  return '低 — 建议先补齐出行条件';
}

export function parseStepToProgressPercent(step?: string, progress?: number): number {
  if (typeof progress === 'number') {
    return Math.round(Math.min(1, Math.max(0, progress)) * 100);
  }
  const weights: Record<string, number> = {
    content_analysis: 12,
    place_extraction: 38,
    route_identification: 62,
    fact_verification: 88,
    draft_generation: 100,
  };
  if (step && step in weights) return weights[step];
  return 0;
}

/** 解析管线步骤 → 0-based 步骤索引（内容解析 … 生成草案） */
export function parseStepToPipelineIndex(step?: string): number {
  const index: Record<string, number> = {
    content_analysis: 0,
    place_extraction: 1,
    route_identification: 2,
    fact_verification: 3,
    draft_generation: 4,
  };
  if (step && step in index) return index[step]!;
  return 0;
}
