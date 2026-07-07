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
import { Spinner } from '@/components/ui/spinner';
import { hikingApi } from '@/api/hiking';
import { HardTrekTrailPlanTimeline } from './HardTrekTrailPlanTimeline';
import { buildTrailPlanPreviewBody } from '@/lib/trip-hiking';
import type { HardTrekTrailPlan } from '@/types/hiking';
import type { TripDetail } from '@/types/trip';

interface TrailPlanPreviewDialogProps {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmGenerate?: () => void;
}

export function TrailPlanPreviewDialog({
  trip,
  open,
  onOpenChange,
  onConfirmGenerate,
}: TrailPlanPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<HardTrekTrailPlan | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const data = await hikingApi.previewTrailPlan(buildTrailPlanPreviewBody(trip));
      setPlan(data);
    } catch (e) {
      setError((e as Error).message || 'Trail 预演失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      void loadPreview();
    } else {
      setPlan(null);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Trail 段预演</DialogTitle>
          <DialogDescription>
            正式生成前预览按日 Trail 草案（POST /demo/hiking/trail-plan/preview）
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-[120px] py-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Spinner className="h-7 w-7" />
            </div>
          )}
          {error && <p className="text-sm text-gate-reject-foreground">{error}</p>}
          {!loading && !error && plan && (
            <HardTrekTrailPlanTimeline
              plan={plan}
              routeDirectionName={
                (trip.metadata?.routeDirectionName as string) ?? 'IS_LAUGAVEGUR'
              }
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {onConfirmGenerate && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onConfirmGenerate();
              }}
              disabled={loading}
            >
              确认并生成方案
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
