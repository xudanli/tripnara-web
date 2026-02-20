/**
 * Planning Assistant V2 - 航班列表
 * 支持简单格式（origin/destination）和 Amadeus 格式（itineraries/segments）
 * 支持 bookingUrl、actions（view_flight_detail / add_flight_to_itinerary / book_flight）
 */

import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plane, ChevronLeft, ChevronRight, Clock, ArrowRight, Info, CalendarPlus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';
import { AddFlightToTripDialog } from './AddFlightToTripDialog';

/** 标准化后的航班展示项 */
interface FlightDisplayItem {
  origin: string;
  destination: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  segments: Array<{
    origin: string;
    destination: string;
    departure?: string;
    arrival?: string;
    carrierCode?: string;
    number?: string;
    airline?: string;
  }>;
  priceAmount?: string | number;
  priceCurrency?: string;
  airline?: string;
  flightNumber?: string;
}

function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** 从原始数据提取标准化展示项，兼容简单格式和 Amadeus 格式 */
function normalizeFlight(raw: any): FlightDisplayItem {
  // Amadeus 格式：itineraries, segments, price
  if (raw.itineraries && Array.isArray(raw.itineraries) && raw.itineraries.length > 0) {
    const firstItin = raw.itineraries[0];
    const segs = firstItin.segments || [];
    const firstSeg = segs[0];
    const lastSeg = segs[segs.length - 1];
    const origin = firstSeg?.departure?.iataCode || raw.origin || '—';
    const destination = lastSeg?.arrival?.iataCode || raw.destination || '—';
    const departureTime = firstSeg?.departure?.at;
    const arrivalTime = lastSeg?.arrival?.at;
    let duration = raw.duration;
    if (!duration && departureTime && arrivalTime) {
      const ms = new Date(arrivalTime).getTime() - new Date(departureTime).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      duration = h > 0 ? `${h}小时${m}分` : `${m}分钟`;
    }
    // 解析 ISO 8601 时长（如 PT11H25M）
    if (typeof duration === 'string' && duration.startsWith('PT')) {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      const h = match ? parseInt(match[1] || '0', 10) : 0;
      const m = match ? parseInt(match[2] || '0', 10) : 0;
      duration = h > 0 ? `${h}小时${m}分` : `${m}分钟`;
    }
    const priceAmount = raw.price?.total ?? raw.price?.amount;
    const priceCurrency = raw.price?.currency;
    const segments = segs.map((s: any) => ({
      origin: s.departure?.iataCode || '—',
      destination: s.arrival?.iataCode || '—',
      departure: s.departure?.at,
      arrival: s.arrival?.at,
      carrierCode: s.carrierCode,
      number: s.number,
      airline: s.carrierCode ? `${s.carrierCode} ${s.number || ''}`.trim() : undefined,
    }));
    const firstCarrier = firstSeg?.carrierCode;
    const firstNum = firstSeg?.number;
    return {
      origin,
      destination,
      departureTime,
      arrivalTime,
      duration: typeof duration === 'string' ? duration : typeof duration === 'number' ? `${Math.floor(duration / 60)}小时${duration % 60}分` : undefined,
      segments,
      priceAmount,
      priceCurrency,
      airline: firstCarrier ? `${firstCarrier}${firstNum || ''}`.trim() : undefined,
      flightNumber: firstNum ? `${firstCarrier || ''} ${firstNum}`.trim() : undefined,
    };
  }

  // 简单格式：origin, destination, duration, price
  return {
    origin: raw.origin || raw.originLocationCode || '—',
    destination: raw.destination || raw.destinationLocationCode || '—',
    departureTime: raw.departureDate || raw.departureTime || raw.departure?.at,
    arrivalTime: raw.arrivalDate || raw.arrivalTime || raw.arrival?.at,
    duration: raw.duration,
    segments: raw.segments || [],
    priceAmount: raw.price?.amount ?? raw.price?.total,
    priceCurrency: raw.price?.currency,
    airline: raw.airline || raw.carrierCode,
    flightNumber: raw.flightNumber || (raw.carrierCode && raw.number ? `${raw.carrierCode} ${raw.number}` : undefined),
  };
}

const CARD_MIN_WIDTH = 280;

interface FlightListProps {
  flights: any[];
  tripId?: string;
  tripInfo?: TripDetail;
  onAddToTripSuccess?: () => void;
  className?: string;
}

