/**
 * ui_surface=consultation + payload.consultation_dashboard 的可视化骨架
 * 顺序：Hero → 评分 → 摘要四卡 → 地图 → 风险 → 每日时间轴 → 预算 → 预订截止 → 主 CTA
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Calendar, Clock, Info, MapPin, Sparkles } from 'lucide-react';
import type { SuggestedOperation } from '@/api/agent';
import type { ConsultationDashboardPayload, ConsultationRiskLevel } from '@/types/consultation-dashboard';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';
import { parseIntentModeFromSuggestedPayload, type RouteRunIntentModeOption } from '@/lib/suggested-operations';
import { toast } from 'sonner';
import {
  SEMANTIC_BLUE_HEX,
  SEMANTIC_GREEN_HEX,
  SEMANTIC_RED_HEX,
} from '@/lib/semantic-colors';

import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const ACCENT = {
  blue: SEMANTIC_BLUE_HEX,
  cyan: SEMANTIC_BLUE_HEX,
  slate: '#0F172A',
  amber: '#F59E0B',
  red: SEMANTIC_RED_HEX,
  green: SEMANTIC_GREEN_HEX,
};

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function levelToTone(level?: ConsultationRiskLevel): 'green' | 'amber' | 'red' | 'slate' {
  const s = String(level ?? '').toLowerCase();
  if (/高|high|severe|danger|red/.test(s)) return 'red';
  if (/中|medium|moderate|warn|amber|yellow/.test(s)) return 'amber';
  if (/低|low|green|ok|safe/.test(s)) return 'green';
  return 'slate';
}

function toneClass(tone: 'green' | 'amber' | 'red' | 'slate'): string {
  switch (tone) {
    case 'green':
      return 'bg-gate-allow-foreground/15 text-gate-allow-foreground dark:text-gate-allow-foreground border-gate-allow-border/30';
    case 'amber':
      return 'bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-500/35';
    case 'red':
      return 'bg-gate-reject-foreground/15 text-gate-reject-foreground dark:text-gate-reject-foreground border-gate-reject-border/35';
    default:
      return 'bg-slate-500/10 text-slate-800 dark:text-slate-200 border-slate-500/20';
  }
}

function summaryCardToneClass(tone?: string): string {
  const t = String(tone ?? '').toLowerCase();
  if (t === 'warning' || t === 'amber') return 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20';
  if (t === 'danger' || t === 'negative') return 'border-gate-reject-border/40 bg-gate-reject/40 dark:bg-gate-reject/25';
  if (t === 'positive' || t === 'success') return 'border-gate-allow-border/40 bg-gate-allow/40 dark:bg-gate-allow/20';
  return 'border-border/80 bg-card/60';
}

function nodeEmoji(kind?: string): string {
  const k = String(kind ?? '').toLowerCase();
  if (/hotel|住宿|酒店/.test(k)) return '🏨';
  if (/温泉|hot\s*spr/.test(k)) return '♨️';
  if (/油|fuel|gas/.test(k)) return '⛽';
  if (/risk|风险|警告/.test(k)) return '⚠️';
  if (/瀑布|waterfall/.test(k)) return '🌊';
  return '📍';
}

interface ConsultationRouteMapProps {
  map: NonNullable<ConsultationDashboardPayload['map']>;
  className?: string;
}

function ConsultationRouteMap({ map, className }: ConsultationRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  const lineCoords = map.path_coordinates;

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const centerLng =
      map.center?.lng ??
      lineCoords?.[0]?.[0] ??
      map.nodes?.[0]?.lng ??
      0;
    const centerLat =
      map.center?.lat ??
      lineCoords?.[0]?.[1] ??
      map.nodes?.[0]?.lat ??
      20;

    const mb = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [centerLng, centerLat],
      zoom: map.zoom ?? (lineCoords && lineCoords.length > 1 ? 6 : 4),
      attributionControl: false,
    });
    mb.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mb.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    mapRef.current = mb;

    mb.on('load', () => {
      if (lineCoords && lineCoords.length >= 2) {
        const geo = {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: lineCoords,
          },
        };
        mb.addSource('consult-route', { type: 'geojson', data: geo });
        mb.addLayer({
          id: 'consult-route-line',
          type: 'line',
          source: 'consult-route',
          paint: {
            'line-color': ACCENT.blue,
            'line-width': 4,
            'line-opacity': 0.88,
          },
        });
        const bounds = new mapboxgl.LngLatBounds(lineCoords[0] as [number, number], lineCoords[0] as [number, number]);
        for (const c of lineCoords) bounds.extend(c as [number, number]);
        mb.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
      } else if (map.nodes?.length) {
        const bounds = new mapboxgl.LngLatBounds(
          [map.nodes[0].lng, map.nodes[0].lat],
          [map.nodes[0].lng, map.nodes[0].lat]
        );
        for (const n of map.nodes) bounds.extend([n.lng, n.lat]);
        mb.fitBounds(bounds, { padding: 56, maxZoom: 11, duration: 0 });
      }
      setReady(true);
    });

    mb.on('error', (e) => {
      if (e.error?.message?.includes('aborted') || e.error?.name === 'AbortError') return;
      console.warn('ConsultationRouteMap:', e.error);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mb.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [map, lineCoords]);

  useEffect(() => {
    const mb = mapRef.current;
    if (!mb || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const nodes = map.nodes ?? [];
    for (const n of nodes) {
      const el = document.createElement('div');
      el.className =
        'flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white shadow-md text-base leading-none cursor-default';
      el.textContent = nodeEmoji(n.kind);
      if (n.label) el.title = n.label;

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([n.lng, n.lat]).addTo(mb);
      markersRef.current.push(marker);
    }
  }, [map.nodes, ready]);

  if (!MAPBOX_TOKEN) {
    return (
      <Card className={cn('overflow-hidden border-dashed', className)}>
        <CardHeader className="py-3 pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            路线地图
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex h-[220px] items-center justify-center rounded-2xl bg-muted/50 text-center text-xs text-muted-foreground px-4">
            配置环境变量 <code className="mx-1 rounded bg-muted px-1 py-0.5">VITE_MAPBOX_ACCESS_TOKEN</code> 后显示地图。
            {lineCoords?.length ? (
              <span className="block mt-2 text-[10px]">已接收 {lineCoords.length} 个路径坐标点。</span>
            ) : null}
            {map.nodes?.length ? (
              <span className="block mt-2 text-[10px]">已接收 {map.nodes.length} 个节点（待地理编码或路径补全）。</span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden border-border/15 shadow-sm', className)}>
      <CardHeader className="py-3 pb-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          路线地图
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 px-3">
        <div ref={containerRef} className="h-[240px] w-full rounded-2xl overflow-hidden border border-border/60" />
      </CardContent>
    </Card>
  );
}

export interface ConsultationDashboardProps {
  dashboard: ConsultationDashboardPayload;
  className?: string;
  suggestedOperations?: SuggestedOperation[];
  /** 第三参：payload.intent_mode → 下一轮 `options.intent_mode`（与 trip_id/message 一并） */
  onSuggestedRouteRun?: (
    message: string,
    tripIdOverride?: string,
    intentModeFromSuggestedPayload?: RouteRunIntentModeOption
  ) => void;
  chatSending?: boolean;
  clarificationSubmitDisabled?: boolean;
}

