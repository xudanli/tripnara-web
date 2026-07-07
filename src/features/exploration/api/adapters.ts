import type {
  RouteCandidateView,
  ConsumerIssueView,
  IssuesListResponse,
  RouteDayView,
  RouteDetailResponse,
} from './types';
import type { CompareRouteCard, RouteCandidateMock, RouteStrategyId } from '../types';
import { ROUTE_CANDIDATES, getRouteById } from '../data/mock-iceland';
import { getRouteMapData } from '../data/iceland-route-maps';
import {
  normalizeRouteMap,
  resolveRouteLookupKey,
  resolveRouteMapForDisplay,
  type NormalizedRouteMap,
} from '../lib/route-map.util';
import { toApiRouteId } from '../lib/route-id.util';
import { normalizeResolvedPois } from '@/features/poi-resolution/api/helpers';
import {
  isReasonableIcelandMapPoint,
  normalizeRouteMapPoint,
} from '../lib/normalize-route-map-point';

const IMAGE_GRADIENTS = [
  'from-muted/70 via-background to-muted/50',
  'from-muted/60 via-background to-muted/40',
  'from-muted/80 via-muted/30 to-background',
] as const;

/** API 可能返回 string 或 { id, label } */
export type ExplorationLabeledItem = string | { id: string; label: string };

export function normalizeLabeledItems(items?: ExplorationLabeledItem[]): string[] {
  if (!items?.length) return [];
  return items.map((item) => (typeof item === 'string' ? item : item.label || item.id));
}

export function labeledItemKey(item: ExplorationLabeledItem, index: number): string {
  return typeof item === 'string' ? item : item.id || `item-${index}`;
}

function resolveMockFallback(routeId: string, index: number): RouteCandidateMock {
  const lookup = resolveRouteLookupKey(routeId);
  const exact = getRouteById(lookup) ?? getRouteById(routeId);
  if (exact) return exact;
  const partial = ROUTE_CANDIDATES.find(
    (r) => routeId.includes(r.id) || r.id.includes(routeId.replace(/^route_/, '')),
  );
  return partial ?? ROUTE_CANDIDATES[index % ROUTE_CANDIDATES.length];
}

function resolveMapGeometry(
  routeKey: string,
  apiMap?: NormalizedRouteMap,
): NormalizedRouteMap | undefined {
  return apiMap ?? getRouteMapData(routeKey);
}

function mergeDays(apiDays: RouteDayView[] | undefined, mockDays: RouteCandidateMock['detail']['days']) {
  if (!apiDays?.length) return mockDays;
  return apiDays.map((apiDay) => {
    const mockDay = mockDays.find((d) => d.day === apiDay.day);
    return {
      day: apiDay.day,
      theme: apiDay.theme || mockDay?.theme || '',
      route: apiDay.route || mockDay?.route || '',
      driving: apiDay.driving || mockDay?.driving || '',
      experience: apiDay.experience || mockDay?.experience || '',
      stay: apiDay.stay || mockDay?.stay || '',
      tip: apiDay.tip ?? mockDay?.tip,
      highlight: apiDay.highlight ?? mockDay?.highlight,
      mapPoint: (() => {
        const apiPoint = normalizeRouteMapPoint(apiDay.mapPoint);
        const mockPoint = normalizeRouteMapPoint(mockDay?.mapPoint);
        if (apiPoint && isReasonableIcelandMapPoint(apiPoint)) return apiPoint;
        if (mockPoint && isReasonableIcelandMapPoint(mockPoint)) return mockPoint;
        return undefined;
      })(),
    };
  });
}

/** 比较页专用 — 纯 API 映射，保留后端 routeId */
export function mapCompareCandidatesFromApi(apiCandidates: RouteCandidateView[]): CompareRouteCard[] {
  return apiCandidates.map((api, index) => {
    const apiRouteId = api.routeId || toApiRouteId(api.strategyId || '');
    const id = apiRouteId || api.strategyId || `route-${index}`;
    const previewMap = normalizeRouteMap(api.preview?.map);

    return {
      id,
      apiRouteId,
      title: api.title,
      tagline: api.tagline,
      narrative: api.narrative,
      previewSummary: api.preview?.summary,
      generationSource: api.generationSource,
      badge: api.badge
        ? {
            label: api.badge.label,
            tone:
              api.badge.tone === 'recommended' || api.badge.tone === 'niche'
                ? api.badge.tone
                : ('recommended' as const),
          }
        : undefined,
      gains: normalizeLabeledItems(api.gains),
      sacrifices: normalizeLabeledItems(api.sacrifices),
      matchScore: api.matchScore,
      matchSummary: api.matchSummary,
      previewMap: previewMap ?? undefined,
      resolvedPois: normalizeResolvedPois(api.resolvedPois),
    };
  });
}

