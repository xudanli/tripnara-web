import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import CoverageMapExplorer from '@/components/plan-studio/CoverageMapExplorer';
import ScheduleCarRentalStatusBar from '@/components/plan-studio/ScheduleCarRentalStatusBar';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import { tripsApi, itineraryItemsApi } from '@/api/trips';
import type { ItineraryItemDetail, TripDetail } from '@/types/trip';
import { toast } from 'sonner';

interface CoverageMapTabProps {
  tripId: string;
  refreshKey?: number;
}

export default function CoverageMapTab({ tripId, refreshKey }: CoverageMapTabProps) {
  const planStudioContext = useContext(PlanStudioContext);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItemDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);

      const items: ItineraryItemDetail[] = [];
      if (data.TripDay?.length) {
        const results = await Promise.allSettled(
          data.TripDay.map((day) => itineraryItemsApi.getAll(day.id, true)),
        );
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            items.push(...result.value);
          }
        }
      }
      setItineraryItems(items);
    } catch (err) {
      console.error('[CoverageMapTab] Failed to load trip:', err);
      setTrip(null);
      setItineraryItems([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const handleJumpToScheduleDay = useCallback((dayIndex: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('plan-studio:select-schedule-day', {
          detail: { dayIndex },
        }),
      );
    }
    toast.info(`已跳转到时间轴第 ${dayIndex + 1} 天`);
  }, []);

  const onAskAssistant = useMemo(() => {
    if (!planStudioContext) return undefined;
    return (question: string) => planStudioContext.askAssistantAbout(question);
  }, [planStudioContext]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!trip) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>无法加载行程数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-tour="coverage-map-tab">
      <CoverageMapExplorer
        tripId={tripId}
        trip={trip}
        itineraryItems={itineraryItems}
        onItineraryChanged={loadData}
        onJumpToScheduleDay={handleJumpToScheduleDay}
        mapHeight={480}
      />

      <ScheduleCarRentalStatusBar
        trip={trip}
        tripId={tripId}
        itineraryItems={itineraryItems}
        onAskAssistant={onAskAssistant}
      />
    </div>
  );
}
