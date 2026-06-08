/**
 * 行程条目富卡片 / 交通扁行：左图或类型图标 + 右列时间·评分 / 标题 / 地址 / Chip 行 / 时长 pill。
 * 数据见 {@link ItineraryItemCardModel}（itinerary / timeline + 可选 POI 补水）。
 */

import { useState } from 'react';
import type { ItineraryItemCardModel } from '@/lib/agent-itinerary-item-display';
import type { SafetyItemUiV1 } from '@/lib/safety-surface-payload';
import { cn } from '@/lib/utils';
import { Camera, Car, ExternalLink, MapPin, Search, Star, Train, UtensilsCrossed } from 'lucide-react';
import { osmStaticMapThumbUrl } from '@/lib/itinerary-item-card-format';
import { Link } from 'react-router-dom';

function mapOpenUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function typeIcon(itemType?: string) {
  const t = (itemType ?? '').toLowerCase();
  if (/餐|食|饭|restaurant|meal|dining|food/.test(t)) {
    return <UtensilsCrossed className="h-5 w-5 text-muted-foreground" aria-hidden />;
  }
  if (/景|游|attraction|sight|poi|scenic/.test(t)) {
    return <Camera className="h-5 w-5 text-muted-foreground" aria-hidden />;
  }
  if (/铁|rail|train|火车/.test(t)) {
    return <Train className="h-5 w-5 text-muted-foreground" aria-hidden />;
  }
  if (/驾|drive|car|车程|公路/.test(t)) {
    return <Car className="h-5 w-5 text-muted-foreground" aria-hidden />;
  }
  return <MapPin className="h-5 w-5 text-muted-foreground" aria-hidden />;
}

function Chip({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'muted' | 'warning';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none',
        tone === 'warning' && 'border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100',
        tone === 'muted' && 'border-border/60 bg-muted/60 text-muted-foreground',
        tone === 'default' && 'border-border/60 bg-muted/40 text-foreground'
      )}
    >
      {label}
    </span>
  );
}

