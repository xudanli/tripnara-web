import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  HardTrekTrailPlanTimeline,
  extractHardTrekTrailPlan,
  extractRouteDirectionName,
} from './HardTrekTrailPlanTimeline';

interface HikingGeneratePlanResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: Record<string, unknown> | null;
}

export function HikingGeneratePlanResultDialog({
  open,
  onOpenChange,
  log,
}: HikingGeneratePlanResultDialogProps) {
  const plan = extractHardTrekTrailPlan(log ?? undefined);
  const routeName = extractRouteDirectionName(log ?? undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>徒步 Trail 计划已生成</DialogTitle>
          <DialogDescription>
            来自决策引擎 log.hardTrekTrailPlan（POST /decision-engine/v1/generate-plan）
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <HardTrekTrailPlanTimeline plan={plan} routeDirectionName={routeName} />
        ) : (
          <p className="text-sm text-muted-foreground">
            本次 log 未包含 hardTrekTrailPlan，请查看决策日志或 POI 日程。
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
