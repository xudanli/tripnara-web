/**
 * route_and_run：trusted_delivery_v1.ai_operation_log — 「AI 做了什么」时间线
 * 只展示 label_zh，勿回显内部 step / KERNEL_*
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TrustedDeliveryAiOperationLogEntry } from '@/types/trusted-delivery';
import { ChevronRight, ListTree } from 'lucide-react';

export interface AiOperationLogPanelProps {
  entries: TrustedDeliveryAiOperationLogEntry[];
  className?: string;
  defaultOpen?: boolean;
}

function formatDuration(ms: number | undefined): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)}s`;
}

export function AiOperationLogPanel({
  entries,
  className,
  defaultOpen = false,
}: AiOperationLogPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!entries.length) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn('mt-2 rounded-md border border-border/70 bg-muted/15', className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-between rounded-md px-2.5 text-[11px] font-normal text-muted-foreground hover:text-foreground [&[data-state=open]_svg.chevron]:rotate-90"
        >
          <span className="inline-flex items-center gap-1.5">
            <ListTree className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            处理记录（{entries.length}）
          </span>
          <ChevronRight className="chevron h-3.5 w-3.5 transition-transform" aria-hidden />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 px-2.5 pb-2 pt-1.5">
        <ol className="space-y-1.5">
          {entries.map((entry, index) => {
            const duration = formatDuration(entry.duration_ms);
            return (
              <li key={`${entry.label_zh}-${index}`} className="flex gap-2 text-[11px]">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium text-foreground/90">{entry.label_zh}</span>
                    {duration ? (
                      <span className="tabular-nums text-muted-foreground/80">{duration}</span>
                    ) : null}
                  </div>
                  {entry.summary?.trim() ? (
                    <p className="mt-0.5 text-muted-foreground leading-relaxed">{entry.summary}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
