/**
 * route_and_run：trusted_delivery_v1.degraded_explanation — 「本次已降级」信息条
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { TrustedDeliveryDegradedExplanation } from '@/types/trusted-delivery';
import { ChevronRight, Info } from 'lucide-react';

export interface DegradedExplanationBarProps {
  degraded: TrustedDeliveryDegradedExplanation;
  className?: string;
  /** 默认折叠原因列表 */
  defaultOpen?: boolean;
}

export function DegradedExplanationBar({
  degraded,
  className,
  defaultOpen = false,
}: DegradedExplanationBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!degraded.present) return null;

  const summary =
    degraded.summary_zh?.trim() || '本次规划已部分降级交付，部分能力或校验可能未完整执行。';
  const reasons = degraded.reasons_zh?.filter((r) => r.trim().length > 0) ?? [];

  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-sky-500/35 bg-sky-50/80 px-3 py-2 dark:border-sky-600/35 dark:bg-sky-950/25',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-sky-950 dark:text-sky-50">本次已降级</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-sky-950/90 dark:text-sky-100/90">
            {summary}
          </p>
        </div>
      </div>

      {reasons.length > 0 ? (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-1.5 pl-6">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[11px] gap-1 text-sky-900/90 dark:text-sky-100/90 [&[data-state=open]_svg]:rotate-90"
            >
              查看原因（{reasons.length}）
              <ChevronRight className="h-3 w-3 transition-transform" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-1 space-y-0.5 text-[11px] text-sky-950/85 dark:text-sky-100/85">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5">
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60"
                    aria-hidden
                  />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}
