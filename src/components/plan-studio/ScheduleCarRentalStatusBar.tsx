import { useCallback, useEffect, useMemo, useState } from 'react';
import { Car, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { bookingComApi, type CarRentalItem } from '@/api/booking-com';
import { readinessApi, type CoverageMapResponse } from '@/api/readiness';
import type { ItineraryItem, TripDetail } from '@/types/trip';
import { cn } from '@/lib/utils';
import {
  CAR_RENTAL_STATUS_LABELS,
  extractCarRentalsFromSearchPayload,
  getCheapestRental,
  resolveCarRentalBookingFromItems,
  resolveCarRentalSearchContext,
  type CarRentalBarStatus,
} from '@/lib/trip-car-rental-status';
import { generateQuickActionMessage } from '@/utils/planning-assistant-helpers';
import { format } from 'date-fns';

interface ScheduleCarRentalStatusBarProps {
  trip: TripDetail;
  tripId: string;
  itineraryItems?: ItineraryItem[];
  onAskAssistant?: (question: string) => void;
  className?: string;
}

function formatTripDateRange(trip: TripDetail): string {
  const start = trip.startDate?.includes('T') ? trip.startDate.split('T')[0] : trip.startDate;
  const end = trip.endDate?.includes('T') ? trip.endDate.split('T')[0] : trip.endDate;
  if (!start || !end) return '日期待定';
  try {
    return `${format(new Date(start), 'M月d日')} — ${format(new Date(end), 'M月d日')}`;
  } catch {
    return `${start} — ${end}`;
  }
}

function formatPrice(item: CarRentalItem | null): string | null {
  if (!item) return null;
  const amount = item.price?.amount ?? item.totalPrice;
  if (amount == null) return null;
  const currency = item.price?.currency ?? item.currency ?? 'USD';
  return `${currency} ${amount.toLocaleString()}`;
}

export default function ScheduleCarRentalStatusBar({
  trip,
  tripId,
  itineraryItems = [],
  onAskAssistant,
  className,
}: ScheduleCarRentalStatusBarProps) {
  const bookingSnapshot = useMemo(
    () => resolveCarRentalBookingFromItems(itineraryItems),
    [itineraryItems],
  );

  const [coverageMap, setCoverageMap] = useState<CoverageMapResponse | null>(null);
  const [quotes, setQuotes] = useState<CarRentalItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchContext = useMemo(
    () => resolveCarRentalSearchContext(trip, coverageMap),
    [trip, coverageMap],
  );

  const displayStatus: CarRentalBarStatus = useMemo(() => {
    if (bookingSnapshot.status === 'confirmed') return 'confirmed';
    if (bookingSnapshot.status === 'need_booking') return 'need_booking';
    if (!searchContext) return 'missing_dates';
    if (serviceAvailable === false) return 'unavailable';
    if (quotes.length > 0) return 'quoted';
    if (hasSearched && quotes.length === 0 && !searching) return 'pending';
    return bookingSnapshot.status;
  }, [bookingSnapshot.status, searchContext, serviceAvailable, quotes.length, hasSearched, searching]);

  const statusMeta = CAR_RENTAL_STATUS_LABELS[displayStatus];
  const cheapest = useMemo(() => getCheapestRental(quotes), [quotes]);

  useEffect(() => {
    let cancelled = false;
    void readinessApi
      .getCoverageMapData(tripId)
      .then((data) => {
        if (!cancelled) setCoverageMap(data);
      })
      .catch(() => {
        if (!cancelled) setCoverageMap(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    void bookingComApi
      .health()
      .then((health) => {
        if (cancelled) return;
        const available =
          health.available === true ||
          health.ok === true ||
          (health as { data?: { available?: boolean } }).data?.available === true;
        setServiceAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setServiceAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(async () => {
    if (!searchContext) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await bookingComApi.search({
        pick_up_latitude: searchContext.pickUpLatitude,
        pick_up_longitude: searchContext.pickUpLongitude,
        drop_off_latitude: searchContext.dropOffLatitude,
        drop_off_longitude: searchContext.dropOffLongitude,
        pick_up_date: searchContext.pickUpDate,
        drop_off_date: searchContext.dropOffDate,
        pick_up_time: '10:00',
        drop_off_time: '10:00',
        driver_age: 30,
        currency_code: 'USD',
        location: searchContext.location,
      });
      const rentals = extractCarRentalsFromSearchPayload(result);
      setQuotes(rentals);
      setHasSearched(true);
      if (rentals.length === 0) {
        setSearchError('未查到可用报价，可让助手扩大搜索范围');
      }
    } catch (err: unknown) {
      setQuotes([]);
      setHasSearched(true);
      const message = err instanceof Error ? err.message : '查询租车报价失败';
      setSearchError(message);
      if (/not available|未配置|API Key/i.test(message)) {
        setServiceAvailable(false);
      }
    } finally {
      setSearching(false);
    }
  }, [searchContext]);

  const primaryCta = useMemo(() => {
    if (displayStatus === 'confirmed') {
      const url = bookingSnapshot.bookingUrl;
      if (url) {
        return {
          label: '查看预订',
          action: () => window.open(url, '_blank', 'noopener,noreferrer'),
        };
      }
      return null;
    }
    if (displayStatus === 'unavailable') {
      return onAskAssistant
        ? {
            label: '问助手',
            action: () =>
              onAskAssistant(generateQuickActionMessage('car', trip.destination)),
          }
        : null;
    }
    if (displayStatus === 'missing_dates') return null;
    if (quotes.length > 0) {
      const url = cheapest?.bookingUrl;
      if (url) {
        return {
          label: '去预订',
          action: () => window.open(url, '_blank', 'noopener,noreferrer'),
        };
      }
      return onAskAssistant
        ? {
            label: '问助手预订',
            action: () =>
              onAskAssistant(generateQuickActionMessage('car', trip.destination)),
          }
        : {
            label: '刷新报价',
            action: () => void runSearch(),
          };
    }
    return {
      label: searching ? '查询中…' : '查报价',
      action: () => void runSearch(),
    };
  }, [
    bookingSnapshot.bookingUrl,
    cheapest?.bookingUrl,
    displayStatus,
    onAskAssistant,
    quotes.length,
    runSearch,
    searching,
    trip.destination,
  ]);

  const subtitle = useMemo(() => {
    if (displayStatus === 'confirmed' && bookingSnapshot.confirmation) {
      return `确认号 ${bookingSnapshot.confirmation}`;
    }
    if (displayStatus === 'quoted' && cheapest) {
      const price = formatPrice(cheapest);
      const vehicle = cheapest.vehicleName || cheapest.vehicleType || '车型';
      const supplier = cheapest.supplierName ? ` · ${cheapest.supplierName}` : '';
      return price
        ? `${quotes.length} 个报价 · 起价 ${price}（${vehicle}${supplier}）`
        : `${quotes.length} 个报价可选`;
    }
    if (searchError) return searchError;
    return `${statusMeta.hint} · ${formatTripDateRange(trip)}`;
  }, [
    bookingSnapshot.confirmation,
    cheapest,
    displayStatus,
    quotes.length,
    searchError,
    statusMeta.hint,
    trip,
  ]);

  return (
    <div
      className={cn(
        'rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50/90 to-white px-4 py-3 flex flex-wrap items-center justify-between gap-3',
        className,
      )}
      data-tour="schedule-car-rental-status"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Car className="h-5 w-5 text-sky-700 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-950">自驾租车</p>
          <p className="text-xs text-sky-800/80 mt-0.5 truncate">{subtitle}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-xs shrink-0',
            displayStatus === 'confirmed' && 'border-emerald-300 text-emerald-800',
            displayStatus === 'quoted' && 'border-sky-300 text-sky-900',
            displayStatus === 'need_booking' && 'border-amber-300 text-amber-900',
            displayStatus === 'unavailable' && 'border-slate-300 text-slate-700',
          )}
        >
          {statusMeta.label}
        </Badge>
        {searching ? <Spinner className="h-4 w-4 text-sky-600" /> : null}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {hasSearched && quotes.length > 0 && displayStatus !== 'confirmed' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-sky-800"
            disabled={searching}
            onClick={() => void runSearch()}
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1', searching && 'animate-spin')} />
            刷新
          </Button>
        ) : null}
        {primaryCta ? (
          <Button
            type="button"
            size="sm"
            className="bg-sky-700 hover:bg-sky-800 h-8"
            disabled={searching && primaryCta.label === '查报价'}
            onClick={primaryCta.action}
          >
            {primaryCta.label}
            {primaryCta.label === '查看预订' || primaryCta.label === '去预订' ? (
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
