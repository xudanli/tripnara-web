import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DomainInfluenceClaimPanel } from './DomainInfluenceClaimPanel';

interface DomainInfluenceClaimWorkbenchDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 时间轴「认领领域」入口：完整认领工作台弹窗 */
export function DomainInfluenceClaimWorkbenchDialog({
  tripId,
  open,
  onOpenChange,
}: DomainInfluenceClaimWorkbenchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,920px)] max-w-none max-h-[min(90vh,880px)] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-2 space-y-1">
          <DialogTitle>领域专家认领</DialogTitle>
          <DialogDescription>
            为住宿、活动、大交通等领域指定负责人与决策权重。完成后右侧「行程领域分解」会同步更新。
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DomainInfluenceClaimPanel
            tripId={tripId}
            hideSectionHeader
            className="border-0 shadow-none rounded-none"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
