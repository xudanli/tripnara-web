/**
 * 路线方向 — Variant A 单一推荐 / Variant B 三候选选择 → compare
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Sparkles, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout, ExploreFooterNav } from '@/features/exploration/components/ExploreFlowLayout';
import { ExploreRouteMap } from '@/features/exploration/components/ExploreRouteMap';
import { exploreBasePath } from '@/features/exploration/constants';
import { exploreUi, semanticGoodText, semanticInfoText, semanticWarnText } from '@/features/exploration/explore-ui';
import { useExplorationFlow } from '@/features/exploration/hooks/useExplorationFlow';
import type { CompareRouteCard } from '@/features/exploration/types';
import { cn } from '@/lib/utils';
import { ensureFreshCandidates } from '@/features/exploration/api/client';
import { mapCompareCandidatesFromApi } from '@/features/exploration/api/adapters';
import { getGenerationSourceBadge } from '@/features/exploration/api/helpers';
import { pickRecommendedCompareRoute } from '@/features/exploration/lib/recommend-route.util';
import { persistFlowState, readFlowStateForScenario } from '@/features/exploration/flow-state';

function sourceBadgeClass(tone: 'default' | 'info' | 'niche'): string {
  if (tone === 'niche') return exploreUi.badgeNiche;
  if (tone === 'info') {
    return 'text-[10px] px-2 py-0.5 rounded-full font-medium border border-border bg-muted text-foreground';
  }
  return exploreUi.badgeNiche;
}

function SingleRecommendationView({
  scenarioId,
  base,
  navigate,
}: {
  scenarioId: string;
  base: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<CompareRouteCard | null>(null);

  const loadRecommendation = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await ensureFreshCandidates(scenarioId);
      const routes = mapCompareCandidatesFromApi(bundle.candidates);
      setRoute(pickRecommendedCompareRoute(routes) ?? null);
    } catch (err) {
      console.warn('[explore/routes] failed to load recommendation', err);
      toast.error(err instanceof Error ? err.message : '加载推荐路线失败');
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  useEffect(() => {
    void loadRecommendation();
  }, [loadRecommendation]);

  const sourceBadge = route ? getGenerationSourceBadge(route.generationSource) : null;
  const subtitle =
    route?.matchSummary ??
    route?.previewSummary ??
    '基于你的旅行原则与条件，我们从候选路线中选出最匹配的一条。';

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="routes"
      title="根据你的旅行原则，我们更推荐这条路线"
      subtitle={subtitle}
      onBack={() => navigate(`${base}/principles`)}
      maxWidth="5xl"
      footer={
        <ExploreFooterNav
          onBack={() => navigate(`${base}/compare`)}
          backLabel="查看其他旅行方式"
          onPrimary={() => {
            if (!route) return;
            navigate(`${base}/routes/${encodeURIComponent(route.apiRouteId)}`);
          }}
          primaryLabel="查看这条路线"
          primaryDisabled={!route || loading}
        />
      }
    >
      {loading ? (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在加载推荐路线…
        </p>
      ) : null}

      {!loading && !route ? (
        <p className="text-sm text-muted-foreground">暂无推荐路线，请先到比较页查看候选路线。</p>
      ) : null}

      {route ? (
        <article className="rounded-2xl border border-border bg-card overflow-hidden">
          {route.previewMap ? (
            <ExploreRouteMap
              routeId={route.id}
              map={route.previewMap}
              useMockFallback={false}
              showLegend={false}
              showDayMarkers={false}
              className="h-44 rounded-none border-0 border-b border-border"
            />
          ) : (
            <div className="h-44 bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
              暂无路线地图预览
            </div>
          )}
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-semibold">{route.title}</h3>
                {route.badge ? (
                  <span
                    className={
                      route.badge.tone === 'niche' ? exploreUi.badgeNiche : exploreUi.badgeRecommended
                    }
                  >
                    {route.badge.label}
                  </span>
                ) : (
                  <span className={exploreUi.badgeRecommended}>推荐</span>
                )}
                {sourceBadge ? (
                  <span className={sourceBadgeClass(sourceBadge.tone)}>{sourceBadge.label}</span>
                ) : null}
              </div>
              {route.tagline ? (
                <p className="text-sm text-muted-foreground">{route.tagline}</p>
              ) : null}
              {route.previewSummary || route.narrative ? (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                  {route.previewSummary ?? route.narrative}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <p className={cn('font-medium mb-1', semanticGoodText)}>你会得到</p>
                <ul className="space-y-1">
                  {route.gains.slice(0, 2).map((g) => (
                    <li key={g} className="flex gap-1.5 text-muted-foreground">
                      <Check className={cn('w-3.5 h-3.5 flex-shrink-0', semanticGoodText)} />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={cn('font-medium mb-1', semanticWarnText)}>需要接受</p>
                <ul className="space-y-1">
                  {route.sacrifices.slice(0, 2).map((s) => (
                    <li key={s} className="flex gap-1.5 text-muted-foreground">
                      <AlertTriangle className={cn('w-3.5 h-3.5 flex-shrink-0', semanticWarnText)} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Link
              to={`${base}/compare`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              查看其他可能
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
      ) : null}
    </ExploreFlowLayout>
  );
}

function RouteStyleSelectionView({
  scenarioId,
  base,
  navigate,
}: {
  scenarioId: string;
  base: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<CompareRouteCard[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');

  const flow = readFlowStateForScenario(scenarioId);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const bundle = await ensureFreshCandidates(scenarioId);
      const cards = mapCompareCandidatesFromApi(bundle.candidates);
      setRoutes(cards);
      const recommended = pickRecommendedCompareRoute(cards);
      const restoredFocus =
        flow?.compareFocusRouteId &&
        cards.some(
          (route) =>
            route.id === flow.compareFocusRouteId ||
            route.apiRouteId === flow.compareFocusRouteId,
        )
          ? flow.compareFocusRouteId
          : undefined;
      setSelectedRouteId(restoredFocus ?? recommended?.id ?? cards[0]?.id ?? '');
    } catch (err) {
      console.warn('[explore/routes] failed to load candidates', err);
      toast.error(err instanceof Error ? err.message : '加载候选路线失败');
      setRoutes([]);
      setSelectedRouteId('');
    } finally {
      setLoading(false);
    }
  }, [scenarioId, flow?.compareFocusRouteId]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const selected = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0],
    [routes, selectedRouteId],
  );
  const recommendedId = useMemo(() => pickRecommendedCompareRoute(routes)?.id, [routes]);

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="routes"
      title="三种路线方向，你更倾向哪一条？"
      subtitle="先感受差异，再进入六维比较表做详细对比。"
      onBack={() => navigate(`${base}/principles`)}
      maxWidth="7xl"
      footer={
        <ExploreFooterNav
          onBack={() => navigate(`${base}/principles`)}
          onPrimary={() => {
            if (selectedRouteId) {
              persistFlowState({ compareFocusRouteId: selectedRouteId });
            }
            navigate(`${base}/compare`);
          }}
          primaryLabel="继续比较路线"
          primaryDisabled={loading || routes.length === 0}
        />
      }
    >
      {loading ? (
        <p className="text-xs text-muted-foreground mb-4 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在加载候选路线…
        </p>
      ) : null}

      {!loading && routes.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无候选路线，请稍后重试或前往比较页。</p>
      ) : null}

      {routes.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            选择 1 条路线方向，系统将据此高亮你的偏好
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 mb-6">
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              const isRecommended = route.id === recommendedId;
              const sourceBadge = getGenerationSourceBadge(route.generationSource);

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => setSelectedRouteId(route.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'rounded-xl border bg-card overflow-hidden text-left transition-all cursor-pointer',
                    isSelected ? exploreUi.cardSelected : exploreUi.cardHover,
                  )}
                >
                  {route.previewMap ? (
                    <ExploreRouteMap
                      routeId={route.id}
                      map={route.previewMap}
                      useMockFallback={false}
                      showLegend={false}
                      showDayMarkers={false}
                      className="h-28 rounded-none border-0 border-b border-border pointer-events-none"
                    />
                  ) : (
                    <div className="h-28 bg-muted/30 flex items-center justify-center text-xs text-muted-foreground border-b border-border">
                      暂无地图预览
                    </div>
                  )}
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-semibold">{route.title}</h3>
                          {isRecommended ? (
                            <span className={exploreUi.badgeRecommended}>最匹配</span>
                          ) : null}
                          {route.badge ? (
                            <span
                              className={
                                route.badge.tone === 'niche'
                                  ? exploreUi.badgeNiche
                                  : exploreUi.badgeRecommended
                              }
                            >
                              {route.badge.label}
                            </span>
                          ) : null}
                          {sourceBadge ? (
                            <span className={sourceBadgeClass(sourceBadge.tone)}>
                              {sourceBadge.label}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </span>
                      ) : null}
                    </div>
                    {route.previewSummary || route.narrative ? (
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-3">
                        {route.previewSummary ?? route.narrative}
                      </p>
                    ) : null}
                    <div>
                      <p className={cn('text-[10px] font-medium mb-1', semanticGoodText)}>你会得到</p>
                      <ul className="space-y-1">
                        {route.gains.slice(0, 2).map((gain) => (
                          <li key={gain} className="flex gap-1.5 text-[11px] text-muted-foreground">
                            <Check className={cn('w-3.5 h-3.5 flex-shrink-0', semanticGoodText)} />
                            {gain}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {route.sacrifices.length > 0 ? (
                      <div>
                        <p className={cn('text-[10px] font-medium mb-1', semanticWarnText)}>需要接受</p>
                        <ul className="space-y-1">
                          {route.sacrifices.slice(0, 1).map((sacrifice) => (
                            <li key={sacrifice} className="flex gap-1.5 text-[11px] text-muted-foreground">
                              <AlertTriangle
                                className={cn('w-3.5 h-3.5 flex-shrink-0', semanticWarnText)}
                              />
                              {sacrifice}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className={cn(exploreUi.tipBox, 'flex gap-3 items-start')}>
              <Sparkles className={cn('w-5 h-5 flex-shrink-0', semanticInfoText)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground mb-1">当前关注</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  你选择了{' '}
                  <span className="font-medium text-foreground">{selected.title}</span>
                  {selected.gains[0] ? <> —— {selected.gains[0]}</> : null}
                  {selected.gains[1] ? <>、{selected.gains[1]}</> : null}
                  。下一步可在比较页查看六维差异。
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </ExploreFlowLayout>
  );
}

export default function ExploreRoutesEntryPage() {
  const { scenarioId = '' } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const { assignedVariant } = useExplorationFlow(scenarioId);

  const isVariantA = assignedVariant === 'SINGLE_RECOMMENDATION';

  if (isVariantA) {
    return (
      <SingleRecommendationView scenarioId={scenarioId} base={base} navigate={navigate} />
    );
  }

  return <RouteStyleSelectionView scenarioId={scenarioId} base={base} navigate={navigate} />;
}
