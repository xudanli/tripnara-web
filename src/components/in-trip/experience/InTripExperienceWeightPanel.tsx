import { format } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { weightDeltaLabel } from '@/lib/in-trip-experience';
import type { WeightAdjustmentsResult } from '@/types/in-trip-experience';

interface InTripExperienceWeightPanelProps {
  data: WeightAdjustmentsResult | null;
  loading?: boolean;
  error?: string | null;
  unreadCount?: number;
  markingRead?: boolean;
  onMarkRead?: () => void;
  className?: string;
}

function WeightDeltaRow({ label, delta }: { label: string; delta?: number }) {
  if (delta == null || delta === 0) return null;
  return (
    <span className="text-xs">
      {label}{' '}
      <span className={cn('font-medium', delta > 0 ? 'text-emerald-700' : 'text-rose-700')}>
        {weightDeltaLabel(delta)}
      </span>
    </span>
  );
}

export function InTripExperienceWeightPanel({
  data,
  loading,
  error,
  unreadCount = 0,
  markingRead,
  onMarkRead,
  className,
}: InTripExperienceWeightPanelProps) {
  if (loading) {
    return (
      <Card className={cn('col-span-12', className)}>
        <CardContent className="py-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.current) return null;

  const { current, history } = data;
  const hasDeltas =
    (current.activityIntensityDelta ?? 0) !== 0 ||
    (current.diningQualityDelta ?? 0) !== 0 ||
    (current.museumDensityDelta ?? 0) !== 0 ||
    current.bufferDayInserted;

  if (!hasDeltas && history.length === 0) return null;

  return (
    <Card className={cn('col-span-12 border-sky-200/80', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base flex items-center gap-2 flex-1">
            <SlidersHorizontal className="h-4 w-4 text-sky-600" aria-hidden />
            明日推荐权重调整
          </CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {unreadCount} 条未读
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="rounded-lg border p-3 space-y-2">
          {current.explanationZh && <p className="text-sm">{current.explanationZh}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <WeightDeltaRow label="活动强度" delta={current.activityIntensityDelta} />
            <WeightDeltaRow label="餐饮品质" delta={current.diningQualityDelta} />
            <WeightDeltaRow label="博物馆密度" delta={current.museumDensityDelta} />
            {current.bufferDayInserted && (
              <span className="text-xs font-medium text-sky-700">已插入缓冲日</span>
            )}
          </div>
          {current.appliedAt && (
            <p className="text-[10px] text-muted-foreground">
              生效于 {format(new Date(current.appliedAt), 'M月d日 HH:mm')}
            </p>
          )}
        </div>

        {unreadCount > 0 && onMarkRead && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={markingRead}
            onClick={onMarkRead}
          >
            {markingRead ? '处理中…' : '标记已读'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
