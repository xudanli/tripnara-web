import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { hikePlansApi } from '@/api/hike-plans';
import type { HikingSegment } from '@/types/hiking-embedded';
import { canAddSegment, validateSegmentDates } from '@/lib/hiking-segments';
import { getEmbeddedHikingErrorMessage } from '@/lib/embedded-hiking-api-errors';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripStart?: string;
  tripEnd?: string;
  segmentCount?: number;
  defaultRouteDirectionId?: number;
  /** 原子创建成功后回调（服务端已写入 metadata，请 reload Trip） */
  onCreated: (segment: HikingSegment) => void | Promise<void>;
};

/** 旧后端回退：先 POST hike-plans 再由父组件 PUT metadata */
async function createSegmentLegacy(
  tripId: string,
  seg: HikingSegment
): Promise<HikingSegment> {
  const plan = await hikePlansApi.create({
    tripId,
    routeDirectionId: seg.routeDirectionId!,
    plannedDate: seg.startDate,
    nameCN: seg.label,
  });
  return { ...seg, hikePlanId: plan.id };
}

function isWithSegmentUnavailable(err: unknown): boolean {
  const e = err as Error & { code?: string; response?: { status?: number } };
  return e.code === 'NOT_FOUND' || e.response?.status === 404;
}

export function AddHikingSegmentDialog({
  open,
  onOpenChange,
  tripId,
  tripStart,
  tripEnd,
  segmentCount = 0,
  defaultRouteDirectionId = 106,
  onCreated,
}: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [routeDirectionId, setRouteDirectionId] = useState(String(defaultRouteDirectionId));
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!canAddSegment(segmentCount)) {
      setError('每条行程最多 3 个徒步片段');
      return;
    }
    const segmentId = crypto.randomUUID();
    const seg: HikingSegment = {
      segmentId,
      startDate,
      endDate: endDate || startDate,
      routeDirectionId: Number(routeDirectionId) || undefined,
      label: label || undefined,
    };
    const dateErr = validateSegmentDates(seg, tripStart, tripEnd);
    if (dateErr) {
      setError(dateErr);
      return;
    }
    if (!seg.routeDirectionId) {
      setError('请填写路线 ID（routeDirectionId）');
      return;
    }
    setLoading(true);
    try {
      let created: HikingSegment;
      try {
        const res = await hikePlansApi.createWithSegment({
          tripId,
          routeDirectionId: seg.routeDirectionId,
          plannedDate: seg.startDate,
          nameCN: seg.label,
          segment: seg,
        });
        created = res.segment;
      } catch (e) {
        if (!isWithSegmentUnavailable(e)) throw e;
        created = await createSegmentLegacy(tripId, seg);
      }
      await onCreated(created);
      onOpenChange(false);
      setStartDate('');
      setEndDate('');
      setLabel('');
    } catch (e) {
      setError(getEmbeddedHikingErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加徒步片段</DialogTitle>
          <DialogDescription>
            将原子创建 HikePlan 并写入行程 metadata（P2 with-segment）。混合出行下 tripId 必填。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="seg-start">开始日期</Label>
              <Input
                id="seg-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="seg-end">结束日期</Label>
              <Input
                id="seg-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="seg-rd">路线 ID</Label>
            <Input
              id="seg-rd"
              type="number"
              placeholder="106"
              value={routeDirectionId}
              onChange={(e) => setRouteDirectionId(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="seg-label">备注（可选）</Label>
            <Input
              id="seg-label"
              placeholder="如 Routeburn 2日"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={loading || !startDate}>
            {loading ? '创建中…' : '创建并关联'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
