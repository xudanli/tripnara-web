import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AttractionExploreMapPlaceSuggestion } from '@/types/attraction-explore';

export interface AttractionExploreMapPlaceSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  suggestions: AttractionExploreMapPlaceSuggestion[];
  submitting?: boolean;
  onSelect: (index: number) => void;
}

export function AttractionExploreMapPlaceSuggestionsDialog({
  open,
  onOpenChange,
  placeName,
  suggestions,
  submitting = false,
  onSelect,
}: AttractionExploreMapPlaceSuggestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择插入位置</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          为「{placeName}」生成插入草案（最多 {suggestions.length} 个建议，基于绕路成本估算）
        </p>
        <ul className="space-y-2 py-1">
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.dayIndex}-${suggestion.startTime ?? index}`}>
              <button
                type="button"
                disabled={submitting}
                className="w-full rounded-lg border border-border/60 bg-card/90 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                onClick={() => onSelect(index)}
              >
                <p className="text-xs font-medium text-foreground">
                  第 {suggestion.dayIndex} 天
                  {suggestion.startTime && suggestion.endTime
                    ? ` · ${suggestion.startTime}–${suggestion.endTime}`
                    : ''}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {suggestion.label ?? '顺路插入'}
                  {suggestion.detourMinutes != null ? ` · 绕路约 ${suggestion.detourMinutes} 分钟` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
