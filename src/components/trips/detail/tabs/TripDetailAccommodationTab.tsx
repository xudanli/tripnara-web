import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BedDouble,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Info,
  MapPin,
  MoreVertical,
  Plus,
  Route,
  Upload,
} from 'lucide-react';
import { tripAccommodationApi } from '@/api/trip-detail-tab-client';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  adaptAccommodationFromTrip,
  adaptAccommodationOverview,
} from '@/lib/accommodation-overview.util';
import { cn } from '@/lib/utils';
import {
  findFirstMissingNightIndex,
  formatDayLabel,
  formatStayDateTime,
  formatTravelDistance,
  formatTravelDuration,
  resolveAccommodationTitle,
  resolveAccommodationTravelerCount,
  resolveAmenityTags,
  resolveBookingStatusMeta,
  resolvePlaceImageUrl,
  resolveRoomDescription,
  resolveStayNights,
  routeImpactStatusLabel,
  type AccommodationAlternativeView,
  type AccommodationNightView,
  type RouteImpactStatus,
} from '@/lib/trip-accommodation.util';
import type { ItineraryItem, TripDetail } from '@/types/trip';
import { formatCurrency } from '@/utils/format';
import { TripDetailSection, TripDetailTwoColumn, tripDetailUi } from '../trip-detail-ui';

function bookingStatusClass(tone: ReturnType<typeof resolveBookingStatusMeta>['tone']) {
  if (tone === 'verified') return tripDetailUi.tagVerified;
  if (tone === 'allow') return tripDetailUi.tagAllow;
  return tripDetailUi.tagConfirm;
}

function routeStatusClass(status: RouteImpactStatus) {
  if (status === 'smooth') return tripDetailUi.tagVerified;
  if (status === 'caution') return tripDetailUi.tagConfirm;
  return 'border-border bg-muted/40 text-muted-foreground';
}

function ReminderIcon({ tone }: { tone: 'warning' | 'info' | 'success' }) {
  if (tone === 'warning') return <AlertCircle className="w-4 h-4 shrink-0 text-gate-confirm-foreground" />;
  if (tone === 'success') return <CheckCircle2 className="w-4 h-4 shrink-0 text-gate-allow-foreground" />;
  return <Info className="w-4 h-4 shrink-0 text-muted-foreground" />;
}

function StarRating({ rating }: { rating?: number | null }) {
  if (rating == null) return null;
  return (
    <span className="tabular-nums text-xs text-muted-foreground" aria-label={`${rating} 星`}>
      ★ {rating.toFixed(1)}
    </span>
  );
}

function TravelerAvatars({ count }: { count: number }) {
  const shown = Math.min(count, 4);
  const extra = count > 4 ? count - 4 : 0;

  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground"
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}
      {extra > 0 ? (
        <div className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground">
          +{extra}
        </div>
      ) : null}
    </div>
  );
}

function RouteImpactPanel({ impact }: { impact?: AccommodationNightView['routeImpact'] }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 h-full min-h-[140px] flex flex-col">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mb-2">
        <Route className="w-3.5 h-3.5" />
        路线影响
      </div>
      <div className={cn('rounded-md h-16 mb-2 flex items-center justify-center', tripDetailUi.imagePlaceholder)}>
        <MapPin className="w-5 h-5 text-muted-foreground/50" />
      </div>
      {impact ? (
        <>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{impact.label}</p>
          <div className="flex items-center gap-2 text-xs text-foreground tabular-nums mt-auto">
            {formatTravelDuration(impact.durationMinutes) ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                {formatTravelDuration(impact.durationMinutes)}
              </span>
            ) : null}
            {formatTravelDistance(impact.distanceMeters) ? (
              <span>{formatTravelDistance(impact.distanceMeters)}</span>
            ) : null}
          </div>
          <Badge variant="outline" className={cn('mt-2 text-[10px] w-fit', routeStatusClass(impact.status))}>
            {routeImpactStatusLabel(impact.status)}
          </Badge>
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-auto">暂无路线数据</p>
      )}
    </div>
  );
}

