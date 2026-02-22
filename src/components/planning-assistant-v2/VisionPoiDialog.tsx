/**
 * 拍照识别 POI 结果弹窗
 * 展示 OCR 结果、POI 候选，支持「加入行程」
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Loader2, Calendar, FileText, Camera } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { itineraryItemsApi } from '@/api/trips';
import { formatDayDate } from '@/utils/format';
import type { CreateItineraryItemRequest, TripDetail } from '@/types/trip';
import type { VisionPoiRecommendResponse, VisionPoiCandidate } from '@/api/vision';
import { toast } from 'sonner';

interface VisionPoiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: VisionPoiRecommendResponse | null;
  tripId?: string;
  tripInfo?: TripDetail;
  onAddToTripSuccess?: () => void;
}

export function VisionPoiDialog({
  open,
  onOpenChange,
  result,
  tripId,
  tripInfo,
  onAddToTripSuccess,
}: VisionPoiDialogProps) {
  const [addingPoi, setAddingPoi] = useState<VisionPoiCandidate | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string>('');

  const days = useMemo(() => tripInfo?.TripDay || [], [tripInfo?.TripDay]);
  const defaultDayId = useMemo(() => days[0]?.id ?? '', [days]);

  const handleAddToTrip = async (candidate: VisionPoiCandidate) => {
    if (!tripId || !tripInfo) return;
    setAddingPoi(candidate);
    const dayId = selectedDayId || defaultDayId;
    const selectedDay = days.find((d) => d.id === dayId);
    if (!selectedDay) {
      toast.error('请选择行程日期');
      setAddingPoi(null);
      return;
    }
    try {
      const dateStr = formatDayDate(selectedDay.date);
      if (dateStr === '—') {
        toast.error('日期格式无效');
        setAddingPoi(null);
        return;
      }
      const startTime = `${dateStr}T10:00:00.000Z`;
      const endTime = `${dateStr}T11:00:00.000Z`;
      const note = [candidate.name, `坐标: ${candidate.lat}, ${candidate.lng}`].join('\n');
      const data: CreateItineraryItemRequest = {
        tripDayId: selectedDay.id,
        type: 'ACTIVITY',
        startTime,
        endTime,
        note,
        placeName: candidate.name,
      };
      await itineraryItemsApi.create(data);
      toast.success(`已将 ${candidate.name} 加入行程`);
      onAddToTripSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加入行程失败');
    } finally {
      setAddingPoi(null);
    }
  };

  if (!result) return null;

  const { ocrResult, candidates } = result;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-primary" />
            拍照识别结果
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-1">
            识别到以下内容，可按需加入行程
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-4 p-6">
            {ocrResult.fullText && (
              <div className="rounded-xl border bg-muted/40 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">OCR 识别</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{ocrResult.fullText}</p>
              </div>
            )}
            {candidates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">附近 POI</p>
                </div>
                <div className="space-y-2">
                  {candidates.map((c) => {
                    const isAdding = addingPoi?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3 inline shrink-0" />
                            <span>{c.distanceM}m</span>
                            {c.rating != null && (
                              <>
                                <span className="text-muted-foreground/60">·</span>
                                <span>评分 {c.rating}</span>
                              </>
                            )}
                          </p>
                        </div>
                        {tripId && tripInfo && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {days.length > 1 && (
                              <Select
                                value={selectedDayId || defaultDayId}
                                onValueChange={setSelectedDayId}
                              >
                                <SelectTrigger className="w-[110px] h-9 text-xs">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <SelectValue placeholder="选择日期" />
                                </SelectTrigger>
                                <SelectContent>
                                  {days.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {formatDayDate(d.date)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAddToTrip(c)}
                              disabled={isAdding}
                              className="shrink-0"
                            >
                              {isAdding ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                '加入行程'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {candidates.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <MapPin className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">未找到附近 POI</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
