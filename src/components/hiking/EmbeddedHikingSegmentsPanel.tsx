import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Trash2, Compass, Backpack, Plus, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { tripsApi } from '@/api/trips';
import type { HikePlanRecord } from '@/types/hike-plan';
import type { HikingSegment } from '@/types/hiking-embedded';
import type { HikingSegmentEvaluateResponse } from '@/types/trip-hiking-summary';
import { segmentNeedsReadiness } from '@/lib/hiking-nsr';
import { canAddSegment } from '@/lib/hiking-segments';
import { getEmbeddedHikingErrorMessage } from '@/lib/embedded-hiking-api-errors';

type Props = {
  tripId: string;
  segments: HikingSegment[];
  plans: HikePlanRecord[];
  resolvePlan?: (segment: HikingSegment) => HikePlanRecord | undefined;
  onAddSegment: () => void;
  onRemoveSegment: (segmentId: string) => void | Promise<void>;
};

function SegmentRow({
  tripId,
  seg,
  plan,
  onRemove,
}: {
  tripId: string;
  seg: HikingSegment;
  plan?: HikePlanRecord;
  onRemove: () => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const [evaluate, setEvaluate] = useState<HikingSegmentEvaluateResponse | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  const needsNsr = segmentNeedsReadiness(seg);
  const snap = seg.readinessSnapshot ?? evaluate?.readiness;

  const runEvaluate = async () => {
    setEvalLoading(true);
    setEvalError(null);
    try {
      const res = await tripsApi.evaluateHikingSegment(tripId, seg.segmentId);
      setEvaluate(res);
    } catch (e) {
      setEvalError(getEmbeddedHikingErrorMessage(e));
    } finally {
      setEvalLoading(false);
    }
  };

  const costHint = evaluate?.costHintZh ?? evaluate?.feeHintZh;
  const permitsOk =
    evaluate?.permits?.complete ?? evaluate?.permits?.permitsComplete ?? plan?.permitsObtained;

  return (
    <div className="rounded-md border border-gray-200 p-3 space-y-2 bg-white">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{seg.label ?? `路线 #${seg.routeDirectionId ?? '—'}`}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {seg.startDate.split('T')[0]}
            {seg.endDate && seg.endDate !== seg.startDate
              ? ` → ${seg.endDate.split('T')[0]}`
              : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {plan ? (
            <Badge variant="secondary" className="text-xs">
              {plan.status}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-amber-800 border-amber-300">
              未关联
            </Badge>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>移除徒步片段？</AlertDialogTitle>
                <AlertDialogDescription>
                  仅从行程 metadata 移除登记；服务端 DELETE Trip 时会级联删 HikePlan。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onRemove()}>移除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {snap?.level ? (
        <p className="text-xs text-muted-foreground">
          Readiness：{snap.level}
          {snap.score != null ? ` · ${snap.score} 分` : ''}
          {evaluate?.readiness?.headlineZh ? ` — ${evaluate.readiness.headlineZh}` : ''}
        </p>
      ) : needsNsr ? (
        <p className="text-xs text-amber-800">建议在出发前 48h 内完成 Readiness（NSR）</p>
      ) : null}
      {permitsOk === false ? (
        <p className="text-xs text-amber-800">许可未齐备</p>
      ) : null}
      {costHint ? <p className="text-xs text-muted-foreground">{costHint}</p> : null}
      {evalError ? <p className="text-xs text-destructive">{evalError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={evalLoading}
          onClick={() => void runEvaluate()}
        >
          {evalLoading ? <Spinner className="h-3 w-3 mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          片段评估
        </Button>
        {seg.routeDirectionId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              navigate(
                `/dashboard/readiness?trailId=${seg.routeDirectionId}&tripId=${tripId}${
                  plan?.id ? `&hikePlanId=${plan.id}` : ''
                }&plannedDate=${seg.startDate.split('T')[0]}`
              )
            }
          >
            <Compass className="h-3 w-3 mr-1" />
            Readiness
          </Button>
        ) : null}
        {plan?.id ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => navigate(`/dashboard/trails/prep/${plan.id}`)}
          >
            <Backpack className="h-3 w-3 mr-1" />
            行前准备
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EmbeddedHikingSegmentsPanel({
  tripId,
  segments,
  plans,
  resolvePlan,
  onAddSegment,
  onRemoveSegment,
}: Props) {
  const resolve =
    resolvePlan ??
    ((seg: HikingSegment) =>
      plans.find(
        (p) =>
          p.id === seg.hikePlanId ||
          (seg.routeDirectionId &&
            p.routeDirectionId === seg.routeDirectionId &&
            p.plannedDate?.split('T')[0] === seg.startDate.split('T')[0])
      ));

  return (
    <Card className="border-emerald-100 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">徒步片段</CardTitle>
            <CardDescription>
              数据来自 GET hiking-summary；PUT 仅替换完整 hikingSegments 数组
            </CardDescription>
          </div>
          {canAddSegment(segments.length) ? (
            <Button type="button" size="sm" variant="outline" onClick={onAddSegment}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              添加
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {segments.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚未登记徒步日期，请添加片段并关联 HikePlan。</p>
        ) : (
          segments.map((seg) => (
            <SegmentRow
              key={seg.segmentId}
              tripId={tripId}
              seg={seg}
              plan={resolve(seg)}
              onRemove={() => onRemoveSegment(seg.segmentId)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
