/**
 * 探索规划 — 路线比较（PRD §10.4 + AI 路线生成联调）
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ExploreFlowLayout } from '@/features/exploration/components/ExploreFlowLayout';
import { CandidatesStaleBanner } from '@/features/exploration/components/CandidatesStaleBanner';
import { ScenarioSummaryBar } from '@/features/exploration/components/ScenarioSummaryBar';
import { exploreBasePath } from '@/features/exploration/constants';
import { exploreUi } from '@/features/exploration/explore-ui';
import { cn } from '@/lib/utils';
import {
  ensureFreshCandidates,
  fetchScenarioDetail,
  isRouteAlreadySelected,
  regenerateCandidates,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import {
  getComparePageHeadline,
  getComparePageSubtitle,
  getGenerationSourceBadge,
  getStaleCandidatesBannerText,
  shouldRegenerateCandidates,
} from '@/features/exploration/api/helpers';
import type { ExplorationCandidatesStatus, ExplorationGenerationMode, RouteCompareDimension } from '@/features/exploration/api/types';
import { mapCompareCandidatesFromApi } from '@/features/exploration/api/adapters';
import {
  formatCompareCellNote,
  getCompareDimensionValue,
  resolveCompareDimensionsFromPayload,
} from '@/features/exploration/lib/compare-dimensions.util';
import type { CompareRouteCard } from '@/features/exploration/types';
import { pickRecommendedCompareRoute } from '@/features/exploration/lib/recommend-route.util';
import { resolveUserCompareFocusRouteId } from '@/features/exploration/lib/compare-highlight.util';
import { readFlowStateForScenario } from '@/features/exploration/flow-state';
import { useAuth } from '@/hooks/useAuth';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import {
  loadExplorationCompareData,
  regenerateExplorationCandidates,
} from '@/features/exploration/travel-context/exploration-travel-context';
import {
  RouteStrategyCard,
  PoiConfirmationSheet,
  PoiEvidenceDrawer,
  UnresolvedPoisBanner,
  applyConfirmResultToPoi,
  countUnresolvedPois,
  getUnresolvedPoisBannerText,
  mapResolvedPoisToChips,
} from '@/features/poi-resolution';
import type { ConfirmPoiResponse, PoiChipViewModel, ResolvedPoi } from '@/features/poi-resolution/types';

function sourceBadgeClass(tone: 'default' | 'info' | 'niche'): string {
  if (tone === 'niche') return exploreUi.badgeNiche;
  if (tone === 'info') {
    return 'text-[10px] px-2 py-0.5 rounded-full font-medium border border-border bg-muted text-foreground';
  }
  return exploreUi.badgeNiche;
}

function updateRouteResolvedPoi(
  routes: CompareRouteCard[],
  routeId: string,
  queryName: string,
  updater: (poi: ResolvedPoi) => ResolvedPoi,
): CompareRouteCard[] {
  return routes.map((route) => {
    if (route.id !== routeId) return route;
    return {
      ...route,
      resolvedPois: route.resolvedPois?.map((poi) =>
        poi.name === queryName ? updater(poi) : poi,
      ),
    };
  });
}

export default function ExploreComparePage() {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { accessToken } = useAuth();
  const travelContext = useExplorationTravelContext();

  const [routes, setRoutes] = useState<CompareRouteCard[]>([]);
  const [compareDimensions, setCompareDimensions] = useState<RouteCompareDimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<ExplorationGenerationMode | undefined>();
  const [candidatesStatus, setCandidatesStatus] = useState<ExplorationCandidatesStatus | undefined>();
  const [confirmPoi, setConfirmPoi] = useState<{ routeId: string; poi: ResolvedPoi } | null>(null);
  const [evidencePoi, setEvidencePoi] = useState<ResolvedPoi | null>(null);
  const [dimensionsExpanded, setDimensionsExpanded] = useState(false);

  const flow = readFlowStateForScenario(scenarioId);
  const compareFocusRouteId = flow?.compareFocusRouteId;

  const loadCompare = useCallback(async () => {
    setLoading(true);
    try {
      const provider = travelContext.getProvider();
      if (travelContext.enabled && provider) {
        const { detail, bundle, action } = await loadExplorationCompareData(provider);
        setCandidatesStatus(detail.candidatesStatus);
        setGenerationMode(bundle.generationMode ?? detail.candidatesStatus?.generationMode);
        setRoutes(mapCompareCandidatesFromApi(bundle.candidates));
        setCompareDimensions(resolveCompareDimensionsFromPayload(bundle, bundle.candidates));
        if (action === 'GENERATED') {
          setCandidatesStatus((prev) =>
            prev
              ? { ...prev, status: 'READY' }
              : {
                  status: 'READY',
                  activeCount: bundle.candidates.length,
                  generationVersion: bundle.generationVersion,
                },
          );
        }
        return;
      }

      const detail = await fetchScenarioDetail(scenarioId);
      setCandidatesStatus(detail.candidatesStatus);
      setGenerationMode(detail.candidatesStatus?.generationMode);

      const bundle = await ensureFreshCandidates(scenarioId, detail);
      setGenerationMode(bundle.generationMode ?? detail.candidatesStatus?.generationMode);
      setRoutes(mapCompareCandidatesFromApi(bundle.candidates));
      setCompareDimensions(resolveCompareDimensionsFromPayload(bundle, bundle.candidates));

      if (bundle.action === 'GENERATED') {
        setCandidatesStatus((prev) =>
          prev ? { ...prev, status: 'READY' } : { status: 'READY', activeCount: bundle.candidates.length, generationVersion: bundle.generationVersion },
        );
      }
      if (import.meta.env.DEV) {
        console.info('[explore/compare] loaded from API', {
          candidateCount: bundle.candidates.length,
          dimensionCount: bundle.dimensions?.length ?? 0,
          generationMode: bundle.generationMode,
          routeIds: bundle.candidates.map((c) => c.routeId),
        });
      }
    } catch (err) {
      console.warn('[explore/compare] API failed', err);
      toast.error(err instanceof Error ? err.message : '加载对比数据失败');
      setRoutes([]);
      setCompareDimensions([]);
    } finally {
      setLoading(false);
    }
  }, [scenarioId, travelContext.enabled, travelContext.getProvider]);

  useEffect(() => {
    void loadCompare();
  }, [loadCompare]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const provider = travelContext.getProvider();
      const bundle =
        travelContext.enabled && provider
          ? await regenerateExplorationCandidates(provider)
          : await regenerateCandidates(scenarioId);
      setRoutes(mapCompareCandidatesFromApi(bundle.candidates));
      setCompareDimensions(resolveCompareDimensionsFromPayload(bundle, bundle.candidates));
      setGenerationMode(bundle.generationMode);
      setCandidatesStatus((prev) =>
        prev
          ? {
              ...prev,
              status: 'READY',
              generationVersion: bundle.generationVersion,
              generationMode: bundle.generationMode ?? prev.generationMode,
            }
          : {
              status: 'READY',
              activeCount: bundle.candidates.length,
              generationVersion: bundle.generationVersion,
              generationMode: bundle.generationMode,
            },
      );
      toast.success('路线对比已更新');
    } catch (err) {
      if (isRouteAlreadySelected(err)) {
        toast.error('已选定路线，无法重新生成');
        return;
      }
      toast.error(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setRegenerating(false);
    }
  };

  const bestMatchId = useMemo(() => pickRecommendedCompareRoute(routes)?.id, [routes]);
  const userFocusedRouteId = useMemo(
    () => resolveUserCompareFocusRouteId(routes, compareFocusRouteId),
    [routes, compareFocusRouteId],
  );
  const highlightRouteId = userFocusedRouteId ?? bestMatchId;
  const showUserFocus = Boolean(userFocusedRouteId);
  const focusedRoute = useMemo(
    () => routes.find((route) => route.id === userFocusedRouteId),
    [routes, userFocusedRouteId],
  );

  const unresolvedCount = useMemo(
    () => routes.reduce((n, route) => n + countUnresolvedPois(route.resolvedPois), 0),
    [routes],
  );
  const unresolvedBannerText = getUnresolvedPoisBannerText(unresolvedCount);

  const showStaleBanner = shouldRegenerateCandidates(candidatesStatus?.status);
  const isSelected = candidatesStatus?.status === 'SELECTED';
  const headline = getComparePageHeadline(generationMode);
  const subtitle = getComparePageSubtitle(generationMode);

  const handlePoiConfirmClick = (routeId: string) => (chip: PoiChipViewModel) => {
    setConfirmPoi({ routeId, poi: chip.poi });
  };

  const handlePoiEvidenceClick = (chip: PoiChipViewModel) => {
    setEvidencePoi(chip.poi);
  };

  const handlePoiConfirmed = (result: ConfirmPoiResponse, originalPoi: ResolvedPoi) => {
    if (!confirmPoi) return;
    setRoutes((prev) =>
      updateRouteResolvedPoi(prev, confirmPoi.routeId, originalPoi.name, (poi) =>
        applyConfirmResultToPoi(poi, result),
      ),
    );
  };

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="compare"
      title={headline}
      subtitle={subtitle}
      onBack={() => navigate(`${base}/principles`)}
      maxWidth="7xl"
      dense
    >
      <ScenarioSummaryBar scenarioId={scenarioId} className="mb-4" />

      {showStaleBanner ? (
        <CandidatesStaleBanner
          message={getStaleCandidatesBannerText()}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
          showRegenerate={!isSelected}
        />
      ) : null}

      {unresolvedBannerText ? <UnresolvedPoisBanner message={unresolvedBannerText} /> : null}

      {loading && (
        <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在加载对比数据…
        </p>
      )}

      {showUserFocus && focusedRoute ? (
        <p className="text-xs text-muted-foreground mb-3">
          已根据你在路线方向页的选择，高亮{' '}
          <span className="font-medium text-foreground">{focusedRoute.title}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {routes.map((route) => {
          const navRouteId = route.apiRouteId;
          const sourceBadge = getGenerationSourceBadge(route.generationSource);
          return (
            <RouteStrategyCard
              key={route.id}
              route={route}
              poiChips={mapResolvedPoisToChips(route.resolvedPois)}
              highlight={route.id === highlightRouteId}
              primaryLabel={route.id === highlightRouteId ? '选择这条路线' : '选择'}
              sourceBadge={sourceBadge}
              onViewDetail={() => navigate(`${base}/routes/${encodeURIComponent(navRouteId)}`)}
              onSelect={() => navigate(`${base}/routes/${encodeURIComponent(navRouteId)}`)}
              onPoiConfirmClick={handlePoiConfirmClick(route.id)}
              onPoiEvidenceClick={handlePoiEvidenceClick}
            />
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold mb-3">与你的原则匹配度</h3>
        <div className="space-y-2.5">
          {routes.map((route) => (
            <div key={route.id} className="flex items-center gap-3">
              <div className="w-32 text-xs font-medium truncate">{route.title}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    route.id === highlightRouteId ? 'bg-primary' : 'bg-muted-foreground/30',
                  )}
                  style={{ width: `${route.matchScore ?? 0}%` }}
                />
              </div>
              <span className="text-xs font-semibold font-mono w-10 text-right">{route.matchScore}%</span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline flex-1 line-clamp-1">
                {route.matchSummary}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto min-h-11 gap-2"
          onClick={() => {
            setDimensionsExpanded((prev) => {
              const next = !prev;
              if (next && flow?.sessionId) {
                void trackExplorationEvent(flow.sessionId, 'compare_dimension_expanded', {
                  scenarioId,
                  protocolId: flow.researchProtocolId,
                  entryVariant: flow.assignedVariant,
                  tripId: flow.tripId,
                  currentStep: 'compare',
                  dimensionCount: compareDimensions.length,
                });
              }
              return next;
            });
          }}
          aria-expanded={dimensionsExpanded}
        >
          {dimensionsExpanded ? (
            <>
              收起六维详细对比
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              展开六维详细对比
              {compareDimensions.length > 0 ? (
                <span className="text-muted-foreground font-normal">
                  （{compareDimensions.length} 项）
                </span>
              ) : null}
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </Button>

        {dimensionsExpanded ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card mt-3">
            <table className="w-full min-w-[720px] text-xs leading-normal">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-[120px]">
                    比较维度
                  </th>
                  {routes.map((route) => {
                    const sourceBadge = getGenerationSourceBadge(route.generationSource);
                    return (
                      <th
                        key={route.id}
                        className={cn(
                          'text-left px-3 py-2.5 font-semibold text-foreground min-w-[168px]',
                          route.id === highlightRouteId && exploreUi.compareBestCol,
                        )}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {route.title}
                          {route.id === highlightRouteId && showUserFocus ? (
                            <span className={exploreUi.badgeSelected}>你的偏好</span>
                          ) : null}
                          {route.id === bestMatchId &&
                          (route.id !== highlightRouteId || !showUserFocus) ? (
                            <span className={exploreUi.badgeRecommended}>最匹配</span>
                          ) : null}
                          {sourceBadge ? (
                            <span className={sourceBadgeClass(sourceBadge.tone)}>
                              {sourceBadge.label}
                            </span>
                          ) : null}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {compareDimensions.length === 0 && routes.length > 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={routes.length + 1}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      对比维度暂未加载。请稍后重试，或点击上方路线卡片查看详情。
                    </td>
                  </tr>
                ) : null}
                {compareDimensions.map((dimension) => (
                  <tr key={dimension.key} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground align-top">
                      {dimension.label}
                    </td>
                    {routes.map((route) => {
                      const cell = getCompareDimensionValue(dimension, route);
                      return (
                        <td
                          key={route.id}
                          className={cn(
                            'px-3 py-2 align-top text-muted-foreground',
                            route.id === highlightRouteId && exploreUi.compareBestCol,
                          )}
                        >
                          {cell ? (
                            <>
                              <p className="font-semibold text-foreground leading-tight">
                                {cell.level}
                              </p>
                              {formatCompareCellNote(cell.note) ? (
                                <p className="mt-0.5 text-[11px] leading-snug">{cell.note}</p>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-muted-foreground/60">—</p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <PoiConfirmationSheet
        open={Boolean(confirmPoi)}
        onOpenChange={(open) => {
          if (!open) setConfirmPoi(null);
        }}
        poi={confirmPoi?.poi ?? null}
        accessToken={accessToken}
        onConfirmed={handlePoiConfirmed}
      />

      <PoiEvidenceDrawer
        open={Boolean(evidencePoi)}
        onOpenChange={(open) => {
          if (!open) setEvidencePoi(null);
        }}
        poi={evidencePoi}
      />
    </ExploreFlowLayout>
  );
}
