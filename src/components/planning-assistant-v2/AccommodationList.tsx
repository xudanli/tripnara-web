/**
 * Planning Assistant V2 - 住宿混合列表（酒店 + Airbnb）
 * 渐进式披露：默认展示前 4 条，可展开全部
 * 「加入行程」→ POST planning-assistant/v2/trips/:tripId/accommodations/apply
 */

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MapPin,
  Star,
  Building2,
  Home,
  ExternalLink,
  ChevronDown,
  Navigation,
  CalendarPlus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Accommodation, ItineraryHintZh } from '@/api/planning-assistant-v2/types';
import type { AccommodationCardAction } from '@/api/planning-assistant-v2/accommodations';
import {
  applyAccommodationToTrip,
  buildApplyAccommodationCard,
  readApplySnapshotFromActionParams,
  refreshPlanStudioSchedule,
} from '@/lib/apply-accommodation-to-trip';
import { getPlanningAssistantV2SessionId, ensurePlanningAssistantV2Session } from '@/lib/planning-assistant-session-reset';

function mapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function formatZhDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim().slice(0, 10));
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

function formatStayWindow(checkIn?: string, checkOut?: string): string | undefined {
  const inIso = checkIn?.trim().slice(0, 10);
  const outIso = checkOut?.trim().slice(0, 10);
  if (!inIso && !outIso) return undefined;
  if (inIso && outIso) return `${formatZhDate(inIso)}–${formatZhDate(outIso)}`;
  if (inIso) return `入住 ${formatZhDate(inIso)}`;
  return outIso ? `退房 ${formatZhDate(outIso)}` : undefined;
}

function listingCoords(item: Accommodation): { lat: number; lng: number } | undefined {
  if (item.listingLat != null && item.listingLng != null) {
    return { lat: item.listingLat, lng: item.listingLng };
  }
  if (item.location) return item.location;
  return undefined;
}

function formatAccommodationDistanceLine(
  item: Accommodation,
  options?: { suppressRawKm?: boolean }
): string | null {
  const label = item.distanceLabelZh?.trim();
  if (label) {
    if (options?.suppressRawKm && /\d+(\.\d+)?\s*km/i.test(label)) {
      return item.decisionSupportZh?.trim() || null;
    }
    return label;
  }
  if (options?.suppressRawKm) {
    return item.decisionSupportZh?.trim() || null;
  }
  if (item.distanceToAnchorKm != null) {
    if (item.anchorPoiNameZh?.trim()) {
      return `距「${item.anchorPoiNameZh.trim()}」约 ${item.distanceToAnchorKm.toFixed(1)} km`;
    }
    return `距当日最后一站行程点约 ${item.distanceToAnchorKm.toFixed(1)} km`;
  }
  if (item.distanceKm != null && item.nearestPlaceName) {
    return `距${item.nearestPlaceName} ${item.distanceKm.toFixed(1)}km`;
  }
  if (item.distanceKm != null) {
    return `距当日行程点 ${item.distanceKm.toFixed(1)}km`;
  }
  if (item.nearestPlaceName) {
    return `近${item.nearestPlaceName}`;
  }
  return null;
}

function parseItineraryHintZh(raw: ItineraryHintZh | undefined): { title?: string; subtitle?: string } {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'string') {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      title: lines[0],
      subtitle: lines.length > 1 ? lines.slice(1).join('\n') : undefined,
    };
  }
  const title =
    [raw.title, raw.main, raw.primary].find((x) => typeof x === 'string' && x.trim())?.trim() || undefined;
  const subtitle =
    [raw.subtitle, raw.sub, raw.secondary].find((x) => typeof x === 'string' && x.trim())?.trim() || undefined;
  return { title, subtitle };
}

function englishTitleLine(item: Accommodation): string | undefined {
  const parts = [item.name, item.nameEN].filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  const uniq = [...new Set(parts.map((p) => p.trim()))];
  return uniq.length > 0 ? uniq.join(' · ') : undefined;
}

