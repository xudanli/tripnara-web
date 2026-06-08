/**
 * route_and_run payload.poi_cards_by_day：按天分组 POI 卡片（可横向滑动）
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AgentPoiCard, AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import {
  extractPhysicalHintsForPoiCard,
  mergeRoadIdsFromHints,
  type PhysicalSegmentHint,
} from '@/lib/agent-physical-segments';
import type { OrchestrationResult } from '@/api/agent';
import { SafetySmartUpdateStrip } from '@/components/agent/OrchestrationItineraryPreview';
import type { SafetyItemUiV1, SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import { resolveSafetyItemUi } from '@/lib/safety-surface-payload';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  MapPin,
  Star,
} from 'lucide-react';
import { useState } from 'react';

function mapOpenUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function osmStaticMapUrl(lat: number, lng: number, w = 320, h = 140): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=${w}x${h}&maptype=mapnik`;
}

const DESCRIPTION_COLLAPSE_LEN = 220;

function OntologyRulesCollapsible({ rules }: { rules: unknown }) {
  const [open, setOpen] = useState(false);
  const text =
    rules === null || rules === undefined
      ? ''
      : typeof rules === 'string'
        ? rules
        : JSON.stringify(rules, null, 2);
  const empty = !String(text).trim();

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border/60 bg-muted/20">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between gap-1 px-2 text-[11px] font-medium text-foreground"
        >
          <span>本体规则与限制</span>
          <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        {empty ? (
          <p className="text-[10px] text-muted-foreground">（无细节）</p>
        ) : (
          <pre className="max-h-36 overflow-auto rounded border border-border/50 bg-background/80 p-2 text-[10px] leading-snug whitespace-pre-wrap text-muted-foreground">
            {text}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PhysicalSegmentRow({ hints }: { hints: PhysicalSegmentHint[] }) {
  const roads = mergeRoadIdsFromHints(hints);
  const lines = hints
    .map((h) => {
      const parts: string[] = [];
      if (h.enterAt) parts.push(`进入 ${h.enterAt}`);
      if (h.segmentId) parts.push(`路段 ${h.segmentId}`);
      return parts.join(' · ');
    })
    .filter(Boolean);

  return (
    <div className="space-y-1.5 rounded-md border border-amber-500/25 bg-amber-50/50 px-2 py-2 dark:bg-amber-950/20">
      <div className="flex items-center gap-1 text-[11px] font-medium text-amber-950 dark:text-amber-100">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        路段 / F-road
      </div>
      {roads.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {roads.map((id) => (
            <Badge
              key={id}
              variant="outline"
              className="font-mono text-[10px] border-amber-600/50 text-amber-950 dark:text-amber-100"
            >
              {id}
            </Badge>
          ))}
        </div>
      ) : null}
      {lines.length > 0 ? (
        <ul className="text-[10px] text-muted-foreground space-y-0.5">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PoiCard({
  card,
  showDebugFields,
  segmentHints,
  safetyUi,
}: {
  card: AgentPoiCard;
  showDebugFields?: boolean;
  segmentHints?: PhysicalSegmentHint[];
  safetyUi?: SafetyItemUiV1 | null;
}) {
  const [mapOk, setMapOk] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasCoords = card.lat != null && card.lng != null && !Number.isNaN(card.lat) && !Number.isNaN(card.lng);
  /** 命中 Place 登记：主展示以库为准（后端补水） */
  const resolvedFromPlace = card.resolvedFromPlaceRegistry === true;
  /** 明确未入库 / 或旧包仅有 itinerary_only */
  const showDraftHint =
    card.resolvedFromPlaceRegistry === false ||
    (card.resolvedFromPlaceRegistry !== true && card.matchedFrom === 'itinerary_only');

  const desc = card.description?.trim() ?? '';
  const descLong = desc.length > DESCRIPTION_COLLAPSE_LEN;

  const timeRange =
    card.startWindow || card.endWindow
      ? [card.startWindow, card.endWindow].filter(Boolean).join(' – ')
      : '';

  return (
    <Card
      className={cn(
        'min-w-[min(100%,280px)] max-w-[280px] shrink-0 snap-start shadow-sm transition-colors',
        resolvedFromPlace &&
          'border-emerald-500/40 bg-emerald-50/35 dark:border-emerald-600/35 dark:bg-emerald-950/25',
        showDraftHint && !resolvedFromPlace && 'border-dashed border-muted-foreground/35 bg-muted/25 opacity-[0.97]',
        !resolvedFromPlace && !showDraftHint && 'border-border/80'
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {resolvedFromPlace ? (
            <Badge
              variant="secondary"
              className="h-5 gap-0.5 border-emerald-600/30 bg-emerald-100/90 text-[10px] font-medium text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100"
            >
              <Database className="h-3 w-3" aria-hidden />
              Place 库
            </Badge>
          ) : null}
          {showDebugFields && card.matchedFrom ? (
            <Badge variant="outline" className="text-[10px] font-normal h-5 px-1.5">
              {card.matchedFrom}
            </Badge>
          ) : null}
        </div>

        {hasCoords && mapOk ? (
          <a
            href={mapOpenUrl(card.lat!, card.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-md overflow-hidden bg-muted -mx-0.5"
            title="在地图中打开"
          >
            <img
              src={osmStaticMapUrl(card.lat!, card.lng!)}
              alt=""
              className="w-full h-[100px] object-cover"
              loading="lazy"
              onError={() => setMapOk(false)}
            />
          </a>
        ) : hasCoords ? (
          <a
            href={mapOpenUrl(card.lat!, card.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-md bg-muted py-6 text-xs text-primary hover:underline"
          >
            <MapPin className="w-4 h-4" />
            地图 · {card.lat!.toFixed(4)}, {card.lng!.toFixed(4)}
          </a>
        ) : null}

        <div>
          <h4
            className={cn(
              'text-sm font-semibold leading-snug',
              showDraftHint && !resolvedFromPlace && 'text-foreground/90'
            )}
          >
            {card.displayName}
          </h4>
          {(card.nameCn || card.nameEn) && card.displayName !== (card.nameCn || card.nameEn) ? (
            <p className="text-[11px] text-muted-foreground mt-0.5" lang="zh">
              {[card.nameCn, card.nameEn].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {card.category ? (
            <span className="text-[11px] text-muted-foreground">{card.category}</span>
          ) : null}
          {card.rating != null && card.rating > 0 ? (
            <span className="text-[11px] flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
              {card.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        {timeRange ? (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" />
            {timeRange}
          </p>
        ) : null}

        {desc ? (
          <div className="space-y-1">
            <p
              className={cn(
                'text-xs text-muted-foreground leading-relaxed',
                !descExpanded && descLong && 'line-clamp-3'
              )}
            >
              {desc}
            </p>
            {descLong ? (
              <button
                type="button"
                onClick={() => setDescExpanded((v) => !v)}
                className="text-[11px] text-primary hover:underline"
              >
                {descExpanded ? '收起' : '展开全文'}
              </button>
            ) : null}
          </div>
        ) : null}

        {card.address ? (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="min-w-0">{card.address}</span>
          </p>
        ) : null}

        {showDebugFields && card.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-5">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        {segmentHints && segmentHints.length > 0 ? <PhysicalSegmentRow hints={segmentHints} /> : null}

        {safetyUi?.badges?.length ? (
          <div className="flex flex-wrap gap-1">
            {safetyUi.badges.map((b) => (
              <Badge
                key={b.key}
                variant="outline"
                className={cn(
                  'text-[10px] font-medium h-5 px-1.5',
                  b.tone === 'warning'
                    ? 'border-amber-600/45 bg-amber-500/10 text-amber-950 dark:text-amber-100'
                    : 'border-border/60 text-muted-foreground'
                )}
              >
                {b.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {safetyUi?.detailBlocks?.length ? (
          <details className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] px-2 py-1.5 text-[10px] text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground/90 select-none">安全 / 校验详情</summary>
            <div className="mt-1.5 space-y-1.5">
              {safetyUi.detailBlocks.map((block, i) => (
                <div key={`${block.title}-${i}`}>
                  <div className="text-[9px] font-semibold text-muted-foreground/90">{block.title}</div>
                  <ul className="mt-0.5 list-disc pl-3.5 space-y-0.5">
                    {block.lines.map((ln, j) => (
                      <li key={j}>{ln}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {card.ontologyRules != null ? <OntologyRulesCollapsible rules={card.ontologyRules} /> : null}

        {showDraftHint ? (
          <p className="text-[10px] text-amber-900/90 dark:text-amber-200/90 leading-snug rounded-md border border-amber-500/25 bg-amber-50/80 px-2 py-1.5 dark:bg-amber-950/40">
            {card.resolvedFromPlaceRegistry === false
              ? '未入库或仅行程草案：字段可能不完整，建议补充 location_ref.place_id（数字 id / Place.uuid / Google Place Id）以提高命中率。'
              : '未匹配到库内详情，名称来自行程草稿。'}
          </p>
        ) : null}

        {showDebugFields &&
        (card.resolvedFromPlaceRegistry !== undefined || card.placeId || card.itineraryItemId) ? (
          <p className="text-[9px] font-mono text-muted-foreground/80 leading-snug break-all">
            registry=
            {card.resolvedFromPlaceRegistry === true
              ? 'true'
              : card.resolvedFromPlaceRegistry === false
                ? 'false'
                : '—'}
            {card.placeId ? ` · place_id=${card.placeId}` : ''}
            {card.itineraryItemId ? ` · item=${card.itineraryItemId}` : ''}
          </p>
        ) : null}

        {hasCoords ? (
          <a
            href={mapOpenUrl(card.lat!, card.lng!)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            在地图中打开
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

export interface PoiCardsByDayPanelProps {
  days: AgentPoiDayBlock[];
  className?: string;
  /** 为 true 时展示 tags 等调试向信息（与 Agent 调试页一致） */
  showDebugFields?: boolean;
  /** 与 `payload.orchestrationResult` 对齐，用于 action_plan 路段与 POI itinerary_item_id 关联 */
  orchestrationResult?: OrchestrationResult | null;
  /** `payload.safety_surface`：与 POI 卡 `itineraryItemId` / `route_segment_ref` 对齐的路段徽章 */
  safetySurface?: SafetySurfacePayloadV1 | null;
}

function dayHeading(block: AgentPoiDayBlock, zeroBased: boolean): string {
  const n = zeroBased ? block.dayIndex + 1 : block.dayIndex >= 1 ? block.dayIndex : block.dayIndex + 1;
  const datePart = block.date ? ` · ${block.date}` : '';
  return `第 ${n} 天${datePart}`;
}

export function PoiCardsByDayPanel({
  days,
  className,
  showDebugFields,
  orchestrationResult,
  safetySurface,
}: PoiCardsByDayPanelProps) {
  if (!days.length) return null;

  const zeroBased = days.some((b) => b.dayIndex === 0);

  return (
    <div className={cn('space-y-5', className)}>
      {safetySurface ? (
        <div className="rounded-lg border border-amber-200/70 bg-amber-50/25 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
          <SafetySmartUpdateStrip surface={safetySurface} />
        </div>
      ) : null}
      {days.map((block, idx) => (
        <section key={`${block.dayIndex}-${block.date ?? idx}`} className="space-y-2">
          <div className="flex flex-col gap-0.5 border-b border-border/70 pb-2">
            <h3 className="text-sm font-semibold text-foreground">{dayHeading(block, zeroBased)}</h3>
            {block.narrative ? (
              <p className="text-xs text-muted-foreground leading-relaxed">{block.narrative}</p>
            ) : null}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin [-webkit-overflow-scrolling:touch]">
            {block.cards.map((card, cidx) => {
              const segmentHints = orchestrationResult
                ? extractPhysicalHintsForPoiCard(orchestrationResult, card)
                : undefined;
              const rawLike: Record<string, unknown> = {};
              if (card.itineraryItemId) {
                rawLike.itinerary_item_id = card.itineraryItemId;
                rawLike.itineraryItemId = card.itineraryItemId;
              }
              if (card.routeSegmentRef) {
                rawLike.route_segment_ref = card.routeSegmentRef;
                rawLike.routeSegmentRef = card.routeSegmentRef;
              }
              const safetyUi =
                safetySurface && (card.itineraryItemId || card.routeSegmentRef)
                  ? resolveSafetyItemUi(safetySurface, block.dayIndex, rawLike)
                  : null;
              return (
                <PoiCard
                  key={card.itineraryItemId ?? `${card.displayName}-${cidx}`}
                  card={card}
                  showDebugFields={showDebugFields}
                  segmentHints={segmentHints}
                  safetyUi={safetyUi}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
