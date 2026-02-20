/**
 * Planning Assistant V2 - 火车/铁路路线列表
 * 根据后端 rail 查询 API 返回结构展示：起终点、发车/到达时间、车次、换乘、价格
 * 视觉：左侧色条、清晰层级、价格高亮、直达/换乘标签区分
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Train, ChevronDown, Clock, ArrowRight, CalendarPlus, Info, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';
import { AddRailToTripDialog } from './AddRailToTripDialog';

/** 后端返回的铁路路线结构（Hafas/DB 等），对齐 5.3 railRoutes 规范 */
export interface RailRouteItem {
  origin: string;
  destination: string;
  departure?: string; // ISO 8601
  arrival?: string;
  duration?: number; // 时长（分钟）
  price?: { amount: number; currency: string; hint?: string | null };
  legs?: Array<{
    origin?: { name?: string; id?: string };
    destination?: { name?: string; id?: string };
    departure?: string;
    arrival?: string;
    departurePlatform?: string;
    arrivalPlatform?: string;
    line?: { name?: string; productName?: string; fahrtNr?: string };
    remarks?: Array<{ text: string; type: string; summary?: string }>;
    walking?: boolean;
  }>;
  /** Deutsche Bahn 查询/预订链接（后端 rail-direct 生成） */
  bookingUrl?: string;
  /** 巴黎↔伦敦时为引导卡片说明，legs 为空时展示 */
  note?: string;
  /** 卡片操作（后端提供时使用，否则前端默认展示） */
  actions?: Array<{
    action: 'view_rail_detail' | 'add_rail_to_itinerary' | 'book_rail';
    label: string;
    labelCN: string;
    params: { routeIndex: number; bookingUrl?: string };
  }>;
}

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 520;

function formatTime(iso?: string): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDuration(departure?: string, arrival?: string, durationMinutes?: number): string {
  // 规范：duration 为分钟
  if (durationMinutes != null && durationMinutes > 0) {
    const h = Math.floor(durationMinutes / 60);
    const m = Math.floor(durationMinutes % 60);
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  }
  if (departure && arrival) {
    const d1 = new Date(departure).getTime();
    const d2 = new Date(arrival).getTime();
    const diffMs = d2 - d1;
    if (diffMs <= 0) return '--';
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  }
  return '--';
}

function getTrainLegs(legs?: RailRouteItem['legs']): NonNullable<RailRouteItem['legs']> {
  if (!legs) return [];
  return legs.filter((l) => !l.walking);
}

interface RailRouteListProps {
  routes: RailRouteItem[];
  /** 行程 ID，有则显示「加入行程」按钮 */
  tripId?: string;
  /** 行程详情（含 TripDay），有则支持加入行程 */
  tripInfo?: TripDetail;
  /** 加入行程成功后的回调 */
  onAddToTripSuccess?: () => void;
  className?: string;
}

