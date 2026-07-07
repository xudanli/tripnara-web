import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { areDecisionAcknowledgementsComplete } from '@/lib/decision-acknowledgement.util';
import { DecisionAcknowledgementPanel } from './DecisionAcknowledgementPanel';

export interface DecisionAcknowledgementConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: string[];
  checked: string[];
  onToggle: (item: string, checked: boolean) => void;
  confirmLabel: string;
  confirming?: boolean;
  onConfirm: () => void;
}

/** 提交结论 / 应用到行程前的阻断确认（工作台决策空间） */
export function DecisionAcknowledgementConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  checked,
  onToggle,
  confirmLabel,
  confirming = false,
  onConfirm,
}: DecisionAcknowledgementConfirmDialogProps) {
  const canConfirm = areDecisionAcknowledgementsComplete(items, checked);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <DecisionAcknowledgementPanel
          items={items}
          checked={checked}
          onToggle={onToggle}
          className="border-0 bg-transparent px-0 py-0"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={confirming}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || confirming}
            onClick={(event) => {
              event.preventDefault();
              if (!canConfirm || confirming) return;
              onConfirm();
            }}
          >
            {confirming ? '处理中…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
