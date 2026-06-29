import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react';
import type { CoverageMapPoi } from '@/api/readiness';
import { PlaceImageViewerDialog } from '@/components/plan-studio/PlaceImageViewerDialog';
import { WeatherMini } from '@/components/weather/WeatherCard';
import type { PlaceImageInfo } from '@/types/place-image';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { collectPlaceImages } from '@/lib/collect-place-images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { JourneyActivity } from '../types';
import type { JourneyInspectorActivityHeader } from '../types-inspector-view';
import {
  buildJourneyMapActivityPlaceView,
  resolveItineraryItemForActivity,
} from '../lib/build-journey-map-activity-place-view';
import {
  journeyMapFocusRing,
  journeyMapIntensityBadge,
  workbenchCard,
} from '../journey-map-ui';

export interface JourneyMapActivityDetailPanelProps {
  activity: JourneyActivity;
  header: JourneyInspectorActivityHeader;
  activityTypeLabel?: string;
  itineraryItem?: ItineraryItemDetail | null;
  coveragePoi?: CoverageMapPoi | null;
  trip?: TripDetail | null;
  placeImages?: PlaceImageInfo[] | null;
  onEditItem?: (item: ItineraryItemDetail) => void;
  onReplaceItem?: (item: ItineraryItemDetail) => void;
  onDeleteItem?: (item: ItineraryItemDetail) => void;
}

