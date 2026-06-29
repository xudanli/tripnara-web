import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConstraintListEditButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

/** 约束列表行 · 悬浮编辑按钮 */
export function ConstraintListEditButton({ label, onClick, className }: ConstraintListEditButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={`编辑${label}`}
    >
      <Pencil className="h-3 w-3" />
    </Button>
  );
}