export function ConsultationDashboard({
  dashboard,
  className,
  suggestedOperations,
  onSuggestedRouteRun,
  chatSending,
  clarificationSubmitDisabled,
}: ConsultationDashboardProps) {
  const budgetPieData = useMemo(() => {
    const b = dashboard.budget?.breakdown;
    if (!b?.length) return [];
    const withAmt = b.map((row, i) => ({
      name: row.label,
      value: row.amount ?? row.share ?? 1 / b.length,
      share: row.share,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    const sumAmt = withAmt.reduce((s, x) => s + (typeof x.value === 'number' ? x.value : 0), 0);
    if (sumAmt <= 0) {
      return withAmt.map((x) => ({
        ...x,
        value: x.share != null && x.share <= 1 ? Math.max(x.share, 0.01) : 1 / withAmt.length,
      }));
    }
    return withAmt.map((x) => ({
      ...x,
      value: typeof x.value === 'number' ? x.value : 0,
    }));
  }, [dashboard.budget?.breakdown]);

  const primaryOp = suggestedOperations?.find((o) => o.kind === 'route_and_run_message');

  const handlePrimaryCta = () => {
    if (!onSuggestedRouteRun || !primaryOp?.payload?.message) {
      toast.message('请使用下方「快捷操作」继续对话或优化行程');
      return;
    }
    const msg = String(primaryOp.payload.message).trim();
    let tripOverride: string | undefined;
    if (primaryOp.payload?.trip_id != null && String(primaryOp.payload.trip_id).trim() !== '') {
      const s = sanitizeRouteRunTripId(String(primaryOp.payload.trip_id));
      tripOverride = s ?? undefined;
      if (!s) toast.warning('payload.trip_id 非法，将使用当前会话行程');
    }
    const intentMode = parseIntentModeFromSuggestedPayload(
      primaryOp.payload as Record<string, unknown> | undefined
    );
    onSuggestedRouteRun(msg, tripOverride, intentMode);
  };

  const showMap =
    dashboard.map &&
    (dashboard.map.path_coordinates?.length ||
      (dashboard.map.nodes && dashboard.map.nodes.length > 0) ||
      dashboard.map.center);

  const isFallbackOrigin =
    String(dashboard.dashboard_origin ?? '').toLowerCase() === 'fallback';

  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border p-4 shadow-sm',
        isFallbackOrigin
          ? 'border-border/70 bg-muted/25 dark:bg-muted/10'
          : 'border-border/20 bg-gradient-to-b from-muted/15/60 to-background dark:from-muted/15/25 dark:to-background',
        className
      )}
    >
      {isFallbackOrigin ? (
        <div
          className="flex items-start gap-2 rounded-lg border border-dashed border-border/80 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
          role="note"
        >
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/90" aria-hidden />
          <span>
            结构化摘要由快捷操作生成（非完整模型输出；请以正文或后续对话为准）。
          </span>
        </div>
      ) : null}

      {/* Hero — fallback 时弱化（避免与完整模型 Hero 同级强调） */}
      <header className={cn('space-y-1', isFallbackOrigin && 'opacity-90')}>
        {dashboard.headline ? (
          <h3
            className={cn(
              'tracking-tight',
              isFallbackOrigin
                ? 'text-base font-medium text-muted-foreground'
                : 'text-lg font-semibold text-slate-900 dark:text-slate-50'
            )}
          >
            {dashboard.headline}
          </h3>
        ) : (
          <h3
            className={cn(
              'flex items-center gap-2 tracking-tight',
              isFallbackOrigin
                ? 'text-base font-medium text-muted-foreground'
                : 'text-lg font-semibold text-slate-900 dark:text-slate-50'
            )}
          >
            <Sparkles
              className={cn('shrink-0', isFallbackOrigin ? 'h-4 w-4 text-muted-foreground' : 'h-5 w-5 text-muted-foreground')}
            />
            行程咨询摘要
          </h3>
        )}
        {dashboard.subheadline ? (
          <p
            className={cn(
              'leading-relaxed',
              isFallbackOrigin ? 'text-xs text-muted-foreground/90' : 'text-sm text-muted-foreground'
            )}
          >
            {dashboard.subheadline}
          </p>
        ) : null}
      </header>

      {/* Score dimensions */}
      {dashboard.score_dimensions && dashboard.score_dimensions.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">维度评分</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {dashboard.score_dimensions.map((dim, idx) => {
              const tone = levelToTone(dim.level ?? dim.score_label);
              const pct =
                dim.value != null && dim.value <= 100
                  ? dim.value
                  : tone === 'red'
                    ? 82
                    : tone === 'amber'
                      ? 55
                      : tone === 'green'
                        ? 28
                        : 45;
              return (
                <div
                  key={`${dim.label}-${idx}`}
                  className={cn('rounded-xl border px-3 py-2.5', toneClass(tone))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{dim.label}</span>
                    {dim.score_label ? (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {dim.score_label}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        tone === 'red' && 'bg-gate-reject-foreground',
                        tone === 'amber' && 'bg-amber-500',
                        tone === 'green' && 'bg-gate-allow-foreground',
                        tone === 'slate' && 'bg-slate-400'
                      )}
                      style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Summary cards */}
      {dashboard.summary_cards && dashboard.summary_cards.length > 0 ? (
        <section className="grid gap-2 sm:grid-cols-2">
          {dashboard.summary_cards.map((c, i) => (
            <div
              key={`${c.title}-${i}`}
              className={cn(
                'rounded-2xl border px-3 py-3 shadow-sm backdrop-blur-sm',
                summaryCardToneClass(c.tone)
              )}
            >
              <p className="text-[11px] font-medium text-muted-foreground">{c.title}</p>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground whitespace-pre-wrap">
                {c.body}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {/* Map */}
      {showMap && dashboard.map ? <ConsultationRouteMap map={dashboard.map} /> : null}

      {/* Risks */}
      {dashboard.risks && dashboard.risks.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">风险诊断</p>
          <div className="space-y-2">
            {dashboard.risks.map((r, idx) => {
              const tone = levelToTone(r.level);
              return (
                <Card
                  key={`${r.title}-${idx}`}
                  className={cn('overflow-hidden border', tone === 'red' && 'border-gate-reject-border/60 bg-gate-reject/30 dark:bg-gate-reject/20')}
                >
                  <CardHeader className="py-2.5 pb-1 space-y-0">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={cn(
                          'h-4 w-4 shrink-0 mt-0.5',
                          tone === 'red' && 'text-gate-reject-foreground',
                          tone === 'amber' && 'text-amber-600',
                          tone === 'green' && 'text-gate-allow-foreground'
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-semibold leading-snug">{r.title}</CardTitle>
                        {r.level ? (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            {r.level}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 pt-0 text-xs space-y-2">
                    {r.summary ? <p className="text-muted-foreground leading-relaxed">{r.summary}</p> : null}
                    {r.details && r.details.length > 0 ? (
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {r.details.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    ) : null}
                    {r.suggestions && r.suggestions.length > 0 ? (
                      <div className="rounded-lg bg-gate-allow-foreground/10 px-2.5 py-2 text-gate-allow-foreground dark:text-gate-allow-foreground">
                        <p className="text-[10px] font-medium uppercase text-gate-allow-foreground/90 dark:text-gate-allow-foreground/90">
                          建议
                        </p>
                        <ul className="mt-1 list-disc pl-4 space-y-0.5">
                          {r.suggestions.map((s, j) => (
                            <li key={j}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Daily timeline */}
      {dashboard.daily_plan && dashboard.daily_plan.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            每日行程
          </p>
          <div className="space-y-4">
            {dashboard.daily_plan.map((day, di) => (
              <div key={di} className="relative">
                <div className="mb-2 flex items-baseline gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-semibold">
                    {day.title
                      ? day.title
                      : day.day_index != null
                        ? `Day ${day.day_index}`
                        : `第 ${di + 1} 天`}
                  </span>
                  {day.subtitle ? (
                    <span className="text-xs text-muted-foreground truncate">{day.subtitle}</span>
                  ) : null}
                </div>
                {day.segments && day.segments.length > 0 ? (
                  <div className="ml-1 border-l-2 border-border/25 pl-4 space-y-3">
                    {day.segments.map((seg, si) => (
                      <div key={si} className="relative">
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-border bg-background" />
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {seg.time ? (
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {seg.time}
                            </span>
                          ) : null}
                          {seg.risk ? (
                            <Badge variant="destructive" className="text-[10px] h-5">
                              风险
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium mt-0.5">{seg.label}</p>
                        {seg.detail ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{seg.detail}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-6">（当日暂无分段）</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Budget */}
      {budgetPieData.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">预算构成</p>
          <Card className="border-border/80">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-4">
              <div className="h-[160px] w-full sm:w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budgetPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {budgetPieData.map((_, i) => (
                        <Cell key={i} fill={budgetPieData[i].color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        typeof value === 'number' ? value.toFixed(0) : String(value ?? '')
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2 w-full min-w-0">
                {dashboard.budget?.total_range_label ? (
                  <p className="text-sm font-semibold">{dashboard.budget.total_range_label}</p>
                ) : null}
                <ul className="text-xs space-y-1">
                  {budgetPieData.map((row) => (
                    <li key={row.name} className="flex justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: row.color }}
                        />
                        <span className="truncate">{row.name}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {row.share != null && row.share <= 1
                          ? `${(row.share * 100).toFixed(0)}%`
                          : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : dashboard.budget?.total_range_label ? (
        <section>
          <Card>
            <CardContent className="py-4 text-sm font-medium">{dashboard.budget.total_range_label}</CardContent>
          </Card>
        </section>
      ) : null}

      {/* Booking */}
      {dashboard.booking_deadlines && dashboard.booking_deadlines.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            必须预订 / 截止
          </p>
          <div className="rounded-2xl border border-amber-500/25 bg-amber-50/40 dark:bg-amber-950/20 divide-y divide-amber-500/15">
            {dashboard.booking_deadlines.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{b.item}</p>
                  <p className="text-xs text-muted-foreground">{b.deadline}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.urgency ? (
                    <Badge variant={/紧张|立即|已/.test(b.urgency) ? 'destructive' : 'secondary'}>
                      {b.urgency}
                    </Badge>
                  ) : null}
                  {b.cta_url ? (
                    <Button variant="outline" size="sm" className="h-8 rounded-full text-xs" asChild>
                      <a href={b.cta_url} target="_blank" rel="noreferrer">
                        {b.cta_label ?? '去预订'}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Primary CTA */}
      {dashboard.primary_cta_label ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-white shadow-sm"
            disabled={!!chatSending || !!clarificationSubmitDisabled}
            onClick={handlePrimaryCta}
          >
            {dashboard.primary_cta_label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
