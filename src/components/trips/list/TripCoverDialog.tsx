import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ImageIcon, Shuffle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { tripsApi } from '@/api/trips';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { extractPlacesFromTrip, usePlaceImages } from '@/hooks/usePlaceImages';
import {
  buildTripCoverCandidates,
  buildTripCoverMetadataPatch,
  readTripCoverConfig,
  resolveAutoCoverPreviewUrl,
  type TripCoverImageSource,
} from '@/lib/trip-cover.util';
import { resolveItineraryItemPlaceDisplayName } from '@/lib/itinerary-place-display.util';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';

type CoverSelection =
  | { mode: 'auto' }
  | { mode: 'poi'; placeId: number; imageUrl: string };

interface TripCoverDialogProps {
  tripId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (payload: {
    tripId: string;
    coverImageSource: TripCoverImageSource;
    coverImageUrl?: string | null;
    coverPlaceId?: number | null;
    previewUrl?: string;
  }) => void;
}

function resolveInitialSelection(
  trip: TripDetail | null,
  candidates: ReturnType<typeof buildTripCoverCandidates>,
): CoverSelection {
  if (!trip) return { mode: 'auto' };

  const config = readTripCoverConfig(trip);
  if (config.coverImageSource === 'poi' && config.coverPlaceId != null) {
    const matched = candidates.find((item) => item.placeId === config.coverPlaceId);
    if (matched) {
      return { mode: 'poi', placeId: matched.placeId, imageUrl: matched.imageUrl };
    }
    if (config.coverImageUrl) {
      return { mode: 'poi', placeId: config.coverPlaceId, imageUrl: config.coverImageUrl };
    }
  }

  if (config.coverImageSource === 'user' && config.coverImageUrl) {
    const matched = candidates.find((item) => item.imageUrl === config.coverImageUrl);
    if (matched) {
      return { mode: 'poi', placeId: matched.placeId, imageUrl: matched.imageUrl };
    }
  }

  return { mode: 'auto' };
}

export function TripCoverDialog({
  tripId,
  open,
  onOpenChange,
  onSaved,
}: TripCoverDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [selection, setSelection] = useState<CoverSelection>({ mode: 'auto' });

  const places = useMemo(() => {
    if (!trip?.TripDay?.length) return [];
    return extractPlacesFromTrip(trip.TripDay);
  }, [trip]);

  const { images: placeImagesMap, loading: imagesLoading } = usePlaceImages(places, {
    enabled: open && Boolean(trip),
  });

  const candidates = useMemo(() => {
    if (!trip) return [];
    return buildTripCoverCandidates({
      trip,
      placeImagesMap,
      resolvePlaceName: resolveItineraryItemPlaceDisplayName,
    });
  }, [trip, placeImagesMap]);

  const autoPreviewUrl = useMemo(() => {
    if (!tripId) return undefined;
    return resolveAutoCoverPreviewUrl(tripId, candidates);
  }, [tripId, candidates]);

  const loadTrip = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const detail = await tripsApi.getById(tripId);
      setTrip(detail);
    } catch (err: any) {
      toast.error('加载行程失败', { description: err?.message || '请稍后重试' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [tripId, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setTrip(null);
      setSelection({ mode: 'auto' });
      return;
    }
    if (tripId) {
      void loadTrip();
    }
  }, [open, tripId, loadTrip]);

  useEffect(() => {
    if (!trip || imagesLoading) return;
    setSelection(resolveInitialSelection(trip, candidates));
  }, [trip, candidates, imagesLoading]);

  const handleSave = async () => {
    if (!tripId || !trip) return;

    let coverImageSource: TripCoverImageSource = 'auto';
    let coverPlaceId: number | null = null;
    let coverImageUrl: string | null = null;
    let previewUrl: string | undefined;

    if (selection.mode === 'poi') {
      coverImageSource = 'poi';
      coverPlaceId = selection.placeId;
      coverImageUrl = selection.imageUrl;
      previewUrl = selection.imageUrl;
    } else {
      coverImageSource = 'auto';
      previewUrl = autoPreviewUrl;
    }

    setSaving(true);
    try {
      await tripsApi.update(tripId, {
        metadata: buildTripCoverMetadataPatch(trip.metadata as Record<string, unknown> | undefined, {
          coverImageSource,
          coverPlaceId,
          coverImageUrl,
        }),
      });

      toast.success(
        selection.mode === 'auto' ? '已设为自动封面' : '封面已更新',
        {
          description:
            selection.mode === 'auto'
              ? '列表将默认从行程 POI 中随机选取封面'
              : undefined,
        },
      );
      onSaved?.({
        tripId,
        coverImageSource,
        coverImageUrl,
        coverPlaceId,
        previewUrl,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error('保存封面失败', { description: err?.message || '请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  const isSelectedAuto = selection.mode === 'auto';
  const showContentLoading = loading || (Boolean(trip) && imagesLoading && candidates.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>设置行程封面</DialogTitle>
          <DialogDescription>
            选择一张 POI 图片作为封面，或使用自动模式从行程地点中随机选取。
          </DialogDescription>
        </DialogHeader>

        {showContentLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-28 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/3] rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <button
              type="button"
              className={cn(
                'relative w-full overflow-hidden rounded-lg border text-left transition-colors',
                isSelectedAuto ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
              )}
              onClick={() => setSelection({ mode: 'auto' })}
            >
              <div className="relative aspect-[21/9] bg-muted">
                {autoPreviewUrl ? (
                  <img src={autoPreviewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Shuffle className="h-6 w-6 opacity-60" />
                    <span className="text-xs">暂无可用 POI 图片</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 p-3 text-white">
                  <div>
                    <p className="text-sm font-medium">自动随机 POI</p>
                    <p className="text-[11px] text-white/80">默认推荐 · 同一行程封面保持稳定</p>
                  </div>
                  {isSelectedAuto ? <Check className="h-4 w-4 shrink-0" /> : <Sparkles className="h-4 w-4 shrink-0 opacity-80" />}
                </div>
              </div>
            </button>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <ImageIcon className="h-4 w-4" />
                从行程 POI 选择
              </div>

              {candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  当前行程还没有带图片的 POI，请先在规划工作台添加地点或上传 POI 图片。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {candidates.map((candidate) => {
                    const selected =
                      selection.mode === 'poi' && selection.placeId === candidate.placeId;
                    return (
                      <button
                        key={candidate.placeId}
                        type="button"
                        className={cn(
                          'group relative overflow-hidden rounded-lg border text-left transition-colors',
                          selected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40',
                        )}
                        onClick={() =>
                          setSelection({
                            mode: 'poi',
                            placeId: candidate.placeId,
                            imageUrl: candidate.imageUrl,
                          })
                        }
                      >
                        <div className="aspect-[4/3] bg-muted">
                          <img
                            src={candidate.imageUrl}
                            alt={candidate.placeName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="line-clamp-2 text-[11px] font-medium text-white">
                            {candidate.placeName}
                          </p>
                        </div>
                        {selected ? (
                          <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading || !trip}>
            {saving ? (
              <>
                <LogoLoading className="mr-2 h-4 w-4" />
                保存中...
              </>
            ) : (
              '保存封面'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TripCoverDialog;
