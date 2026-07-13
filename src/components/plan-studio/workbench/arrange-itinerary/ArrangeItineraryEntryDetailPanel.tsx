import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { itineraryItemsApi } from '@/api/trips';
import ItineraryItemRow from '@/components/plan-studio/ItineraryItemRow';
import { resolveDestinationTimezone } from '@/utils/timezone';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import {
  findItineraryItemContext,
  resolveWorkbenchDefaultWeatherLocation,
} from '@/lib/workbench-itinerary-item-lookup.util';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import { workbenchLinkClass, workbenchPanelTitle, workbenchScrollable } from '../workbench-ui';

export interface ArrangeItineraryEntryDetailPanelProps {
  trip: TripDetail | null;
  itemId: string;
  itineraryByDay: Map<string, ItineraryItemDetail[]>;
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  onAskNara?: (item: ItineraryItemDetail, question: string) => void;
  onOpenFullSchedule?: (dayIndex: number) => void;
  onClose?: () => void;
  className?: string;
}

export function ArrangeItineraryEntryDetailPanel({
  trip,
  itemId,
  itineraryByDay,
  onEdit,
  onDelete,
  onAskNara,
  onOpenFullSchedule,
  onClose,
  className,
}: ArrangeItineraryEntryDetailPanelProps) {
  const cachedContext = useMemo(
    () =>
      findItineraryItemContext({
        trip,
        itineraryByDay,
        itemId,
      }),
    [trip, itineraryByDay, itemId],
  );

  const [item, setItem] = useState<ItineraryItemDetail | null>(cachedContext?.item ?? null);
  const [loading, setLoading] = useState(!cachedContext?.item);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedContext?.item) {
      setItem(cachedContext.item);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void itineraryItemsApi
      .getById(itemId)
      .then((detail) => {
        if (!cancelled) {
          setItem(detail);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载行程项失败');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cachedContext?.item, itemId]);

  const dayIndex = cachedContext?.dayIndex ?? 0;
  const scheduleTimezone = resolveDestinationTimezone(trip?.destination);
  const defaultWeatherLocation = resolveWorkbenchDefaultWeatherLocation(trip);
  const placeName = item ? resolveItineraryItemPlaceDisplayName(item) : '行程项';

  if (loading) {
    return (
      <div className={cn('flex h-full items-center justify-center', className)}>
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center gap-2 p-6 text-center', className)}>
        <p className="text-xs text-muted-foreground">{error ?? '未找到行程项'}</p>
        {onClose ? (
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            关闭
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="shrink-0 border-b border-border/50 px-3 py-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className={workbenchPanelTitle}>条目详情</h2>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
              Day {dayIndex + 1} · {placeName}
            </p>
          </div>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label="关闭条目详情"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', workbenchScrollable)}>
        <ItineraryItemRow
          item={item}
          dayIndex={dayIndex}
          itemIndex={0}
          personaMode="auto"
          timezone={scheduleTimezone}
          defaultWeatherLocation={defaultWeatherLocation}
          highlighted
          onEdit={onEdit ? () => onEdit(item.id) : undefined}
          onDelete={onDelete ? () => onDelete(item.id) : undefined}
          onAskNara={onAskNara}
          onReplace={() => {
            onOpenFullSchedule?.(dayIndex);
            toast.message('已在完整时间轴中打开，可进行替换 POI');
          }}
          onSearchNearby={() => {
            onOpenFullSchedule?.(dayIndex);
            toast.message('已在完整时间轴中打开，可搜索附近地点');
          }}
        />
      </div>

      {onOpenFullSchedule ? (
        <div className="shrink-0 border-t border-border/50 px-3 py-2">
          <button
            type="button"
            className={cn(workbenchLinkClass, 'inline-flex items-center gap-1 text-[10px]')}
            onClick={() => onOpenFullSchedule(dayIndex)}
          >
            <ExternalLink className="h-3 w-3" />
            在完整时间轴中精修 →
          </button>
        </div>
      ) : null}
    </div>
  );
}
