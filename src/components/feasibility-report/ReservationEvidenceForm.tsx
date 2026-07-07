import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  listReservationEvidenceForItem,
  saveTripReservationEvidence,
} from '@/lib/trip-reservation-evidence-save.util';
import type { ReservationEvidenceFormContext } from '@/lib/poi-access-reservation-evidence.util';
import type { TripDetail } from '@/types/trip';
import type { PoiTargetResource } from '@/types/poi-access-capacity';

const TARGET_LABELS: Partial<Record<PoiTargetResource, string>> = {
  PARKING: '停车预约',
  TIMED_ENTRY: '分时入场',
  ACTIVITY: '活动预约',
};

export interface ReservationEvidenceFormProps {
  tripId: string;
  trip?: TripDetail | null;
  context: ReservationEvidenceFormContext;
  className?: string;
  onSaved?: () => void;
}

export default function ReservationEvidenceForm({
  tripId,
  trip,
  context,
  className,
  onSaved,
}: ReservationEvidenceFormProps) {
  const {
    tripItemId,
    targetResource,
    poiId,
    dateISO,
    plannedArrival,
    plannedArrivalAt,
  } = context;

  const existing = listReservationEvidenceForItem(trip, tripItemId);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resourceLabel = TARGET_LABELS[targetResource] ?? '预约凭证';
  const slotHint =
    dateISO && plannedArrival
      ? `${dateISO} ${plannedArrival}`
      : dateISO ?? plannedArrivalAt?.slice(0, 16);

  const handleSubmit = async () => {
    const code = confirmationCode.trim();
    if (!code) {
      toast.error('请填写确认号或预约编号');
      return;
    }
    setSubmitting(true);
    try {
      await saveTripReservationEvidence(tripId, trip, {
        tripItemId,
        poiId,
        confirmationCode: code,
        targetResource,
        dateISO,
        plannedArrival,
        plannedArrivalAt,
      });
      toast.success('预约凭证已保存，正在更新冲突列表…');
      setConfirmationCode('');
      onSaved?.();
    } catch (err) {
      console.error('[ReservationEvidenceForm]', err);
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {existing.length > 0 ? (
        <div className="flex items-start gap-1.5 text-[11px] text-success dark:text-success">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>
            已上传 {existing.length} 条凭证
            {existing[0]?.confirmationCode ? `（${existing[0].confirmationCode}）` : ''}
          </span>
        </div>
      ) : null}
      {slotHint ? (
        <p className="text-[11px] text-muted-foreground">
          计划时段：<span className="text-foreground">{slotHint}</span>
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`reservation-code-${tripItemId}`} className="text-xs text-muted-foreground">
          {resourceLabel}确认号
        </Label>
        <Input
          id={`reservation-code-${tripItemId}`}
          value={confirmationCode}
          onChange={(e) => setConfirmationCode(e.target.value)}
          placeholder="如 PARKA-XXXX"
          className="h-9 text-sm"
          disabled={submitting}
          autoFocus
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        提交后将调用 reservation-evidence 接口；无需单独 apply-repair。覆盖计划到达 ±2 小时即视为有效。
      </p>
      <Button
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            保存中…
          </>
        ) : (
          '保存凭证'
        )}
      </Button>
    </div>
  );
}