export function JourneyMapActivityDetailPanel({
  activity,
  header,
  activityTypeLabel,
  itineraryItem,
  coveragePoi,
  trip,
  placeImages,
  onEditItem,
  onReplaceItem,
  onDeleteItem,
}: JourneyMapActivityDetailPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);

  const placeView = useMemo(
    () =>
      buildJourneyMapActivityPlaceView({
        activity,
        item: itineraryItem ?? null,
        poi: coveragePoi ?? null,
        trip,
      }),
    [activity, itineraryItem, coveragePoi, trip],
  );

  const allImages = useMemo(
    () =>
      collectPlaceImages({
        placeImages,
        place: itineraryItem?.Place ?? null,
        fallbackUrl: placeView.imageUrl,
      }),
    [placeImages, itineraryItem?.Place, placeView.imageUrl],
  );

  const thumbnailUrl = allImages[0]?.url;
  const canViewImages = allImages.length > 0 && !imageError;

  const handleOpenImageViewer = () => {
    if (!canViewImages) return;
    const primaryImage = placeImages?.find((img) => img.isPrimary) || placeImages?.[0];
    const imageIndex = primaryImage
      ? allImages.findIndex((img) => img.url === primaryImage.url)
      : 0;
    setImageViewerIndex(imageIndex >= 0 ? imageIndex : 0);
    setImageViewerOpen(true);
  };

  const hasExpandableDetail = Boolean(
    placeView.description ||
      placeView.phone ||
      placeView.website ||
      (placeView.tags?.length ?? 0) > 0 ||
      activity.equipment?.length ||
      activity.guideInfo ||
      activity.weatherWindow ||
      activityTypeLabel,
  );

  const showMetricsRow =
    placeView.timeLabel ||
    placeView.contextBadges.length > 0 ||
    placeView.rating != null ||
    placeView.showWeather;

  return (
    <div className="p-4">
      <section className={cn(workbenchCard, 'overflow-hidden p-3')}>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {header.dayLabel}
          </p>
          {header.intensityLabel ? (
            <Badge className={cn(journeyMapIntensityBadge, 'h-5 shrink-0 text-[10px]')}>
              {header.intensityLabel}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            className={cn(
              'relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30',
              canViewImages && 'cursor-pointer transition-opacity hover:opacity-85',
              journeyMapFocusRing,
            )}
            onClick={canViewImages ? handleOpenImageViewer : undefined}
            aria-label={canViewImages ? `查看 ${header.title} 的图片` : undefined}
            disabled={!canViewImages}
          >
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                暂无图片
              </div>
            )}
            {allImages.length > 1 ? (
              <span className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                +{allImages.length - 1}
              </span>
            ) : null}
          </button>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {header.title}
            </h3>
            {header.titleEn ? (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{header.titleEn}</p>
            ) : null}

            {showMetricsRow ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                {placeView.timeLabel ? (
                  <span className="font-mono-brand text-[11px] font-medium text-nara-glacier-foreground">
                    {placeView.timeLabel}
                  </span>
                ) : null}
                {placeView.contextBadges.map((badge) => (
                  <Badge
                    key={badge.label}
                    variant="outline"
                    className={cn('h-5 px-1.5 text-[10px] font-normal', badge.className)}
                  >
                    {badge.label}
                  </Badge>
                ))}
                {placeView.rating != null ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                    {placeView.rating.toFixed(1)}
                  </span>
                ) : null}
                {placeView.showWeather ? (
                  <WeatherMini location={placeView.weatherLocation ?? null} isForecast />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {(placeView.address || placeView.categoryLabel || placeView.hoursBadge) && (
          <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
            {placeView.address ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">{placeView.address}</p>
            ) : null}

            {(placeView.categoryLabel || placeView.hoursBadge) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {placeView.categoryLabel ? (
                  <Badge variant="outline" className="h-5 text-[10px] font-normal">
                    {placeView.categoryLabel}
                  </Badge>
                ) : null}
                {placeView.hoursBadge ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 text-[10px] font-normal',
                      placeView.hoursBadge.tone === 'open' &&
                        'border-emerald-200 bg-emerald-50 text-emerald-700',
                      placeView.hoursBadge.tone === 'closed' &&
                        'border-red-200 bg-red-50 text-red-700',
                    )}
                  >
                    {placeView.hoursBadge.label}
                  </Badge>
                ) : null}
              </div>
            )}
          </div>
        )}

        {hasExpandableDetail ? (
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'mt-2 h-7 w-full text-[11px] text-muted-foreground hover:text-foreground',
                  journeyMapFocusRing,
                )}
              >
                {detailsOpen ? (
                  <>
                    收起详情 <ChevronUp className="ml-1 h-3 w-3" aria-hidden />
                  </>
                ) : (
                  <>
                    查看详情 <ChevronDown className="ml-1 h-3 w-3" aria-hidden />
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 border-t border-dashed border-border/60 pt-2">
                {placeView.description ? (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {placeView.description}
                  </p>
                ) : null}

                {(placeView.phone || placeView.website) && (
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {placeView.phone ? <span>{placeView.phone}</span> : null}
                    {placeView.website ? (
                      <a
                        href={placeView.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        官网
                      </a>
                    ) : null}
                  </div>
                )}

                {placeView.tags?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {placeView.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="h-5 text-[10px] font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {activityTypeLabel ? (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">活动类型 · </span>
                    {activityTypeLabel}
                  </p>
                ) : null}

                {activity.equipment?.length ? (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">装备 · </span>
                    {activity.equipment.join('、')}
                  </p>
                ) : null}

                {activity.guideInfo ? (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">向导 · </span>
                    {activity.guideInfo}
                  </p>
                ) : null}

                {activity.weatherWindow ? (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">天气窗口 · </span>
                    {activity.weatherWindow}
                  </p>
                ) : null}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {(onEditItem || onReplaceItem || onDeleteItem) && (
          <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
            {itineraryItem ? (
              <div className="flex flex-col gap-1.5">
                {onEditItem ? (
                  <Button
                    type="button"
                    size="sm"
                    className={cn('h-8 w-full justify-center gap-1.5 text-xs', journeyMapFocusRing)}
                    onClick={() => onEditItem(itineraryItem)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    编辑行程项
                  </Button>
                ) : null}
                {onReplaceItem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn('h-8 w-full justify-center gap-1.5 text-xs', journeyMapFocusRing)}
                    onClick={() => onReplaceItem(itineraryItem)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    替换地点
                  </Button>
                ) : null}
                {onDeleteItem ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      'h-8 w-full justify-center gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive',
                      journeyMapFocusRing,
                    )}
                    onClick={() => onDeleteItem(itineraryItem)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    删除行程项
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                未匹配到对应行程项，可在时间轴手动核对
              </p>
            )}
          </div>
        )}
      </section>

      <PlaceImageViewerDialog
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
        images={allImages}
        initialIndex={imageViewerIndex}
        title={header.title}
      />
    </div>
  );
}

export function buildActivityDetailPanelProps(input: {
  activity: JourneyActivity;
  header: JourneyInspectorActivityHeader;
  activityTypeLabel?: string;
  itineraryItems: ItineraryItemDetail[];
  selectionItem?: ItineraryItemDetail | null;
  coveragePoi?: CoverageMapPoi | null;
  trip?: TripDetail | null;
  placeImages?: PlaceImageInfo[] | null;
}): JourneyMapActivityDetailPanelProps {
  const itineraryItem = resolveItineraryItemForActivity(
    input.activity,
    input.itineraryItems,
    input.selectionItem,
  );

  return {
    activity: input.activity,
    header: input.header,
    activityTypeLabel: input.activityTypeLabel,
    itineraryItem,
    coveragePoi: input.coveragePoi,
    trip: input.trip,
    placeImages: input.placeImages,
  };
}
