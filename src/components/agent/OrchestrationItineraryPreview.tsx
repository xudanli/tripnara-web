/**
 * 本轮 route_and_run 行程草案展示。
 * 规划态列表优先级（由 AgentChat MessageBubble 控制）：**payload.timeline**（主序）→ 可选 **poi_cards_by_day** 行级补水
 * → 无 timeline 时 **poi_cards_by_day** 横滑卡 → 再 **orchestrationResult.itinerary.days**。
 * 勿用 answer_text 当结构化行程；条目字段与后端 timeline/items 一致。
 */

import type { OrchestrationResult } from '@/api/agent';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import {
  agentPoiDayBlocksToHydrationRows,
  normalizeItineraryItemWithOptionalPoiHydration,
} from '@/lib/agent-itinerary-item-display';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import { DaySegmentRowCompact, ItineraryItemCard } from '@/components/agent/ItineraryItemCard';
import { cn } from '@/lib/utils';
import type { SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import {
  resolveSafetyItemUi,
  safetySurfaceSmartUpdateActionLines,
  safetySurfaceSmartUpdateSummaryLine,
} from '@/lib/safety-surface-payload';

export type OrchestrationItineraryDayPreview = { date?: string; items: unknown[] };

export function SafetySmartUpdateStrip({ surface }: { surface: SafetySurfacePayloadV1 | null | undefined }) {
  const line = safetySurfaceSmartUpdateSummaryLine(surface);
  const actionLines = safetySurfaceSmartUpdateActionLines(surface);
  if (!line && actionLines.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] leading-snug text-foreground/95 dark:bg-amber-950/25">
      <div className="text-[10px] font-semibold text-amber-950/90 dark:text-amber-100/90">安全与可达（smart_update）</div>
      {line ? <p className="mt-1 text-muted-foreground">{line}</p> : null}
      {actionLines.length > 0 ? (
        <details className="mt-1.5 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer text-primary/90 hover:underline select-none">调整与已应用修复</summary>
          <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-border/50 bg-background/80 p-2 font-mono text-[9px]">
            {actionLines.join('\n\n')}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export function orchestrationItineraryDaysFromResult(
  orch: OrchestrationResult | null | undefined
): OrchestrationItineraryDayPreview[] | undefined {
  const it = orch?.itinerary;
  if (!it || typeof it !== 'object') return undefined;
  const rec = it as Record<string, unknown>;
  if (Array.isArray(it)) {
    return undefined;
  }
  const days = rec.days;
  if (!Array.isArray(days) || days.length === 0) return undefined;
  const out: OrchestrationItineraryDayPreview[] = [];
  for (const d of days) {
    if (!d || typeof d !== 'object') continue;
    const dr = d as Record<string, unknown>;
    const date =
      typeof dr.date === 'string' && dr.date.trim()
        ? dr.date.trim()
        : typeof dr.day_date === 'string' && dr.day_date.trim()
          ? dr.day_date.trim()
          : typeof dr.date_iso === 'string' && dr.date_iso.trim()
            ? dr.date_iso.trim()
            : undefined;
    const items = Array.isArray(dr.items) ? dr.items : [];
    out.push({ date, items });
  }
  return out.length > 0 ? out : undefined;
}

export function hasOrchestrationItineraryDays(orch: OrchestrationResult | null | undefined): boolean {
  return (orchestrationItineraryDaysFromResult(orch)?.length ?? 0) > 0;
}

/** 遍历 days[].items[] 渲染结构化卡片（非字符串化 JSON）；可选 POI 补水与交通扁行 */
export function ItineraryDayItemsCardList({
  days,
  className,
  poiDayBlocks,
  showPlaceLink,
  safetySurface,
}: {
  days: ItineraryDayItemsBlock[] | OrchestrationItineraryDayPreview[];
  className?: string;
  /** 与 itinerary / timeline 同日序对齐，优先用卡片字段渲染标题/地址/评分 */
  poiDayBlocks?: AgentPoiDayBlock[];
  showPlaceLink?: boolean;
  /** `result.payload.safety_surface`：路段徽章与折叠详情 */
  safetySurface?: SafetySurfacePayloadV1 | null;
}) {
  const hydrationRows = agentPoiDayBlocksToHydrationRows(poiDayBlocks, days.length);

  return (
    <ul className={cn('mt-2 space-y-3 text-sm', className)}>
      {days.map((day, di) => (
        <li
          key={`${day.date ?? 'day'}-${di}`}
          className="rounded-md border border-border/70 bg-background/90 px-2.5 py-2 shadow-sm space-y-2"
        >
          <div className="text-[11px] font-semibold text-foreground">
            {day.date ? `第 ${di + 1} 天 · ${day.date}` : `第 ${di + 1} 天`}
          </div>
          {!day.items?.length ? (
            <p className="text-xs text-muted-foreground">当日暂无条目</p>
          ) : (
            <ul className="space-y-2">
              {day.items.map((item, ii) => {
                const poiForDay = hydrationRows?.[di];
                const model = normalizeItineraryItemWithOptionalPoiHydration(item, poiForDay);
                if (!model) return null;
                const safetyUi = resolveSafetyItemUi(safetySurface ?? null, di, item);
                return (
                  <li key={ii}>
                    {model.displayKind === 'compact' ? (
                      <DaySegmentRowCompact model={model} safetyUi={safetyUi} />
                    ) : (
                      <ItineraryItemCard model={model} showPlaceLink={showPlaceLink} safetyUi={safetyUi} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/** payload.timeline：规划态下列表主数据源；poi_cards_by_day 可选、按日行级补水 */
export function TimelineItineraryPreview({
  days,
  className,
  poiDayBlocks,
  showPlaceLink,
  safetySurface,
}: {
  days: ItineraryDayItemsBlock[];
  className?: string;
  poiDayBlocks?: AgentPoiDayBlock[];
  showPlaceLink?: boolean;
  safetySurface?: SafetySurfacePayloadV1 | null;
}) {
  if (!days?.length) return null;
  return (
    <div className={cn('mt-3', className)}>
      <SafetySmartUpdateStrip surface={safetySurface} />
      <ItineraryDayItemsCardList
        days={days}
        poiDayBlocks={poiDayBlocks}
        showPlaceLink={showPlaceLink}
        safetySurface={safetySurface}
      />
    </div>
  );
}

export function OrchestrationItineraryPreview({
  orchestrationResult,
  className,
  poiDayBlocks,
  showPlaceLink,
  safetySurface,
}: {
  orchestrationResult?: OrchestrationResult | null;
  className?: string;
  /** 与编排日序对齐时可合并展示（标题/地址/评分以卡片为准） */
  poiDayBlocks?: AgentPoiDayBlock[];
  showPlaceLink?: boolean;
  safetySurface?: SafetySurfacePayloadV1 | null;
}) {
  const days = orchestrationItineraryDaysFromResult(orchestrationResult ?? undefined);
  if (!days?.length) return null;

  return (
    <div className={cn('mt-3', className)}>
      <SafetySmartUpdateStrip surface={safetySurface} />
      <ItineraryDayItemsCardList
        days={days}
        poiDayBlocks={poiDayBlocks}
        showPlaceLink={showPlaceLink}
        safetySurface={safetySurface}
      />
    </div>
  );
}
