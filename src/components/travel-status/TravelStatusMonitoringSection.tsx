import { AlertTriangle, Cloud, MapPin, PauseCircle, Plane, RefreshCw, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { MonitoringItem, MonitoringKind } from '@/api/travel-status.types';
import {
  travelStatusEmptyState,
  travelStatusListItem,
  travelStatusMonitoringListItemTone,
  travelStatusMonitoringStatusBadgeClass,
  travelStatusMonitoringStatusLabel,
} from './travel-status-ui';

const KIND_ICON: Record<MonitoringKind, typeof Cloud> = {
  WEATHER_HAZARD: Cloud,
  ROAD_CLOSURE: MapPin,
  FLIGHT_STATUS: Plane,
  POI_CLOSURE: MapPin,
  BOOKING_STATUS: Ticket,
};

interface TravelStatusMonitoringSectionProps {
  items: MonitoringItem[];
  activeCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** 概览紧凑密度 */
  compact?: boolean;
  /** 多监控项时用网格排布 */
  itemLayout?: 'list' | 'grid';
  className?: string;
}

export default function TravelStatusMonitoringSection({
  items,
  activeCount,
  onRefresh,
  isRefreshing,
  compact = false,
  itemLayout = 'list',
  className,
}: TravelStatusMonitoringSectionProps) {
  const useGrid = itemLayout === 'grid' && items.length > 0;

  return (
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
          {activeCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-gate-reject-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              {activeCount} 项需关注
            </span>
          ) : (
            '监控运行中'
          )}
        </p>
        {onRefresh ? (
          <Button
            size="sm"
            variant="ghost"
            className={cn(compact ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-xs')}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Spinner className={cn(compact ? 'mr-1 h-3 w-3' : 'mr-1.5 h-3 w-3')} />
            ) : (
              <RefreshCw className={cn(compact ? 'mr-1 h-3 w-3' : 'mr-1.5 h-3 w-3')} />
            )}
            刷新
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={cn(travelStatusEmptyState, compact ? 'py-3' : 'py-5')}>
          <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
            暂无监控项 · 系统定时扫描天气与路况
          </p>
        </div>
      ) : (
        <ul className={cn(useGrid ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2')}>
          {items.map((item, index) => {
            const Icon = item.status === 'PAUSED' ? PauseCircle : (KIND_ICON[item.kind] ?? Cloud);
            const toneClass = travelStatusMonitoringListItemTone(item.status);

            return (
              <li
                key={`${item.kind}-${item.label}-${index}`}
                className={cn(travelStatusListItem, compact && 'px-2.5 py-2', toneClass)}
              >
                <div className={cn('flex items-start', compact ? 'gap-2' : 'gap-2.5')}>
                  <div
                    className={cn(
                      'mt-0.5 flex shrink-0 items-center justify-center rounded-lg border border-border/45 bg-muted/15',
                      compact ? 'h-6 w-6' : 'h-7 w-7',
                    )}
                  >
                    <Icon
                      className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'font-medium leading-snug text-foreground',
                          compact ? 'text-[11px]' : 'text-xs',
                        )}
                      >
                        {item.label}
                      </span>
                      <span className={travelStatusMonitoringStatusBadgeClass(item.status)}>
                        {travelStatusMonitoringStatusLabel(item.status)}
                      </span>
                    </div>
                    {item.summary ? (
                      <p
                        className={cn(
                          'mt-0.5 leading-relaxed text-muted-foreground line-clamp-2',
                          compact ? 'text-[10px]' : 'text-[11px]',
                        )}
                      >
                        {item.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
