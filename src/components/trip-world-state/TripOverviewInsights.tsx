import { useMemo } from 'react';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { useTripTravelContext } from '@/features/trip-context';
import {
  buildTripConditionCards,
  buildTripMonitoringWatchlist,
  buildWorldChangeFeed,
} from '@/lib/trip-overview-view.util';
import { TripConditionCards } from './TripConditionCards';
import { WorldChangeFeed } from './WorldChangeFeed';
import { TripMonitoringWatchlist } from './TripMonitoringWatchlist';

interface TripOverviewInsightsProps {
  tripId: string;
  className?: string;
}

/** 总览洞察区：条件卡 + 最近变化 + 监控清单 */
export function TripOverviewInsights({ tripId, className }: TripOverviewInsightsProps) {
  const { status, isLoading, isUnavailable } = useTripStatusBarModel(tripId);
  const { overviewView } = useTripTravelContext();

  const { conditionCards, changes, watchlist } = useMemo(() => {
    if (!status) {
      return { conditionCards: [], changes: [], watchlist: [] };
    }
    return {
      conditionCards: buildTripConditionCards(status, overviewView),
      changes: buildWorldChangeFeed(status),
      watchlist: buildTripMonitoringWatchlist(status),
    };
  }, [status, overviewView]);

  if (isLoading || isUnavailable || !status) {
    return null;
  }

  const hasContent = conditionCards.length > 0 || changes.length > 0 || watchlist.length > 0;
  if (!hasContent) return null;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
        <div className="space-y-2.5">
          <TripConditionCards items={conditionCards} className="shadow-none" />
          <WorldChangeFeed items={changes} className="shadow-none" />
        </div>
        <TripMonitoringWatchlist items={watchlist} className="shadow-none" />
      </div>
    </div>
  );
}
