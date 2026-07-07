import { ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DecisionSuggestedFollowUpsPanelProps {
  items: string[];
  className?: string;
}

/** submit resolutions 后展示的 suggestedFollowUps（apply 前提示） */
export function DecisionSuggestedFollowUpsPanel({
  items,
  className,
}: DecisionSuggestedFollowUpsPanelProps) {
  if (!items.length) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-muted/15 px-3 py-2.5',
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ListChecks className="h-3.5 w-3.5 shrink-0" aria-hidden />
        建议跟进事项
      </div>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="text-[11px] leading-relaxed text-muted-foreground">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
