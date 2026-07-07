/**
 * 探索规划 — 路线详情（PRD §10.5）
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Gauge,
  Clock,
  Bed,
  MapPin,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ExploreFlowLayout, ExploreFooterNav } from '@/features/exploration/components/ExploreFlowLayout';
import { ExploreRouteMap } from '@/features/exploration/components/ExploreRouteMap';
import { getRouteById } from '@/features/exploration/data/mock-iceland';
import { exploreBasePath } from '@/features/exploration/constants';
import {
  exploreUi,
  semanticBadText,
  semanticGoodText,
  semanticWarnText,
} from '@/features/exploration/explore-ui';
import { cn } from '@/lib/utils';
import {
  fetchRouteDetail,
  isExplorationUnavailable,
  submitRouteSelection,
  trackExplorationEvent,
} from '@/features/exploration/api/client';
import { mergeRouteDetailWithMock } from '@/features/exploration/api/adapters';
import type { RouteCandidateMock } from '@/features/exploration/types';
import type { ResolvedPoi } from '@/features/poi-resolution/types';
import { PoiChipList, mapResolvedPoisToChips, normalizeResolvedPois } from '@/features/poi-resolution';
import { toApiRouteId, toMockRouteId } from '@/features/exploration/lib/route-id.util';
import { runExplorationCheckFlow } from '@/features/exploration/lib/exploration-check-flow.util';
import { persistFlowState, readFlowStateForScenario } from '@/features/exploration/flow-state';
import { useExplorationTravelContext } from '@/features/exploration/context/ExplorationTravelContext';
import { selectExplorationRouteViaIntent } from '@/features/exploration/travel-context/exploration-travel-context';

const SELECTION_REASONS = [
  { id: 'explore', label: '探索感' },
  { id: 'core', label: '核心体验' },
  { id: 'quiet', label: '更少游客' },
  { id: 'photo', label: '摄影机位' },
  { id: 'flex', label: '路线弹性' },
];

export default function ExploreRouteDetailPage() {
  const { scenarioId = '', routeId = 'highland-south' } = useParams<{
    scenarioId: string;
    routeId: string;
  }>();
  const navigate = useNavigate();
  const base = exploreBasePath(scenarioId);
  const flow = readFlowStateForScenario(scenarioId);
  const travelContext = useExplorationTravelContext();
  const apiRouteIdParam = toApiRouteId(routeId);
  const mockRouteId = toMockRouteId(routeId);

  const [route, setRoute] = useState<RouteCandidateMock | null>(
    () => getRouteById(mockRouteId) ?? getRouteById(routeId) ?? null,
  );
  const [apiRouteId, setApiRouteId] = useState(apiRouteIdParam);
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<string[]>(['explore', 'core', 'quiet']);
  const [submitting, setSubmitting] = useState(false);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [resolvedPois, setResolvedPois] = useState<ResolvedPoi[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchRouteDetail(scenarioId, apiRouteIdParam);
        if (cancelled) return;
        const merged = mergeRouteDetailWithMock(data, apiRouteIdParam);
        setRoute(merged.route);
        setApiRouteId(merged.apiRouteId);
        setResolvedPois(normalizeResolvedPois(data.detail?.resolvedPois) ?? []);
      } catch (err) {
        if (cancelled) return;
        if (!isExplorationUnavailable(err)) {
          console.warn('[explore/route-detail] API failed, using mock', err);
        }
        const fallback = getRouteById(mockRouteId) ?? getRouteById(routeId);
        if (fallback) {
          setRoute({ ...fallback, apiRouteId: apiRouteIdParam });
          setApiRouteId(apiRouteIdParam);
          setResolvedPois([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, routeId, apiRouteIdParam, mockRouteId]);

  const handleSelectAndCheck = async () => {
    setSubmitting(true);
    try {
      const provider = travelContext.getProvider();
      if (travelContext.enabled && provider) {
        await selectExplorationRouteViaIntent(provider, {
          routeId: apiRouteId,
          selectionReason: reasons.join(', '),
        });
      } else {
        await submitRouteSelection(scenarioId, {
          routeId: apiRouteId,
          selectionReason: reasons.join(', '),
        });
      }
      persistFlowState({ selectedRouteId: apiRouteId });
      if (flow?.sessionId) {
        void trackExplorationEvent(flow.sessionId, 'route_selected', {
          scenarioId,
          protocolId: flow.researchProtocolId,
          entryVariant: flow.assignedVariant,
          tripId: flow.tripId,
          routeId: apiRouteId,
          currentStep: 'route_selection',
        });
      }
      await runExplorationCheckFlow({
        scenarioId,
        apiRouteId,
        base,
        navigate,
        flow: flow ?? {},
        travelContextProvider: travelContext.enabled ? travelContext.getProvider() : null,
      });
    } catch (err) {
      if (isExplorationUnavailable(err)) {
        persistFlowState({ selectedRouteId: apiRouteId });
        await runExplorationCheckFlow({
          scenarioId,
          apiRouteId,
          base,
          navigate,
          flow: flow ?? {},
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : '提交路线选择失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!route) {
    return (
      <ExploreFlowLayout
        scenarioId={scenarioId}
        currentStep="detail"
        title="路线未找到"
        onBack={() => navigate(`${base}/compare`)}
      >
        <p className="text-sm text-muted-foreground">请从路线列表重新选择。</p>
      </ExploreFlowLayout>
    );
  }

  const toggleReason = (id: string) => {
    setReasons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const tippedDays = route.detail.days.filter((d) => d.tip);

  return (
    <ExploreFlowLayout
      scenarioId={scenarioId}
      currentStep="detail"
      title={route.title}
      subtitle={route.detail.summary}
      onBack={() => navigate(`${base}/compare`)}
      maxWidth="7xl"
      dense
      footer={
        <ExploreFooterNav
          onBack={() => navigate(`${base}/compare`)}
          backLabel="返回对比"
          onPrimary={handleSelectAndCheck}
          primaryLabel={submitting ? '提交中…' : '选择这条路线并检查是否走得通'}
          primaryDisabled={submitting || loading}
        />
      }
    >
      {loading && (
        <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          正在加载路线详情…
        </p>
      )}

      <div className="flex flex-col flex-1 min-h-0 gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            <span className={exploreUi.badgeSelected}>已选择</span>
            {route.badge && (
              <span
                className={
                  route.badge.tone === 'recommended' ? exploreUi.badgeRecommended : exploreUi.badgeNiche
                }
              >
                {route.badge.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {[
              { icon: Calendar, label: `${route.detail.days.length}+ 天行程` },
              { icon: Gauge, label: `总驾驶 ~${route.detail.totalKm} km` },
              { icon: Clock, label: `日均 ${route.detail.avgDrivingHours}h` },
              { icon: Bed, label: `${route.detail.stayChanges} 次换宿` },
              { icon: MapPin, label: route.detail.regions.join(' · ') },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {resolvedPois.length > 0 ? (
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 flex-shrink-0">
            <p className="text-[10px] font-medium mb-1.5 text-muted-foreground">途经地点（只读）</p>
            <PoiChipList chips={mapResolvedPoisToChips(resolvedPois)} readOnly />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,40%)] gap-3 items-start">
          <ExploreRouteMap
            routeId={mockRouteId}
            days={route.detail.days}
            map={route.detail.map}
            selectedDay={activeDay}
            onDaySelect={setActiveDay}
            className="w-full min-h-[14rem] lg:h-[min(26rem,calc(100vh-17rem))]"
          />

          <div className="rounded-xl border border-border overflow-hidden min-w-0 w-full bg-card self-start">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {[
                    { h: '天', className: 'w-9' },
                    { h: '行程', className: 'min-w-0' },
                    { h: '驾驶', className: 'w-11' },
                    { h: '住宿', className: 'w-[26%]' },
                  ].map(({ h, className: colClass }) => (
                    <th
                      key={h}
                      className={cn(
                        'text-left px-1.5 py-1.5 font-medium text-muted-foreground whitespace-nowrap',
                        colClass,
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {route.detail.days.map((day) => (
                  <tr
                    key={day.day}
                    role="button"
                    tabIndex={0}
                    title={[day.theme, day.route, day.experience, day.stay].filter(Boolean).join(' · ')}
                    onMouseEnter={() => setActiveDay(day.day)}
                    onMouseLeave={() => setActiveDay(null)}
                    onClick={() => setActiveDay(day.day)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveDay(day.day);
                      }
                    }}
                    className={cn(
                      'border-b border-border/80 last:border-0 cursor-pointer transition-colors align-top',
                      day.highlight && exploreUi.highlightRow,
                      activeDay === day.day && 'bg-muted/60',
                    )}
                  >
                    <td className="px-1.5 py-1.5 font-semibold whitespace-nowrap">D{day.day}</td>
                    <td className="px-1.5 py-1.5 min-w-0">
                      <p className="font-medium leading-snug line-clamp-1">{day.theme}</p>
                      <p className="text-muted-foreground leading-snug line-clamp-2 mt-0.5">{day.route}</p>
                      {day.experience && (
                        <p className="text-[10px] text-muted-foreground/80 leading-snug line-clamp-1 mt-0.5 hidden xl:block">
                          {day.experience}
                        </p>
                      )}
                    </td>
                    <td className="px-1.5 py-1.5 font-mono whitespace-nowrap text-muted-foreground">
                      {day.driving}
                    </td>
                    <td className="px-1.5 py-1.5 text-muted-foreground leading-snug line-clamp-2">
                      {day.stay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tippedDays.length > 0 && (
            <div className="border-t border-border bg-muted/20 px-2 py-1.5 space-y-0.5">
              {tippedDays.map((d) => (
                <p key={d.day} className={cn('text-[10px] leading-snug', semanticBadText)}>
                  D{d.day}：{d.tip}
                </p>
              ))}
            </div>
          )}
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0">
        <div className="rounded-2xl border border-border p-3">
          <p className="text-xs font-semibold mb-1.5">最期待</p>
          <ul className="space-y-1">
            {route.detail.highlights.map((h) => (
              <li key={h} className="flex gap-1.5 text-[11px] leading-snug">
                <Check className={cn('w-3 h-3 flex-shrink-0 mt-0.5', semanticGoodText)} />
                {h}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-3">
          <p className="text-xs font-semibold mb-1.5">最需要准备</p>
          <ul className="space-y-1">
            {route.detail.preparations.map((p) => (
              <li key={p} className="flex gap-1.5 text-[11px] leading-snug">
                <AlertTriangle className={cn('w-3 h-3 flex-shrink-0 mt-0.5', semanticWarnText)} />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border p-3">
          <p className="text-xs font-semibold mb-1.5">选择理由（多选）</p>
          <div className="flex flex-wrap gap-2">
            {SELECTION_REASONS.map((r) => {
              const selected = reasons.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleReason(r.id)}
                  aria-pressed={selected}
                  className={cn(
                    'text-xs min-h-11 px-3 py-2 rounded-full border transition-colors',
                    selected ? exploreUi.cardSelected : 'border-border text-muted-foreground hover:bg-muted/40',
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    </ExploreFlowLayout>
  );
}
