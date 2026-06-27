import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  constraintFlexibilityLabel,
  type ConstraintFlexKey,
} from '@/lib/constraint-flexibility.util';
import { useConstraintFlexibility } from '@/hooks/useConstraintFlexibility';
import type { ConstraintEditMeta } from '@/lib/planning-constraint-edit-meta';

export interface PlanningConstraintDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: ConstraintEditMeta;
  flexKey: ConstraintFlexKey;
  tripId: string | null;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  onSave: () => void | Promise<void>;
  children: ReactNode;
  footerExtra?: ReactNode;
}

export function PlanningConstraintDialogShell({
  open,
  onOpenChange,
  meta,
  flexKey,
  tripId,
  saving = false,
  saveDisabled = false,
  saveLabel = '保存',
  onSave,
  children,
  footerExtra,
}: PlanningConstraintDialogShellProps) {
  const { levels } = useConstraintFlexibility(tripId);
  const flexibility = levels[flexKey] ?? 'hard';
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-4 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[9px] font-medium">
            {constraintFlexibilityLabel(flexibility)}
          </Badge>
          <span>{meta.flexibilityHint}</span>
        </div>

        {children}

        {footerExtra}

        <DialogFooter className="gap-2 sm:gap-0 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background"
            disabled={saveDisabled || saving}
            onClick={() => void onSave()}
          >
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                保存中…
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
