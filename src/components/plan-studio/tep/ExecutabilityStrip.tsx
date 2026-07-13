import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { STRIP_LEVEL_BG } from '@/lib/trip-executability.util';
import type { ExecutabilityAssessmentUi } from '@/types/trip-executability';

export interface ExecutabilityStripProps {
  ui: ExecutabilityAssessmentUi;
  isStale?: boolean;
  refreshing?: boolean;
  onPrimaryCta?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export function ExecutabilityStrip({
  ui,
  isStale = false,
  refreshing = false,
  onPrimaryCta,
  onRefresh,
  className,
}: ExecutabilityStripProps) {
  return (
    <div
      className={cn(
        'border-b px-4 py-3 sm:px-5',
        STRIP_LEVEL_BG[ui.stripLevel],
        className,
      )}
      data-testid="executability-strip"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{ui.statusLabel}</p>
          {isStale ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              信息可能过期
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isStale && onRefresh ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs"
              disabled={refreshing}
              onClick={onRefresh}
            >
              {refreshing ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
              )}
              刷新
            </Button>
          ) : null}
          {ui.primaryCta?.label ? (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg text-xs"
              onClick={onPrimaryCta}
            >
              {ui.primaryCta.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
