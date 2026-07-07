import {
  Dialog,
  SheetLayerDialogContent,
} from '@/components/ui/dialog';
import { ConstraintEditorPanel, type ConstraintEditorPanelProps } from './ConstraintEditorPanel';

export interface EditConstraintDialogProps
  extends Omit<ConstraintEditorPanelProps, 'onCancel' | 'className'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage?: string | null;
}

/** 编辑约束 · 弹窗（约束控制台） */
export function EditConstraintDialog({
  open,
  onOpenChange,
  errorMessage,
  ...panelProps
}: EditConstraintDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SheetLayerDialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
        <ConstraintEditorPanel
          {...panelProps}
          inDialog
          errorMessage={errorMessage}
          onCancel={() => onOpenChange(false)}
          className="max-h-[85vh]"
        />
      </SheetLayerDialogContent>
    </Dialog>
  );
}