export function RailRouteList({
  routes,
  tripId,
  tripInfo,
  onAddToTripSuccess,
  className,
}: RailRouteListProps) {
  const [listExpanded, setListExpanded] = useState(false);
  const [detailExpandedIndex, setDetailExpandedIndex] = useState<number | null>(null);
  const [addDialogRoute, setAddDialogRoute] = useState<RailRouteItem | null>(null);

  const canAddToTrip = Boolean(tripId && tripInfo?.TripDay?.length);

  if (!routes || routes.length === 0) return null;

  const total = routes.length;
  const visibleCount = listExpanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !listExpanded;
  const visibleItems = routes.slice(0, visibleCount);

  return (
    <div className={cn('mt-4', className)}>
      <div
        className="space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: LIST_MAX_HEIGHT }}
      >
        {visibleItems.map((route, index) => {
          const trainLegs = getTrainLegs(route.legs);
          const depIso = route.departure || trainLegs[0]?.departure;
          const arrIso = route.arrival || trainLegs[trainLegs.length - 1]?.arrival;
          const hasValidSchedule = !!(depIso || arrIso);
          const isGuideCard = !hasValidSchedule; // 巴黎↔伦敦等引导卡片：无真实车次时间
          const transferCount = Math.max(0, trainLegs.length - 1);
          const firstLine = trainLegs[0]?.line?.name || trainLegs[0]?.line?.productName;
          const durationStr = formatDuration(depIso, arrIso, route.duration);
          const showDetail = detailExpandedIndex === index;
          const actions = route.actions;

          const handleViewDetail = (e: React.MouseEvent) => {
            e.stopPropagation();
            setDetailExpandedIndex(showDetail ? null : index);
          };
          const handleAddToTrip = (e: React.MouseEvent) => {
            e.stopPropagation();
            setAddDialogRoute(route);
          };
          const bookAction = actions?.find((a) => a.action === 'book_rail');
          const bookingUrl = route.bookingUrl ?? bookAction?.params?.bookingUrl;
          const handleBook = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (bookingUrl) window.open(bookingUrl, '_blank', 'noopener,noreferrer');
          };

          return (
            <Card
              key={index}
              className={cn(
                'flex-shrink-0 transition-all duration-200',
                isGuideCard
                  ? 'border-l-4 border-l-amber-500/70 hover:shadow-md hover:border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20'
                  : 'border-l-4 border-l-primary/50 hover:shadow-md hover:border-l-primary hover:bg-muted/20'
              )}
            >
              <CardContent className="p-0">
                <div className="flex">
                  {/* 左侧图标区：顶部对齐 */}
                  <div className="flex flex-col items-center justify-start pt-4 px-4 pb-4 bg-primary/5 border-r border-border/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Train className="w-4.5 h-4.5 text-primary" />
                    </div>
                  </div>
                  {/* 主内容区 */}
                  <div className="flex-1 min-w-0 p-4 pl-3">
                    {/* 起终点 + 标签（引导卡片不显示直达/换乘） */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <span className="font-semibold text-sm break-words">{route.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold text-sm break-words">{route.destination}</span>
                      </div>
                      {!isGuideCard && (transferCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200"
                        >
                          {transferCount}次换乘
                        </Badge>
                      ) : trainLegs.length > 0 ? (
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          直达
                        </Badge>
                      ) : null)}
                    </div>
                    {/* 时间线：有 departure/arrival 时显示；引导卡片（巴黎↔伦敦）不显示 */}
                    {hasValidSchedule && (
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(depIso)} — {formatTime(arrIso)}
                        </span>
                        {durationStr !== '--' && (
                          <span className="text-xs text-muted-foreground">{durationStr}</span>
                        )}
                        {firstLine && (
                          <span className="text-xs font-medium text-foreground/80">{firstLine}</span>
                        )}
                      </div>
                    )}
                    {/* 引导卡片说明：突出展示，避免被误认为真实车次 */}
                    {isGuideCard && route.note && (
                      <div className="mt-2.5 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                        {route.note}
                      </div>
                    )}
                    {/* 价格 + 操作按钮：引导卡片不显示价格（无实时票价） */}
                    <div className="mt-2.5 pt-2.5 border-t border-border/50 space-y-2.5">
                      {!isGuideCard && route.price && (
                        <span className="text-base font-bold text-primary block">
                          {route.price.amount} {route.price.currency}
                        </span>
                      )}
                      <div className="flex items-center gap-2 w-full flex-wrap">
                        {/* 查看详情：每张火车卡片均展示（规范 5.3） */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex-1 min-w-[80px]"
                          onClick={handleViewDetail}
                        >
                          <Info className="w-3.5 h-3.5 mr-1" />
                          {showDetail ? '收起' : '查看详情'}
                        </Button>
                        {/* 预订：有 bookingUrl 时展示，点击新窗口打开 */}
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
                        {/* 加入行程：需有行程上下文；引导卡片也可加入（仅保存路线+预订链接） */}
                        {canAddToTrip && (actions?.some((a) => a.action === 'add_rail_to_itinerary') ?? true) && (
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
                    {/* 展开的详情：legs、站台、remarks，无 legs 时展示路线概要 */}
                    {showDetail && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                        {trainLegs.length > 0 ? (
                          trainLegs.map((leg, legIdx) => (
                            <div key={legIdx} className="text-xs space-y-1 pl-2 border-l-2 border-primary/30">
                              <div className="font-medium">
                                {leg.origin?.name ?? leg.origin} → {leg.destination?.name ?? leg.destination}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                                {leg.line?.name && <span>{leg.line.name}</span>}
                                {leg.departurePlatform && <span>出发站台 {leg.departurePlatform}</span>}
                                {leg.arrivalPlatform && <span>到达站台 {leg.arrivalPlatform}</span>}
                                {leg.departure && <span>{formatTime(leg.departure)}</span>}
                                {leg.arrival && <span>— {formatTime(leg.arrival)}</span>}
                              </div>
                              {leg.remarks && leg.remarks.length > 0 && (
                                <div className="text-muted-foreground mt-1">
                                  {leg.remarks.map((r, ri) => (
                                    <div key={ri}>{r.summary ?? r.text}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs space-y-1 pl-2 border-l-2 border-primary/30 text-muted-foreground">
                            <div>{route.origin} → {route.destination}</div>
                            {hasValidSchedule && (
                              <div>
                                {formatTime(depIso)} — {formatTime(arrIso)}
                                {route.price && ` · ${route.price.amount} ${route.price.currency}`}
                              </div>
                            )}
                            {route.note && (
                              <div className={cn('mt-2', isGuideCard && 'text-amber-700 dark:text-amber-300 font-medium')}>
                                {route.note}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
          onClick={() => setListExpanded(true)}
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          展开全部 {total} 条
        </Button>
      )}

      {addDialogRoute && tripId && tripInfo && (
        <AddRailToTripDialog
          open={!!addDialogRoute}
          onOpenChange={(open) => !open && setAddDialogRoute(null)}
          route={addDialogRoute}
          tripId={tripId}
          tripInfo={tripInfo}
          onSuccess={onAddToTripSuccess}
        />
      )}
    </div>
  );
}