export function mergeCandidatesWithMock(apiCandidates: RouteCandidateView[]): RouteCandidateMock[] {
  if (apiCandidates.length === 0) return ROUTE_CANDIDATES;

  return apiCandidates.map((api, index) => {
    const mock = resolveMockFallback(api.routeId || api.strategyId || '', index);
    const routeKey = resolveRouteLookupKey(api.routeId || api.strategyId || mock.id);
    const previewMap = normalizeRouteMap(api.preview?.map);

    return {
      ...mock,
      id: (routeKey as RouteStrategyId) || mock.id,
      apiRouteId: api.routeId || toApiRouteId(api.strategyId || routeKey),
      title: api.title || mock.title,
      tagline: api.tagline || api.narrative || mock.tagline,
      badge: api.badge
        ? {
            label: api.badge.label,
            tone:
              api.badge.tone === 'recommended' || api.badge.tone === 'niche'
                ? api.badge.tone
                : ('recommended' as const),
          }
        : mock.badge,
      audience: api.audience || mock.audience,
      gains: api.gains?.length ? normalizeLabeledItems(api.gains) : mock.gains,
      sacrifices: api.sacrifices?.length ? normalizeLabeledItems(api.sacrifices) : mock.sacrifices,
      metrics: api.metrics
        ? {
            drivingHoursPerDay:
              api.metrics.drivingHoursPerDay ?? mock.metrics.drivingHoursPerDay,
            drivingLevel: api.metrics.drivingLevel ?? mock.metrics.drivingLevel,
            explorationLevel: api.metrics.explorationLevel ?? mock.metrics.explorationLevel,
            uncertainty: api.metrics.uncertainty ?? mock.metrics.uncertainty,
          }
        : mock.metrics,
      matchScore: api.matchScore ?? mock.matchScore,
      matchSummary: api.matchSummary ?? mock.matchSummary,
      generationSource: api.generationSource ?? mock.generationSource,
      narrative: api.narrative ?? mock.narrative,
      imageGradient: mock.imageGradient || IMAGE_GRADIENTS[index % IMAGE_GRADIENTS.length],
      previewMap: previewMap ?? resolveMapGeometry(routeKey, undefined),
    };
  });
}

export function mergeRouteDetailWithMock(
  api: RouteDetailResponse,
  routeIdParam: string,
): { route: RouteCandidateMock; apiRouteId: string } {
  const lookupKey = resolveRouteLookupKey(api.routeId || api.strategyId || routeIdParam);
  const mock = resolveMockFallback(lookupKey, 0);
  const apiMap = normalizeRouteMap(api.detail?.map);
  const mockMap = resolveMapGeometry(lookupKey, undefined);
  const days = mergeDays(api.detail?.days, mock.detail.days);
  const detailMap = resolveRouteMapForDisplay({
    days,
    map: apiMap,
    fallbackMainLine: mockMap?.mainLine,
    fallbackFRoadLine: mockMap?.fRoadLine,
  });

  const route: RouteCandidateMock = {
    ...mock,
    id: (lookupKey as RouteStrategyId) || mock.id,
    apiRouteId: api.routeId || toApiRouteId(routeIdParam),
    title: api.title || mock.title,
    tagline: api.tagline || mock.tagline,
    badge: api.badge
      ? {
          label: api.badge.label,
          tone:
            api.badge.tone === 'recommended' || api.badge.tone === 'niche'
              ? api.badge.tone
              : ('recommended' as const),
        }
      : mock.badge,
    detail: {
      summary: api.detail?.summary || mock.detail.summary,
      totalKm: api.detail?.totalKm ?? mock.detail.totalKm,
      avgDrivingHours: api.detail?.avgDrivingHours ?? mock.detail.avgDrivingHours,
      stayChanges: api.detail?.stayChanges ?? mock.detail.stayChanges,
      regions: api.detail?.regions?.length ? api.detail.regions : mock.detail.regions,
      days,
      map: detailMap,
      highlights: api.detail?.highlights?.length ? api.detail.highlights : mock.detail.highlights,
      preparations: api.detail?.preparations?.length
        ? api.detail.preparations
        : mock.detail.preparations,
    },
  };

  return { route, apiRouteId: route.apiRouteId ?? api.routeId ?? toApiRouteId(routeIdParam) };
}

export const MOCK_BLOCK_ISSUE: ConsumerIssueView = {
  issueId: 'issue-f208-vehicle',
  severity: 'BLOCK',
  headline: '第 5 天高地路线与当前车辆不匹配',
  explanation:
    '根据冰岛道路管理规定，F208 高地道路要求使用四驱车辆。你当前选择的是 2WD，不符合通行条件。',
  consequence: '你选择的车辆无法合法、安全地完成该路段。',
  affectedDay: 5,
  affectedSegmentLabel: '南岸 → F208 → 东部峡湾',
  decisionRequired: true,
  source: {
    gatewayAssessmentBatchId: 'mock-batch-001',
    canonicalIssueId: 'vehicle-f208-mismatch',
    tripId: 'mock-trip',
    tripVersion: 1,
  },
};

export const MOCK_ISSUES_RESPONSE: IssuesListResponse = {
  displayedIssues: [MOCK_BLOCK_ISSUE],
  totalIssueCount: 2,
  displayPolicy: { maxIssues: 1, preferredSeverity: 'BLOCK' },
};

export function mapIssuesResponse(data: IssuesListResponse | null | undefined): IssuesListResponse {
  if (data) return data;
  return MOCK_ISSUES_RESPONSE;
}