export function FlightList({
  flights,
  tripId,
  tripInfo,
  onAddToTripSuccess,
  className,
}: FlightListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [detailExpandedIndex, setDetailExpandedIndex] = useState<number | null>(null);
  const [addDialogFlight, setAddDialogFlight] = useState<any | null>(null);

  const canAddToTrip = Boolean(tripId && tripInfo?.TripDay?.length);

  if (!flights || flights.length === 0) return null;

  const total = flights.length;
  const hasMultiple = total > 1;

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = CARD_MIN_WIDTH + 12;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <div className={cn('mt-4', className)}>
      {/* 左右滑动容器 */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto overflow-y-visible pb-2 scroll-smooth snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
        {flights.map((rawFlight, index) => {
          const item = normalizeFlight(rawFlight);
          const transferCount = Math.max(0, item.segments.length - 1);
          const hasDetail = item.segments.length > 0;
          const showDetail = detailExpandedIndex === index;
          const actions = rawFlight.actions;
          const bookingUrl =
            rawFlight.bookingUrl ??
            actions?.find((a: any) => a.action === 'book_flight')?.params?.bookingUrl;

          const handleViewDetail = (e: React.MouseEvent) => {
            e.stopPropagation();
            setDetailExpandedIndex(showDetail ? null : index);
          };
          const handleBook = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (bookingUrl) window.open(bookingUrl, '_blank', 'noopener,noreferrer');
          };
          const handleAddToTrip = (e: React.MouseEvent) => {
            e.stopPropagation();
            setAddDialogFlight(rawFlight);
          };

          return (
            <Card
              key={index}
              className={cn(
                'border-l-4 border-l-primary/50 flex-shrink-0 snap-center',
                'hover:shadow-md hover:border-l-primary hover:bg-muted/20 transition-all duration-200',
                'min-w-[280px] max-w-[320px]'
              )}
            >
              <CardContent className="p-0">
                <div className="flex">
                  <div className="flex flex-col items-center justify-start pt-4 px-4 pb-4 bg-primary/5 border-r border-border/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Plane className="w-4.5 h-4.5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 p-4 pl-3">
                    {/* 起终点 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="font-semibold text-sm">{item.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold text-sm">{item.destination}</span>
                      </div>
                      {transferCount > 0 ? (
                        <Badge variant="outline" className="text-xs shrink-0 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                          {transferCount}次中转
                        </Badge>
                      ) : hasDetail ? (
                        <Badge variant="secondary" className="text-xs shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          直飞
                        </Badge>
                      ) : null}
                    </div>
                    {/* 时间、航司、时长 */}
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      {(item.departureTime || item.arrivalTime) && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(item.departureTime)} — {formatTime(item.arrivalTime)}
                          {formatDate(item.departureTime) && (
                            <span className="ml-1">({formatDate(item.departureTime)})</span>
                          )}
                        </span>
                      )}
                      {item.duration && (
                        <span className="text-xs text-muted-foreground">{item.duration}</span>
                      )}
                      {(item.airline || item.flightNumber) && (
                        <span className="text-xs font-medium text-foreground/80">
                          {item.airline || item.flightNumber}
                        </span>
                      )}
                    </div>
                    {/* 价格 + 操作按钮 */}
                    <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2.5">
                      {(item.priceAmount != null && item.priceAmount !== '') && (
                        <span className="text-base font-bold text-primary block">
                          {item.priceAmount} {item.priceCurrency || 'EUR'}
                        </span>
                      )}
                      <div className="flex items-center gap-2 w-full flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1 min-w-[80px]"
                          onClick={handleViewDetail}
                        >
                          <Info className="w-3.5 h-3.5 mr-1" />
                          {showDetail ? '收起' : '查看详情'}
                        </Button>
                        {bookingUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1 min-w-[80px]"
                            onClick={handleBook}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            预订
                          </Button>
                        )}
                        {canAddToTrip && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1 min-w-[80px]"
                            onClick={handleAddToTrip}
                          >
                            <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                            加入行程
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* 展开的航段详情 */}
                    {showDetail && hasDetail && (
                      <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                        {item.segments.map((seg, segIdx) => (
                          <div key={segIdx} className="text-xs pl-2 border-l-2 border-primary/30 text-muted-foreground">
                            <div className="font-medium text-foreground/90">
                              {seg.origin} → {seg.destination}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                              {seg.airline && <span>{seg.airline}</span>}
                              {seg.departure && <span>{formatTime(seg.departure)}</span>}
                              {seg.arrival && <span>— {formatTime(seg.arrival)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
        {/* 左右切换按钮（多卡片时显示） */}
        {hasMultiple && (
          <div className="flex items-center justify-between mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => scroll('left')}
              className="flex items-center gap-1 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              上一个
            </Button>
            <span className="text-xs text-muted-foreground shrink-0">
              左右滑动 · {total} 个航班
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scroll('right')}
              className="flex items-center gap-1 shrink-0"
            >
              下一个
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {addDialogFlight && tripId && tripInfo && (
        <AddFlightToTripDialog
          open={!!addDialogFlight}
          onOpenChange={(open) => !open && setAddDialogFlight(null)}
          flight={addDialogFlight}
          tripId={tripId}
          tripInfo={tripInfo}
          onSuccess={onAddToTripSuccess}
        />
      )}
    </div>
  );
}
