import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Map } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CoverageMiniMap from '@/components/readiness/CoverageMiniMap';
import CoveragePoiInspector from '@/components/plan-studio/CoveragePoiInspector';
import { EditItineraryItemDialog } from '@/components/trips/EditItineraryItemDialog';
import { ReplaceItineraryItemDialog } from '@/components/trips/ReplaceItineraryItemDialog';
import {
  readinessApi,
  type CoverageGap,
  type CoverageMapPoi,
  type CoverageMapResponse,
  type CoverageMapSegment,
} from '@/api/readiness';
import type { ItineraryItem, ItineraryItemDetail, TripDetail } from '@/types/trip';
import { resolveItineraryItemForCoveragePoi } from '@/lib/coverage-poi-matching.util';
import {
  guardStructuralEditOrToast,
} from '@/lib/world-model-guards';
import { useWorldModelGuards } from '@/hooks/useWorldModelGuards';
import { getTimezoneByCountry } from '@/utils/timezone';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type InspectorSelection =
  | { kind: 'poi'; poi: CoverageMapPoi; item: ItineraryItemDetail | null }
  | { kind: 'segment'; segment: CoverageMapSegment }
  | { kind: 'gap'; gap: CoverageGap };

interface CoverageMapExplorerProps {
  tripId: string;
  trip: TripDetail;
  itineraryItems: ItineraryItemDetail[];
  onItineraryChanged?: () => void;
  onJumpToScheduleDay?: (dayIndex: number) => void;
  mapHeight?: number;
  className?: string;
}

export default function CoverageMapExplorer({
  tripId,
  trip,
  itineraryItems,
  onItineraryChanged,
  onJumpToScheduleDay,
  mapHeight = 480,
  className,
}: CoverageMapExplorerProps) {
  const [data, setData] = useState<CoverageMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<InspectorSelection | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [replacingItem, setReplacingItem] = useState<{ id: string; placeName?: string } | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const { worldModelGuards, canEditTiming, canEditStructure } = useWorldModelGuards();

  const handleOpenEditItem = useCallback(
    (item: ItineraryItemDetail) => {
      if (!canEditTiming) {
        toast.error(worldModelGuards?.banner_message_zh ?? '当前阶段不可编辑行程时间');
        return;
      }
      setEditingItem(item);
      setEditDialogOpen(true);
    },
    [worldModelGuards, canEditTiming],
  );

  const handleOpenReplaceItem = useCallback(
    (item: ItineraryItemDetail, placeName?: string) => {
      if (!canEditStructure) {
        guardStructuralEditOrToast(worldModelGuards);
        return;
      }
      setReplacingItem({ id: item.id, placeName });
      setReplaceDialogOpen(true);
    },
    [worldModelGuards, canEditStructure],
  );

  const loadCoverageMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await readinessApi.getCoverageMapData(tripId);
      setData(response);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message =
        status === 404
          ? '覆盖地图接口尚未就绪'
          : err instanceof Error
            ? err.message
            : '加载覆盖地图失败';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadCoverageMap();
  }, [loadCoverageMap]);

  const selectedPoiId = selection?.kind === 'poi' ? selection.poi.id : undefined;

  const handlePoiClick = useCallback(
    (poi: CoverageMapPoi) => {
      const item = resolveItineraryItemForCoveragePoi(
        poi,
        trip.TripDay ?? [],
        itineraryItems,
      );
      setSelection({ kind: 'poi', poi, item });
    },
    [trip.TripDay, itineraryItems],
  );

  const handleSegmentClick = useCallback((segment: CoverageMapSegment) => {
    setSelection({ kind: 'segment', segment });
  }, []);

  const handleGapClick = useCallback((gap: CoverageGap) => {
    setSelection({ kind: 'gap', gap });
  }, []);

  const handleEditSuccess = useCallback(async () => {
    await onItineraryChanged?.();
    await loadCoverageMap();
  }, [onItineraryChanged, loadCoverageMap]);

  useEffect(() => {
    setSelection((prev) => {
      if (prev?.kind !== 'poi') return prev;
      const item = resolveItineraryItemForCoveragePoi(
        prev.poi,
        trip.TripDay ?? [],
        itineraryItems,
      );
      if (
        prev.item?.id === item?.id &&
        prev.item?.startTime === item?.startTime &&
        prev.item?.note === item?.note &&
        prev.item?.bookingStatus === item?.bookingStatus
      ) {
        return prev;
      }
      return { kind: 'poi', poi: prev.poi, item };
    });
  }, [itineraryItems, trip.TripDay]);

  const coverageRate = data?.summary?.coverageRate;
  const timezone = useMemo(
    () => getTimezoneByCountry(trip.destination || ''),
    [trip.destination],
  );

  return (
    <div className={cn('space-y-4', className)}>
      <Card className="shadow-sm" data-tour="coverage-map-explorer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Map className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <CardTitle className="text-base">路线覆盖地图</CardTitle>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  点击 POI 查看详情并编辑 · 路段与缺口可在右侧查看
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {typeof coverageRate === 'number' ? (
                <Badge variant="secondary">
                  覆盖率 {Math.round(coverageRate * 100)}%
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                <Link to={`/dashboard/readiness?tripId=${tripId}&tab=coverage`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  准备度详情
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data?.summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
              <div className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-1.5">
                已覆盖 POI {data.summary.coveredPois}/{data.summary.totalPois}
              </div>
              <div className="rounded-md bg-amber-50 text-amber-800 px-2 py-1.5">
                路段预警 {data.summary.warningSegments}
              </div>
              <div className="rounded-md bg-orange-50 text-orange-800 px-2 py-1.5">
                总缺口 {data.summary.totalGaps}
              </div>
              <div className="rounded-md bg-slate-50 text-slate-700 px-2 py-1.5">
                自驾路段 {data.segments.filter((s) => s.routeType === 'driving').length}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <CoverageMiniMap
                data={data}
                loading={loading}
                error={error}
                height={mapHeight}
                selectedPoiId={selectedPoiId}
                onPoiClick={handlePoiClick}
                onSegmentClick={handleSegmentClick}
                onGapClick={handleGapClick}
              />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <CoveragePoiInspector
                selection={selection}
                onEditItem={handleOpenEditItem}
                onReplaceItem={(item) => {
                  const placeName =
                    item.Place?.nameCN?.trim() ||
                    item.Place?.nameEN?.trim() ||
                    (selection?.kind === 'poi' ? selection.poi.name : undefined);
                  handleOpenReplaceItem(item, placeName);
                }}
                onJumpToScheduleDay={onJumpToScheduleDay}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {editingItem ? (
        <EditItineraryItemDialog
          item={editingItem}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSuccess={() => void handleEditSuccess()}
          timezone={timezone}
          tripDays={trip.TripDay?.map((d) => ({ id: d.id, date: d.date })) ?? []}
          currentTripDayId={editingItem.tripDayId}
        />
      ) : null}

      {replacingItem ? (
        <ReplaceItineraryItemDialog
          tripId={tripId}
          itemId={replacingItem.id}
          placeName={replacingItem.placeName}
          open={replaceDialogOpen}
          onOpenChange={(open) => {
            setReplaceDialogOpen(open);
            if (!open) setReplacingItem(null);
          }}
          onSuccess={() => void handleEditSuccess()}
        />
      ) : null}
    </div>
  );
}
