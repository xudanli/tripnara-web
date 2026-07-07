import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useTripStatusBarModel } from '@/hooks/useTripStatusBarModel';
import { useTripTravelContext } from '@/features/trip-context';
import { TripStatusBar, type TripStatusBarSection } from './TripStatusBar';
import type { TripDetail } from '@/types/trip';

interface TripStatusBarContainerProps {
  tripId: string;
  trip?: TripDetail | null;
  onNavigateSection?: (section: TripStatusBarSection) => void;
  className?: string;
}

/** 绑定 travel-status BFF；接口不可用时静默隐藏 */
export function TripStatusBarContainer({
  tripId,
  trip,
  onNavigateSection,
  className,
}: TripStatusBarContainerProps) {
  const { model, isUnavailable, isFetching, refresh } = useTripStatusBarModel(tripId);
  const { enabled: contextEnabled, ready: contextReady, revision } = useTripTravelContext();
  const prevRevisionRef = useRef(revision);

  /** Context revision 变更（如探索物化）后自动刷新 travel-status */
  useEffect(() => {
    if (!contextEnabled || !contextReady || !model) return;
    if (prevRevisionRef.current > 0 && revision !== prevRevisionRef.current) {
      void refresh();
    }
    prevRevisionRef.current = revision;
  }, [revision, contextEnabled, contextReady, model, refresh]);

  if (!model || isUnavailable) {
    return null;
  }

  const dateRangeLabel =
    trip?.startDate && trip?.endDate
      ? `${format(new Date(trip.startDate), 'M月d日')}—${format(new Date(trip.endDate), 'M月d日')}`
      : undefined;

  return (
    <TripStatusBar
      model={model}
      tripLabel={trip?.destination ?? trip?.name}
      dateRangeLabel={dateRangeLabel}
      isRefreshing={isFetching}
      onRefresh={() => void refresh()}
      onNavigateSection={onNavigateSection}
      className={className}
    />
  );
}
