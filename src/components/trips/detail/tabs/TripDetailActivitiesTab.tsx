import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronRight,
  Clock,
  ExternalLink,
  Heart,
  MapPin,
  Ticket,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tripActivityFavoritesApi, TripDetailTabApiError } from '@/api/trip-detail-tab-client';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { usePlaceImages } from '@/hooks/usePlaceImages';
import { collectPlaceImages } from '@/lib/collect-place-images';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import { formatDayLabel } from '@/lib/trip-accommodation.util';
import { cn } from '@/lib/utils';
import type { PlaceImageInfo } from '@/types/place-image';
import type { BookingStatus, ItineraryItem, TripDetail } from '@/types/trip';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';
import { tripDetailUi } from '../trip-detail-ui';

type ActivityFilter = 'all' | 'favorites';

function itemTitle(item: ItineraryItem) {
  return resolveItineraryItemPlaceDisplayName(item) || item.note || '活动';
}

function resolveActivityImageUrl(
  item: ItineraryItem,
  placeImagesMap: Map<number, PlaceImageInfo[]>,
): string | undefined {
  const placeImages = item.Place?.id ? placeImagesMap.get(item.Place.id) : undefined;
  return collectPlaceImages({ placeImages, place: item.Place ?? null })[0]?.url;
}