export function DaySegmentRowCompact({
  model,
  safetyUi,
}: {
  model: ItineraryItemCardModel;
  /** payload.safety_surface：与 route_segment_ref / item 对齐的徽章 */
  safetyUi?: SafetyItemUiV1 | null;
}) {
  const timeBits = [model.startTimeDisplay, model.endTimeDisplay].filter(Boolean);
  const timeLine = timeBits.length >= 2 ? `${timeBits[0]} – ${timeBits[1]}` : timeBits[0] ?? '';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {typeIcon(model.itemType)}
        <span className="font-mono tabular-nums text-[11px] shrink-0">{timeLine || '—'}</span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{model.title}</span>
        {safetyUi?.badges?.length ? (
          <span className="flex shrink-0 flex-wrap justify-end gap-1">
            {safetyUi.badges.map((b) => (
              <Chip key={b.key} label={b.label} tone={b.tone === 'warning' ? 'warning' : 'muted'} />
            ))}
          </span>
        ) : null}
        {model.itemType ? (
          <span className="shrink-0 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
            {model.itemType}
          </span>
        ) : null}
      </div>
      {safetyUi?.detailBlocks?.length ? (
        <details className="rounded-md border border-amber-500/20 bg-amber-500/[0.04] px-2 py-1.5 text-[10px] text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground/90 select-none">安全 / 校验详情</summary>
          <div className="mt-1.5 space-y-1.5 pl-0.5">
            {safetyUi.detailBlocks.map((block, i) => (
              <div key={`${block.title}-${i}`}>
                <div className="text-[9px] font-semibold text-muted-foreground/90">{block.title}</div>
                <ul className="list-disc pl-3.5 space-y-0.5">
                  {block.lines.map((ln, j) => (
                    <li key={j}>{ln}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export interface ItineraryItemCardProps {
  model: ItineraryItemCardModel;
  className?: string;
  /** 是否展示 place_id 链路与地图外链（调试 / 详情） */
  showPlaceLink?: boolean;
  safetyUi?: SafetyItemUiV1 | null;
}

export function ItineraryItemCard({ model, className, showPlaceLink, safetyUi }: ItineraryItemCardProps) {
  const [mapOk, setMapOk] = useState(true);
  const hasCoords = model.lat != null && model.lng != null && !Number.isNaN(model.lat) && !Number.isNaN(model.lng);
  const timeBits = [model.startTimeDisplay, model.endTimeDisplay].filter(Boolean);
  const timeRatingLine =
    timeBits.length >= 2
      ? `${timeBits[0]} – ${timeBits[1]}`
      : timeBits.length === 1
        ? timeBits[0]
        : '';
  const showRating = model.rating != null && !Number.isNaN(model.rating);
  const showTimeRow = Boolean(timeRatingLine || showRating);

  const chipExtras: { label: string; tone?: 'default' | 'muted' | 'warning' }[] = [];
  if (model.priceLabel) chipExtras.push({ label: model.priceLabel, tone: 'muted' });
  const chipList = [...(model.chips ?? []), ...chipExtras];

  const leftCol = (
    <div className="flex w-[5.5rem] shrink-0 flex-col sm:w-[4.75rem]">
      {model.photoUrl ? (
        <div className="aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-muted">
          <img
            src={model.photoUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : hasCoords && mapOk ? (
        <a
          href={mapOpenUrl(model.lat!, model.lng!)}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-muted"
          title="地图"
        >
          <img
            src={osmStaticMapThumbUrl(model.lat!, model.lng!)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setMapOk(false)}
          />
        </a>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border/60 bg-muted/80">
          {typeIcon(model.itemType)}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border/80 bg-background p-3 shadow-sm sm:flex-row sm:items-start sm:gap-4',
        className
      )}
    >
      {leftCol}
      <div className="min-w-0 flex-1 space-y-1.5">
        {showTimeRow ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {timeRatingLine ? <span className="font-mono tabular-nums">{timeRatingLine}</span> : null}
            {showRating ? (
              <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                <Star className="h-3 w-3 fill-current" aria-hidden />
                <span className="tabular-nums">{model.rating!.toFixed(1)}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        <h4 className="text-[15px] font-semibold leading-snug text-foreground sm:text-base">{model.title}</h4>

        {model.suggestedPoiSearchQueries !== undefined ? (
          <div className="rounded-md border border-sky-500/25 bg-sky-500/[0.06] px-2.5 py-2 dark:bg-sky-950/30">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-sky-900 dark:text-sky-200">
              <Search className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              <span>建议检索（REST · single_poi_catalog_multi_day）</span>
            </div>
            {model.suggestedPoiSearchQueries.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {model.suggestedPoiSearchQueries.map((q, i) => (
                  <li key={`${q}-${i}`}>
                    <Chip label={q} tone="muted" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-muted-foreground">未下发 suggested_poi_search_queries</p>
            )}
          </div>
        ) : null}

        {model.address ? (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            <span className="line-clamp-2 min-w-0">{model.address}</span>
          </p>
        ) : null}

        {chipList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chipList.map((c, i) => (
              <Chip key={`${c.label}-${i}`} label={c.label} tone={c.tone} />
            ))}
          </div>
        ) : null}

        {safetyUi?.badges?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {safetyUi.badges.map((b) => (
              <Chip key={b.key} label={b.label} tone={b.tone === 'warning' ? 'warning' : 'muted'} />
            ))}
          </div>
        ) : null}

        {safetyUi?.detailBlocks?.length ? (
          <details className="rounded-md border border-amber-500/25 bg-amber-500/[0.04] px-2.5 py-2 text-[11px] text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground/90 select-none">安全 / 校验详情</summary>
            <div className="mt-2 space-y-2">
              {safetyUi.detailBlocks.map((block, i) => (
                <div key={`${block.title}-${i}`}>
                  <div className="text-[10px] font-semibold text-muted-foreground">{block.title}</div>
                  <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
                    {block.lines.map((ln, j) => (
                      <li key={j}>{ln}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {model.durationLabel ? (
          <div>
            <span className="inline-flex rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-foreground">
              {model.durationLabel}
            </span>
          </div>
        ) : null}

        {showPlaceLink && model.placeId ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-1.5">
            <Link
              to={`/dashboard/places/${encodeURIComponent(model.placeId)}`}
              className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              地点详情
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
