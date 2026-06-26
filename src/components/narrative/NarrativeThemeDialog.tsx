import { BookOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NarrativeThemeFlow } from './NarrativeThemeFlow';

interface NarrativeThemeDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function NarrativeThemeDialog({
  tripId,
  open,
  onOpenChange,
  onComplete,
}: NarrativeThemeDialogProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            旅行叙事主题
          </DialogTitle>
          <DialogDescription>
            用几句话描述你此刻的状态与期待，我们会生成 3 个可选主题——只影响叙事与呈现，不替代安全与路线裁决。
          </DialogDescription>
        </DialogHeader>
        <NarrativeThemeFlow
          tripId={tripId}
          onComplete={() => {
            onComplete?.();
            handleClose();
          }}
          onSkip={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