function resolveCardActions(
  item: Accommodation,
  canAddToTrip: boolean,
  accommodationIndex: number
): AccommodationCardAction[] {
  if (item.actions?.length) {
    return item.actions.map((a) => ({
      action: a.action,
      label: a.label,
      labelCN: a.labelCN,
      params: {
        ...a.params,
        accommodationId: a.params?.accommodationId ?? item.id,
        accommodationIndex: a.params?.accommodationIndex ?? accommodationIndex,
      },
    }));
  }
  const actions: AccommodationCardAction[] = [];
  if (item.url?.trim()) {
    actions.push({
      action: 'view_accommodation',
      label: 'View',
      labelCN: '查看',
      params: { url: item.url },
    });
  }
  if (canAddToTrip) {
    actions.push({
      action: 'add_accommodation_to_itinerary',
      label: 'Add to Trip',
      labelCN: '加入行程',
      params: {
        accommodationId: item.id,
        accommodationIndex,
        applySnapshot: buildApplyAccommodationCard(item, accommodationIndex),
      },
    });
  }
  return actions;
}

const INITIAL_VISIBLE = 4;
const LIST_MAX_HEIGHT = 320;

interface AccommodationListProps {
  accommodations: Accommodation[];
  /** 须与 v2/chat context.tripId 一致 */
  tripId?: string;
  /** 与 v2/chat sessionId、route_and_run options.client_session_id 一致 */
  sessionId?: string;
  userId?: string;
  /** 卡片无 checkIn 时回退为行程 startDate */
  defaultCheckIn?: string;
  /** 卡片无 checkOut 时回退为行程 endDate */
  defaultCheckOut?: string;
  /** @deprecated apply 接口不依赖 tripInfo；保留仅供旧页兼容 */
  tripInfo?: unknown;
  onAddToTripSuccess?: () => void;
  disclaimerZh?: string;
  /** accommodation_health 存在时隐藏 raw km，改用人话标签 */
  suppressRawDistanceKm?: boolean;
  layout?: 'scroll-contained' | 'flow';
  className?: string;
}

