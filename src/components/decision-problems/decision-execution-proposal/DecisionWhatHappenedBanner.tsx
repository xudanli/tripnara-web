import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { semanticWarnText } from '@/lib/semantic-ui-classes';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface DecisionWhatHappenedBannerProps {
  text: string;
  title?: string;
  defaultOpen?: boolean;
  compact?: boolean;
  className?: string;
}

/** 决策执行空间 · 「发生了什么？」诊断条 */
export function DecisionWhatHappenedBanner({
  text,
  title = '发生了什么？',
  defaultOpen = true,
  compact = false,
  className,
}: DecisionWhatHappenedBannerProps) {
  const [open, setOpen] = useState(compact ? false : defaultOpen);
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <section
        className={cn(
          'rounded-xl border border-border/60 bg-card',
          compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
        )}
      >
        <CollapsibleTrigger className="flex w-full items-start gap-2 text-left">
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg bg-muted/15',
              compact ? 'mt-0.5 h-5 w-5' : 'mt-0.5 h-6 w-6',
            )}
          >
            <AlertTriangle
              className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', semanticWarnText)}
              aria-hidden
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
              {title}
            </span>
            {!open ? (
              <p
                className={cn(
                  'mt-0.5 line-clamp-2 leading-snug text-muted-foreground',
                  compact ? 'text-[11px]' : 'text-[12px]',
                )}
              >
                {trimmed}
              </p>
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p
            className={cn(
              'mt-1.5 pl-7 font-medium leading-snug text-foreground',
              compact ? 'text-[12px]' : 'text-[13px]',
            )}
          >
            {trimmed}
          </p>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