function AlternativeCard({
  alternative,
  onSelect,
}: {
  alternative: AccommodationAlternativeView;
  onSelect?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/15 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className={tripDetailUi.tagSuggest}>
          推荐替代方案
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          可替换
        </Badge>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className={cn('w-full sm:w-24 h-20 rounded-md shrink-0 overflow-hidden', tripDetailUi.imagePlaceholder)}>
          {alternative.imageUrl ? (
            <img src={alternative.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BedDouble className="w-5 h-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{alternative.name}</p>
            <StarRating rating={alternative.rating} />
          </div>
          {alternative.reason ? (
            <p className="text-xs text-muted-foreground">{alternative.reason}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
            {alternative.priceDelta != null && alternative.priceDelta < 0 ? (
              <span className="text-gate-allow-foreground font-medium tabular-nums">
                便宜 {formatCurrency(Math.abs(alternative.priceDelta), alternative.currency ?? 'CNY')}
              </span>
            ) : null}
            {alternative.travelDeltaMinutes != null ? (
              <span className="text-muted-foreground tabular-nums">
                {alternative.travelDeltaMinutes > 0 ? '+' : ''}
                {alternative.travelDeltaMinutes}min
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex sm:flex-col gap-2 shrink-0">
          <Button size="sm" variant="outline" className="text-xs" onClick={onSelect}>
            选择替代
          </Button>
          <Button size="sm" variant="ghost" className="text-xs text-muted-foreground">
            查看详情
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AccommodationBookingCard({
  item,
  night,
  travelerCount,
  onOpenPlanStudio,
}: {
  item: ItineraryItem;
  night: AccommodationNightView;
  travelerCount: number;
  onOpenPlanStudio?: () => void;
}) {
  const title = resolveAccommodationTitle(item);
  const booking = resolveBookingStatusMeta(item.bookingStatus);
  const imageUrl = resolvePlaceImageUrl(item.Place);
  const roomDesc = resolveRoomDescription(item, travelerCount);
  const amenities = resolveAmenityTags(item);
  const nights = resolveStayNights(item);
  const checkIn = formatStayDateTime(item.startTime);
  const checkOut = formatStayDateTime(item.endTime);
  const nightlyCost = item.estimatedCost;
  const totalCost = nightlyCost != null ? nightlyCost * nights : undefined;
  const currency = item.currency || 'CNY';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-[160px_1fr_180px_140px_200px] gap-0">
        <div className={cn('relative h-40 xl:h-auto xl:min-h-[180px]', tripDetailUi.imagePlaceholder)}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BedDouble className="w-8 h-8 text-muted-foreground/35" />
            </div>
          )}
          <Badge
            variant="outline"
            className={cn('absolute top-2 right-2 text-[10px] backdrop-blur-sm bg-background/80', bookingStatusClass(booking.tone))}
          >
            {booking.label}
          </Badge>
        </div>

        <div className="p-4 space-y-2 border-t xl:border-t-0 xl:border-l border-border/60 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-foreground truncate">{title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={item.Place?.rating} />
                {item.Place?.rating != null ? (
                  <span className="text-xs text-muted-foreground tabular-nums">{item.Place.rating.toFixed(1)}</span>
                ) : null}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onOpenPlanStudio}>在规划工作台编辑</DropdownMenuItem>
                {item.bookingUrl ? (
                  <DropdownMenuItem onClick={() => window.open(item.bookingUrl!, '_blank', 'noopener,noreferrer')}>
                    打开预订链接
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {item.Place?.address ? (
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{item.Place.address}</span>
            </p>
          ) : null}

          {roomDesc ? <p className="text-xs text-foreground">{roomDesc}</p> : null}

          {amenities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {amenities.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <TravelerAvatars count={item.participantIds?.length ?? travelerCount} />
            <span className="text-[11px] text-muted-foreground">入住成员</span>
          </div>
        </div>

        <div className="p-4 space-y-3 border-t xl:border-t-0 xl:border-l border-border/60 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">入住</p>
            <p className="font-medium text-foreground">{checkIn ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">退房</p>
            <p className="font-medium text-foreground">{checkOut ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">时长</p>
            <p className="font-medium text-foreground">{nights} 晚</p>
          </div>
        </div>

        <div className="p-4 border-t xl:border-t-0 xl:border-l border-border/60 flex flex-col justify-center">
          {nightlyCost != null ? (
            <>
              <p className="text-xs text-muted-foreground">每晚</p>
              <p className={cn('text-lg font-semibold tabular-nums', tripDetailUi.metricValue)}>
                {formatCurrency(nightlyCost, currency)}
              </p>
              {totalCost != null && nights > 1 ? (
                <>
                  <p className="text-xs text-muted-foreground mt-3">预估总价</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(totalCost, currency)}
                  </p>
                </>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">暂无价格</p>
          )}
        </div>

        <div className="p-4 border-t xl:border-t-0 xl:border-l border-border/60">
          <RouteImpactPanel impact={night.routeImpact} />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/60 flex flex-wrap gap-2">
        {item.bookingStatus === 'BOOKED' ? (
          <Button size="sm" variant="outline">
            查看预订
          </Button>
        ) : (
          <Button size="sm" className={tripDetailUi.primaryBtn} onClick={onOpenPlanStudio}>
            待确认
          </Button>
        )}
        {item.bookingConfirmation ? (
          <span className="text-xs text-muted-foreground self-center">
            确认号 {item.bookingConfirmation}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function EmptyNightCard({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center bg-card/50">
      <BedDouble className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">尚未安排住宿</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onAdd}>
        <Plus className="w-4 h-4 mr-1" />
        添加住宿
      </Button>
    </div>
  );
}

function DayAccommodationSection({
  night,
  travelerCount,
  onOpenPlanStudio,
}: {
  night: AccommodationNightView;
  travelerCount: number;
  onOpenPlanStudio?: () => void;
}) {
  const { short, weekday } = formatDayLabel(night.day.date);
  const dayNum = night.dayIndex + 1;

  return (
    <div className={cn(tripDetailUi.card, 'p-4 space-y-3')}>
      <div className="flex items-baseline gap-3">
        <div className="shrink-0 w-[72px]">
          <p className="text-sm font-bold text-foreground">Day {dayNum}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {short}
            {weekday ? ` ${weekday}` : ''}
          </p>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          {night.item ? (
            <AccommodationBookingCard
              item={night.item}
              night={night}
              travelerCount={travelerCount}
              onOpenPlanStudio={onOpenPlanStudio}
            />
          ) : (
            <EmptyNightCard onAdd={onOpenPlanStudio} />
          )}

          {night.item && night.alternatives.length > 0
            ? night.alternatives.map((alt) => (
                <AlternativeCard key={alt.id} alternative={alt} onSelect={onOpenPlanStudio} />
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

interface TripDetailAccommodationTabProps {
  tripId: string;
  trip: TripDetail;
  onOpenPlanStudio?: () => void;
}

export default function TripDetailAccommodationTab({
  tripId,
  trip,
  onOpenPlanStudio,
}: TripDetailAccommodationTabProps) {
  const [overview, setOverview] = useState<Awaited<
    ReturnType<typeof tripAccommodationApi.loadTabData>
  > | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tripAccommodationApi
      .loadTabData(tripId)
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
        }
      })
      .catch(() => {
        if (!cancelled) setOverview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const derived = useMemo(() => {
    if (overview) return adaptAccommodationOverview(overview);
    return adaptAccommodationFromTrip(trip);
  }, [overview, trip]);

  const { nights, reminders, routeSegments, documents, stats } = derived;
  const travelerCount = resolveAccommodationTravelerCount(trip);
  const missingNightIdx = findFirstMissingNightIndex(nights);

  const missingLabel =
    missingNightIdx != null
      ? `Day ${missingNightIdx + 1}${missingNightIdx + 1 < nights.length ? ` – Day ${nights.length}` : ''}`
      : null;

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-24">
        <LogoLoading size={40} />
      </div>
    );
  }

  return (
    <TripDetailTwoColumn
      main={
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                住宿安排（{stats?.totalNights ?? nights.length} 晚）
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {stats
                  ? `已预订 ${stats.bookedCount} · 待订 ${stats.needBookingCount} · 缺资料 ${stats.missingDocumentCount}`
                  : '管理每晚住宿、预订状态与对次日路线的影响'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onOpenPlanStudio}>
                批量操作
              </Button>
              <Button size="sm" className={tripDetailUi.primaryBtn} onClick={onOpenPlanStudio}>
                <Plus className="w-4 h-4 mr-1" />
                添加住宿
              </Button>
            </div>
          </div>

          {nights.map((night) => (
            <DayAccommodationSection
              key={night.day.id}
              night={night}
              travelerCount={travelerCount}
              onOpenPlanStudio={onOpenPlanStudio}
            />
          ))}

          {missingLabel ? (
            <button
              type="button"
              onClick={onOpenPlanStudio}
              className="w-full rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
              添加住宿（{missingLabel}）
            </button>
          ) : null}

          <p className="text-xs text-muted-foreground text-center pt-1">
            建议至少提前 48 小时完成预订；旺季请尽早确认住宿。
          </p>
        </div>
      }
      sidebar={
        <>
          <TripDetailSection title="住宿提醒">
            {reminders.length > 0 ? (
              <ul className="space-y-3">
                {reminders.map((reminder) => (
                  <li key={reminder.id} className="flex items-start gap-2 text-sm text-foreground">
                    <ReminderIcon tone={reminder.tone} />
                    <span>{reminder.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无提醒</p>
            )}
          </TripDetailSection>

          <TripDetailSection title="路线影响概览">
            {routeSegments.length > 0 ? (
              <ul className="space-y-3">
                {routeSegments.map((segment) => (
                  <li key={segment.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{segment.label}</p>
                      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                        {[formatTravelDuration(segment.durationMinutes), formatTravelDistance(segment.distanceMeters)]
                          .filter(Boolean)
                          .join(' · ') || '暂无数据'}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', routeStatusClass(segment.status))}>
                      {routeImpactStatusLabel(segment.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无路线数据</p>
            )}
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={onOpenPlanStudio}>
              查看完整路线分析
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </TripDetailSection>

          <TripDetailSection title="预订资料">
            {documents.length > 0 ? (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.name}</p>
                      {doc.dayIndex != null ? (
                        <p className="text-[11px] text-muted-foreground">Day {doc.dayIndex + 1}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          doc.status === 'BOOKED' ? tripDetailUi.tagVerified : tripDetailUi.tagConfirm,
                        )}
                      >
                        {doc.status === 'BOOKED' ? '已预订' : '待确认'}
                      </Badge>
                      {doc.url ? (
                        <Button
                          variant="link"
                          className={tripDetailUi.linkInline}
                          onClick={() => window.open(doc.url!, '_blank', 'noopener,noreferrer')}
                        >
                          查看
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无预订资料</p>
            )}
            <Button variant="outline" size="sm" className="w-full mt-3">
              <Upload className="w-4 h-4 mr-1.5" />
              添加预订资料
            </Button>
          </TripDetailSection>
        </>
      }
    />
  );
}
