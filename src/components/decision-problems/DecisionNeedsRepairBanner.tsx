import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DecisionExecutionUiVariant } from '@/generated/decision-semantics-contracts';

export interface DecisionNeedsRepairBannerProps {
  variant: DecisionExecutionUiVariant;
  failureMessage?: string | null;
  needsRepair?: boolean;
  className?: string;
  onContinueRepair?: () => void;
  onContactSupport?: () => void;
}

/** DC-FE-011 — PARTIALLY_APPLIED 持久 banner，用户确认前保持可见 */
export function DecisionNeedsRepairBanner({
  variant,
  failureMessage,
  needsRepair,
  className,
  onContinueRepair,
  onContactSupport,
}: DecisionNeedsRepairBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (variant !== 'warning_needs_repair' && !needsRepair) return null;

  return (
    <div
      className={cn(
        'relative rounded-md border border-border bg-muted/15 px-3 py-2.5 text-xs text-foreground',
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-2 pr-6">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-medium">部分应用，需继续修复</p>
          {failureMessage ? (
            <p className="text-[11px] leading-relaxed opacity-90">{failureMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {onContinueRepair ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 text-[11px]"
                onClick={onContinueRepair}
              >
                继续修复
              </Button>
            ) : null}
            {onContactSupport ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                onClick={onContactSupport}
              >
                联系支持
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => setDismissed(true)}
            >
              我已了解
            </Button>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground hover:bg-muted/80"
        aria-label="关闭提示"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