export function AccommodationList({
  accommodations,
  tripId,
  sessionId,
  userId,
  defaultCheckIn,
  defaultCheckOut,
  onAddToTripSuccess,
  disclaimerZh,
  suppressRawDistanceKm,
  layout = 'scroll-contained',
  className,
}: AccommodationListProps) {
  const [expanded, setExpanded] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState<{
    accommodation: Accommodation;
    accommodationIndex: number;
    applySnapshot?: ReturnType<typeof readApplySnapshotFromActionParams>;
    existingName?: string;
  } | null>(null);

  const canAddToTrip = Boolean(tripId?.trim());

  const handleApplySuccess = (messageCN?: string, displayName?: string) => {
    toast.success(messageCN?.trim() || `已将 ${displayName ?? '住宿'} 加入行程`);
    refreshPlanStudioSchedule();
    onAddToTripSuccess?.();
  };

  const runApply = async (
    accommodation: Accommodation,
    accommodationIndex: number,
    replaceExisting: boolean,
    options?: {
      action?: AccommodationCardAction;
      applySnapshot?: ReturnType<typeof readApplySnapshotFromActionParams>;
    }
  ) => {
    if (!tripId?.trim()) {
      toast.error('未关联行程，无法加入');
      return;
    }

    let resolvedSessionId = sessionId?.trim() || getPlanningAssistantV2SessionId() || undefined;
    if (!resolvedSessionId) {
      resolvedSessionId = (await ensurePlanningAssistantV2Session(userId)) ?? undefined;
    }
    if (!resolvedSessionId) {
      toast.error('缺少规划助手会话，请先发送检索消息后再加入行程');
      return;
    }

    const checkIn = accommodation.checkIn?.trim() || defaultCheckIn?.trim();
    const checkOut = accommodation.checkOut?.trim() || defaultCheckOut?.trim();
    if (!checkIn) {
      toast.error('缺少入住日期，请确认行程日期或重新检索住宿');
      return;
    }

    const applySnapshot =
      options?.applySnapshot ?? readApplySnapshotFromActionParams(options?.action?.params);

    setApplyingId(accommodation.id);
    try {
      const result = await applyAccommodationToTrip(tripId.trim(), accommodation, {
        replaceExisting,
        accommodationIndex,
        sessionId: resolvedSessionId,
        defaultCheckIn: checkIn,
        defaultCheckOut: checkOut,
        applySnapshot,
      });
      if (result.status === 'needs_replace') {
        setReplaceConfirm({
          accommodation,
          accommodationIndex,
          applySnapshot,
          existingName: result.existingName,
        });
        return;
      }
      const displayName = accommodation.nameCN || accommodation.nameEN || accommodation.name;
      handleApplySuccess(result.response.messageCN || result.response.message, displayName);
      setReplaceConfirm(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加入行程失败，请重试';
      toast.error(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const handleActionClick = async (
    action: AccommodationCardAction,
    item: Accommodation,
    accommodationIndex: number
  ) => {
    const type = action.action;
    if (type === 'view_accommodation' || type === 'book_accommodation') {
      const url =
        (typeof action.params?.url === 'string' ? action.params.url : undefined) || item.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (type === 'add_accommodation_to_itinerary') {
      const replaceExisting = action.params?.replaceExisting === true;
      const index =
        typeof action.params?.accommodationIndex === 'number'
          ? action.params.accommodationIndex
          : accommodationIndex;
      await runApply(item, index, replaceExisting, { action });
    }
  };

  if (!accommodations || accommodations.length === 0) {
    return null;
  }

  const total = accommodations.length;
  const visibleCount = expanded ? total : Math.min(INITIAL_VISIBLE, total);
  const hasMore = total > INITIAL_VISIBLE && !expanded;
  const visibleItems = accommodations.slice(0, visibleCount);

  const listDisclaimer = useMemo(() => {
    const prop = disclaimerZh?.trim();
    if (prop) return prop;
    for (const a of accommodations) {
      const d = a.hotelSearchMeta?.disclaimer_zh?.trim();
      if (d) return d;
    }
    return undefined;
  }, [accommodations, disclaimerZh]);

  const listScrollStyle =
    layout === 'scroll-contained' ? { maxHeight: LIST_MAX_HEIGHT } : undefined;

  return (
    <>
      <div className={cn('mt-4', className)}>
        <div
          className={cn(
            'space-y-3 pr-1',
            layout === 'scroll-contained' ? 'overflow-y-auto' : 'overflow-visible'
          )}
          style={listScrollStyle}
        >
          {visibleItems.map((item, visibleIdx) => {
            const accommodationIndex = accommodations.findIndex((a) => a.id === item.id);
            const index = accommodationIndex >= 0 ? accommodationIndex : visibleIdx;
            const displayName = item.nameCN || item.nameEN || item.name;
            const hint = parseItineraryHintZh(item.itineraryHintZh);
            const enLine = englishTitleLine(item);
            const stay = item.stayLabelZh?.trim() || formatStayWindow(item.checkIn, item.checkOut);
            const distanceLine = formatAccommodationDistanceLine(item, {
              suppressRawKm: suppressRawDistanceKm,
            });
            const mapCoords = listingCoords(item);
            const decisionSupportText = item.decisionSupportZh?.trim() ?? '';
            const cardActions = resolveCardActions(item, canAddToTrip, index);
            const isApplying = applyingId === item.id;

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex gap-3 p-4">
                    {item.photoUrl && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={item.photoUrl}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        {(hint.title || hint.subtitle) && (
                          <div className="mb-1.5 space-y-0.5">
                            {hint.title ? (
                              <p className="text-sm font-semibold text-foreground leading-snug">
                                {hint.title}
                              </p>
                            ) : null}
                            {hint.subtitle ? (
                              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {hint.subtitle}
                              </p>
                            ) : null}
                          </div>
                        )}
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className="font-medium min-w-0 break-words">{displayName}</span>
                          {stay ? (
                            <Badge
                              variant="secondary"
                              className="max-w-full shrink-0 text-[10px] font-normal"
                              title={stay}
                            >
                              {stay}
                            </Badge>
                          ) : null}
                          <Badge
                            variant={item.source === 'hotel' ? 'secondary' : 'outline'}
                            className="text-xs shrink-0"
                          >
                            {item.source === 'hotel' ? (
                              <Building2 className="w-3 h-3 mr-1" />
                            ) : (
                              <Home className="w-3 h-3 mr-1" />
                            )}
                            {item.source === 'hotel' ? '酒店' : 'Airbnb'}
                          </Badge>
                        </div>
                        {enLine ? (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug" lang="en">
                            {enLine}
                          </p>
                        ) : null}
                        {item.roomSpecs && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.roomSpecs}</p>
                        )}
                        {item.address && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {item.address}
                          </p>
                        )}
                        {distanceLine || mapCoords ? (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                            {distanceLine ? (
                              <span className="inline-flex items-center gap-1 min-w-0">
                                <Navigation className="w-3 h-3 flex-shrink-0" />
                                <span className="min-w-0">{distanceLine}</span>
                              </span>
                            ) : null}
                            {mapCoords ? (
                              <a
                                href={mapsSearchUrl(mapCoords.lat, mapCoords.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-primary hover:underline shrink-0"
                                title="按 MCP 解析坐标在地图中打开（供复核）"
                              >
                                <MapPin className="w-3 h-3" />
                                地图位置
                              </a>
                            ) : null}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {item.rating != null && (
                            <span className="text-xs flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              {item.rating.toFixed(1)}
                              {item.ratingCount != null && (
                                <span className="text-muted-foreground">({item.ratingCount})</span>
                              )}
                            </span>
                          )}
                          {item.price && (
                            <span className="text-sm font-medium text-primary">{item.price}</span>
                          )}
                          {!item.price && item.priceLevel != null && (
                            <span className="text-xs text-muted-foreground">
                              {'$'.repeat(item.priceLevel)}
                            </span>
                          )}
                        </div>
                        {decisionSupportText ? (
                          <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                            <span className="mr-1.5 align-middle rounded border border-border/70 bg-muted/40 px-1 py-px text-[10px] font-medium text-muted-foreground">
                              决策参考
                            </span>
                            <span className="align-middle">{decisionSupportText}</span>
                          </p>
                        ) : null}
                      </div>
                      {cardActions.length > 0 ? (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {cardActions.map((action) => {
                            const label = action.labelCN || action.label;
                            const isAdd = action.action === 'add_accommodation_to_itinerary';
                            const isView =
                              action.action === 'view_accommodation' ||
                              action.action === 'book_accommodation';
                            return (
                              <Button
                                key={`${item.id}-${action.action}-${label}`}
                                type="button"
                                variant={isAdd ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                disabled={isApplying}
                                onClick={() => void handleActionClick(action, item, index)}
                              >
                                {isApplying && isAdd ? (
                                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                ) : isAdd ? (
                                  <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                                ) : isView ? (
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                ) : null}
                                {label}
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
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
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            展开全部 {total} 个
          </Button>
        )}

        {listDisclaimer ? (
          <p className="mt-3 text-[10px] leading-snug text-muted-foreground border-t border-border/60 pt-2">
            {listDisclaimer}
          </p>
        ) : null}
      </div>

      <AlertDialog open={!!replaceConfirm} onOpenChange={(open) => !open && setReplaceConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>当天已有住宿</AlertDialogTitle>
            <AlertDialogDescription>
              {replaceConfirm?.existingName
                ? `当天已有住宿「${replaceConfirm.existingName}」，是否替换为「${
                    replaceConfirm.accommodation.nameCN ||
                    replaceConfirm.accommodation.nameEN ||
                    replaceConfirm.accommodation.name
                  }」？`
                : '当天已有住宿，是否替换为当前选择？'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!applyingId}>取消</AlertDialogCancel>
            <Button
              disabled={!!applyingId}
              onClick={() => {
                if (!replaceConfirm) return;
                void runApply(
                  replaceConfirm.accommodation,
                  replaceConfirm.accommodationIndex,
                  true,
                  { applySnapshot: replaceConfirm.applySnapshot }
                );
              }}
            >
              {applyingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  替换中...
                </>
              ) : (
                '替换'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