function formatActivityDuration(startTime: string, endTime: string): string {
  const minutes = Math.max(0, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

function resolveBookingMeta(status?: BookingStatus | null) {
  if (status === 'BOOKED') {
    return { label: '已预订', className: tripDetailUi.tagVerified };
  }
  if (status === 'NEED_BOOKING') {
    return { label: '待预订', className: tripDetailUi.tagConfirm };
  }
  if (status === 'NO_BOOKING') {
    return { label: '无需预订', className: tripDetailUi.tagAllow };
  }
  return { label: '可预订', className: tripDetailUi.tagSuggest };
}

function resolveActivityExternalLink(item: ItineraryItem): string | undefined {
  const bookingUrl = item.bookingUrl?.trim();
  if (bookingUrl) return bookingUrl;

  const meta = item.Place?.metadata;
  const website =
    (typeof meta?.website === 'string' && meta.website.trim()) ||
    (typeof meta?.officialWebsite === 'string' && meta.officialWebsite.trim()) ||
    (typeof meta?.url === 'string' && meta.url.trim());
  return website || undefined;
}

function resolveActivityPrimaryActionLabel(item: ItineraryItem): string {
  if (item.bookingUrl?.trim()) {
    return item.bookingStatus === 'BOOKED' ? '查看预订详情' : '查看详情并预订';
  }
  if (item.bookingStatus === 'NO_BOOKING') return '打开官网';
  if (item.bookingStatus === 'NEED_BOOKING') return '前往官网预订';
  return '打开官网';
}

function StarRating({ rating }: { rating?: number | null }) {
  if (rating == null) return null;
  return (
    <span className="tabular-nums text-xs text-muted-foreground" aria-label={`${rating} 星`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

function ActivityImage({
  imageUrl,
  alt,
  className,
  loading,
}: {
  imageUrl?: string;
  alt: string;
  className?: string;
  loading?: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl && !imageError);
  const showSkeleton = loading || (showImage && !imageLoaded);

  return (
    <div className={cn('relative overflow-hidden bg-muted/40', className)}>
      {showSkeleton ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : null}
      {showImage ? (
        <img
          src={imageUrl}
          alt={alt}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            imageLoaded ? 'opacity-100' : 'opacity-0',
          )}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : !loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50">
          <Ticket className="h-7 w-7" />
          <span className="text-[10px]">暂无图片</span>
        </div>
      ) : null}
    </div>
  );
}

function ActivityCard({
  item,
  imageUrl,
  imagesLoading,
  selected,
  favorited,
  onSelect,
  onToggleFavorite,
  toggling,
}: {
  item: ItineraryItem;
  imageUrl?: string;
  imagesLoading?: boolean;
  selected: boolean;
  favorited: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  toggling?: boolean;
}) {
  const title = itemTitle(item);
  const booking = resolveBookingMeta(item.bookingStatus);
  const timeRange = `${format(new Date(item.startTime), 'HH:mm')} – ${format(new Date(item.endTime), 'HH:mm')}`;

  return (
    <article
      className={cn(
        tripDetailUi.card,
        'group relative w-full max-w-[192px] overflow-hidden transition-shadow duration-200',
        'hover:shadow-md',
        selected && tripDetailUi.selectedRing,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="relative h-[88px] overflow-hidden">
          <ActivityImage
            imageUrl={imageUrl}
            alt={title}
            className="h-full w-full"
            loading={imagesLoading && !imageUrl}
          />
          <div className="pointer-events-none absolute left-2 top-2">
            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 h-5 bg-background/90', booking.className)}>
              {booking.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 p-2.5">
          <h4 className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">{title}</h4>
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate tabular-nums">{timeRange}</span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35 group-hover:text-muted-foreground" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
            {item.Place?.rating != null ? <StarRating rating={item.Place.rating} /> : null}
            {item.estimatedCost ? (
              <span className={cn('tabular-nums', tripDetailUi.metricValue)}>
                {formatCurrency(item.estimatedCost, item.currency || 'CNY')}
              </span>
            ) : null}
          </div>
        </div>
      </button>

      <button
        type="button"
        aria-label={favorited ? '取消收藏' : '收藏活动'}
        disabled={toggling}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={cn(
          'absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full',
          'bg-background/90 transition-opacity',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          favorited && 'opacity-100',
          'hover:bg-background disabled:opacity-50',
        )}
      >
        <Heart
          className={cn(
            'h-3.5 w-3.5',
            favorited ? 'fill-foreground text-foreground' : 'text-muted-foreground',
          )}
        />
      </button>
    </article>
  );
}

function DetailFactRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm border-b border-border/50 last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function ActivityDetailDrawer({
  item,
  imageUrl,
  imagesLoading,
  favorited,
  togglingFavorite,
  onToggleFavorite,
  onOpenPlanStudio,
}: {
  item: ItineraryItem;
  imageUrl?: string;
  imagesLoading?: boolean;
  favorited: boolean;
  togglingFavorite: boolean;
  onToggleFavorite: () => void;
  onOpenPlanStudio?: () => void;
}) {
  const title = itemTitle(item);
  const booking = resolveBookingMeta(item.bookingStatus);
  const duration = formatActivityDuration(item.startTime, item.endTime);
  const timeRange = `${format(new Date(item.startTime), 'HH:mm')} – ${format(new Date(item.endTime), 'HH:mm')}`;
  const participantCount = item.participantIds?.length;
  const externalLink = resolveActivityExternalLink(item);

  return (
    <>
      <div className="shrink-0 border-b border-border/60 px-5 pb-4 pt-5 pr-12">
        <SheetHeader className="space-y-3 p-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className={cn('text-[10px]', booking.className)}>
              {booking.label}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={favorited ? '取消收藏' : '收藏活动'}
              disabled={togglingFavorite}
              onClick={onToggleFavorite}
            >
              <Heart className={cn('h-4 w-4', favorited && 'fill-foreground text-foreground')} />
            </Button>
          </div>
          <SheetTitle className="text-base font-semibold leading-snug">{title}</SheetTitle>
          {item.Place?.address ? (
            <SheetDescription asChild>
              <p className="flex items-start gap-1.5 text-xs leading-relaxed">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{item.Place.address}</span>
              </p>
            </SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title} 活动详情</SheetDescription>
          )}
        </SheetHeader>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 overflow-hidden rounded-lg border border-border/60">
          <ActivityImage
            imageUrl={imageUrl}
            alt={title}
            className="h-36 w-full"
            loading={imagesLoading && !imageUrl}
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/15 px-3">
          <DetailFactRow label="时段" value={timeRange} />
          <DetailFactRow label="时长" value={duration} />
          <DetailFactRow
            label="参与人数"
            value={participantCount != null && participantCount > 0 ? `${participantCount} 人` : '—'}
          />
          <DetailFactRow
            label="预估费用"
            value={
              item.estimatedCost ? (
                <span className={tripDetailUi.metricValue}>
                  {formatCurrency(item.estimatedCost, item.currency || 'CNY')}/人
                </span>
              ) : (
                '—'
              )
            }
          />
          {item.Place?.rating != null ? (
            <DetailFactRow label="评分" value={item.Place.rating.toFixed(1)} />
          ) : null}
        </div>

        {item.Place?.description ? (
          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-foreground">活动介绍</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.Place.description}</p>
          </div>
        ) : null}

        {item.bookingStatus === 'NEED_BOOKING' ? (
          <p className="mt-4 rounded-lg border border-gate-confirm-border bg-gate-confirm/10 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            此活动尚未完成预订，请关注天气变化与装备要求，出行前尽早确认。
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            请关注天气变化与装备要求，出行前确认预订状态。
          </p>
        )}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/60 bg-background px-5 py-4">
        {externalLink ? (
          <Button
            className={cn('w-full', tripDetailUi.primaryBtn)}
            onClick={() => window.open(externalLink, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {resolveActivityPrimaryActionLabel(item)}
          </Button>
        ) : onOpenPlanStudio ? (
          <Button className={cn('w-full', tripDetailUi.primaryBtn)} onClick={onOpenPlanStudio}>
            在规划工作台编辑
          </Button>
        ) : null}
        {onOpenPlanStudio ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={onOpenPlanStudio}
          >
            编辑行程
          </Button>
        ) : null}
      </div>
    </>
  );
}

function EmptyActivitiesState({ onOpenPlanStudio }: { onOpenPlanStudio?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <Ticket className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
      <p className="text-sm font-medium text-foreground">还没有安排活动</p>
      <p className="mt-1 text-xs text-muted-foreground">在规划工作台添加景点、体验或门票活动</p>
      {onOpenPlanStudio ? (
        <Button size="sm" className={cn('mt-4', tripDetailUi.primaryBtn)} onClick={onOpenPlanStudio}>
          前往规划工作台
        </Button>
      ) : null}
    </div>
  );
}

interface TripDetailActivitiesTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenPlanStudio?: () => void;
}

export default function TripDetailActivitiesTab({
  tripId,
  trip,
  onOpenPlanStudio,
}: TripDetailActivitiesTabProps) {
  const [favoriteItemIds, setFavoriteItemIds] = useState<Set<string>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const loadFavorites = useCallback(async () => {
    if (!tripId) return;
    try {
      setFavoritesLoading(true);
      const data = await tripActivityFavoritesApi.list(tripId);
      setFavoriteItemIds(new Set(data.itineraryItemIds ?? []));
    } catch {
      setFavoriteItemIds(new Set());
    } finally {
      setFavoritesLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const handleToggleFavorite = useCallback(
    async (item: ItineraryItem) => {
      const next = !favoriteItemIds.has(item.id);
      setTogglingId(item.id);
      try {
        const data = await tripActivityFavoritesApi.toggleItineraryItem(tripId, item.id, next);
        setFavoriteItemIds(new Set(data.itineraryItemIds ?? []));
        toast.success(next ? '已加入收藏' : '已取消收藏');
      } catch (err) {
        toast.error(err instanceof TripDetailTabApiError ? err.message : '收藏操作失败');
      } finally {
        setTogglingId(null);
      }
    },
    [tripId, favoriteItemIds],
  );

  const activitiesByDay = useMemo(() => {
    return (trip.TripDay || []).map((day, dayIndex) => ({
      day,
      dayIndex,
      activities: (day.ItineraryItem || []).filter((item) => item.type === 'ACTIVITY'),
    }));
  }, [trip.TripDay]);

  const allActivities = useMemo(
    () => activitiesByDay.flatMap((d) => d.activities),
    [activitiesByDay],
  );

  const activityPlaces = useMemo(() => {
    const map = new Map<number, { id: number; nameCN?: string; nameEN?: string | null; category?: string }>();
    allActivities.forEach((item) => {
      if (item.Place?.id) {
        map.set(item.Place.id, {
          id: item.Place.id,
          nameCN: item.Place.nameCN,
          nameEN: item.Place.nameEN,
          category: item.Place.category,
        });
      }
    });
    return Array.from(map.values());
  }, [allActivities]);

  const { images: placeImagesMap, loading: imagesLoading } = usePlaceImages(activityPlaces);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const selected = allActivities.find((a) => a.id === selectedId);

  const stats = useMemo(() => {
    const bookedCount = allActivities.filter((item) => item.bookingStatus === 'BOOKED').length;
    const needBookingCount = allActivities.filter((item) => item.bookingStatus === 'NEED_BOOKING').length;
    return {
      total: allActivities.length,
      bookedCount,
      needBookingCount,
      favoriteCount: favoriteItemIds.size,
    };
  }, [allActivities, favoriteItemIds]);

  const filteredActivitiesByDay = useMemo(() => {
    if (filter === 'all') return activitiesByDay;
    return activitiesByDay
      .map(({ day, dayIndex, activities }) => ({
        day,
        dayIndex,
        activities: activities.filter((item) => favoriteItemIds.has(item.id)),
      }))
      .filter(({ activities }) => activities.length > 0);
  }, [activitiesByDay, favoriteItemIds, filter]);

  const handleSelectActivity = useCallback((itemId: string) => {
    setSelectedId(itemId);
    setDrawerOpen(true);
  }, []);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (!open) setSelectedId(null);
  }, []);

  const handleOpenPlanStudioForSelected = useCallback(() => {
    onOpenPlanStudio?.();
    setDrawerOpen(false);
  }, [onOpenPlanStudio]);

  if (favoritesLoading && allActivities.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <LogoLoading size={40} />
      </div>
    );
  }

  if (allActivities.length === 0) {
    return <EmptyActivitiesState onOpenPlanStudio={onOpenPlanStudio} />;
  }

  const selectedImageUrl = selected
    ? resolveActivityImageUrl(selected, placeImagesMap)
    : undefined;

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              活动安排（{stats.total} 个）
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              已预订 {stats.bookedCount}
              {stats.needBookingCount > 0 ? ` · 待订 ${stats.needBookingCount}` : ''}
              {stats.favoriteCount > 0 ? ` · 收藏 ${stats.favoriteCount}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setFilter('favorites')}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors inline-flex items-center gap-1',
                  filter === 'favorites'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Heart className="h-3 w-3" />
                已收藏
                {stats.favoriteCount > 0 ? (
                  <span className="tabular-nums text-[10px] text-muted-foreground">({stats.favoriteCount})</span>
                ) : null}
              </button>
            </div>
            {onOpenPlanStudio ? (
              <Button size="sm" variant="outline" onClick={onOpenPlanStudio}>
                编辑行程
              </Button>
            ) : null}
          </div>
        </div>

        {filter === 'favorites' && filteredActivitiesByDay.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
            <Heart className="mx-auto mb-2 h-8 w-8 text-muted-foreground/35" />
            <p className="text-sm text-muted-foreground">还没有收藏的活动</p>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setFilter('all')}>
              查看全部活动
            </Button>
          </div>
        ) : (
          filteredActivitiesByDay.map(({ day, dayIndex, activities }) => {
            const { short, weekday } = formatDayLabel(day.date);
            return (
              <section key={day.id} className={cn(tripDetailUi.card, 'overflow-hidden')}>
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/60">
                      <span className="text-[10px] font-medium text-muted-foreground">Day</span>
                      <span className="text-sm font-bold leading-none text-foreground">{dayIndex + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {day.theme || short}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {short}
                        {weekday ? ` · ${weekday}` : ''}
                        {' · '}
                        {activities.length} 个活动
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                    {format(new Date(day.date), 'MM-dd', { locale: zhCN })}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3 p-4">
                  {activities.map((item) => (
                    <ActivityCard
                      key={item.id}
                      item={item}
                      imageUrl={resolveActivityImageUrl(item, placeImagesMap)}
                      imagesLoading={imagesLoading}
                      selected={drawerOpen && selectedId === item.id}
                      favorited={favoriteItemIds.has(item.id)}
                      toggling={togglingId === item.id}
                      onSelect={() => handleSelectActivity(item.id)}
                      onToggleFavorite={() => void handleToggleFavorite(item)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}

        <p className="text-xs text-muted-foreground">
          点击活动卡片查看详情
        </p>
      </div>

      <Sheet open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          {selected ? (
            <ActivityDetailDrawer
              item={selected}
              imageUrl={selectedImageUrl}
              imagesLoading={imagesLoading}
              favorited={favoriteItemIds.has(selected.id)}
              togglingFavorite={togglingId === selected.id}
              onToggleFavorite={() => void handleToggleFavorite(selected)}
              onOpenPlanStudio={onOpenPlanStudio ? handleOpenPlanStudioForSelected : undefined}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
