import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssistantCenter } from '@/components/trips/AssistantCenter';
import type { ComponentProps } from 'react';

export interface TripDetailSuggestionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantCenterProps: ComponentProps<typeof AssistantCenter>;
}

/** 行程详情 · 建议面板（lazy 拉取 GET /suggestions） */
export function TripDetailSuggestionsSheet({
  open,
  onOpenChange,
  assistantCenterProps,
}: TripDetailSuggestionsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[min(85vh,720px)] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border/60">
          <DialogTitle>智能建议</DialogTitle>
          <DialogDescription>Abu / Dr.Dre / Neptune 的行程优化与风险提示</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <AssistantCenter {...assistantCenterProps} className="border-0 shadow-none" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
