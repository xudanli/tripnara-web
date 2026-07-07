import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAssistantTravelContextGrounding } from '../hooks/useAssistantTravelContextGrounding';
import {
  buildAssistantContextGroundingDisplay,
} from '../lib/assistant-context-grounding.util';

interface AssistantContextGroundingStripProps {
  activeTripId?: string | null;
  className?: string;
  compact?: boolean;
  onRefreshContext?: () => void;
}

/** AI 助手 — Travel Context revision 接地条（不暴露 snapshotId） */
export function AssistantContextGroundingStrip({
  activeTripId,
  className,
  compact = false,
  onRefreshContext,
}: AssistantContextGroundingStripProps) {
  const { grounding, ready, refresh, openContextDiff } =
    useAssistantTravelContextGrounding(activeTripId);

  const display = buildAssistantContextGroundingDisplay(grounding);

  if (!display || !ready) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-muted/20 px-2.5 py-2',
        display.warnStale && 'border-amber-500/35 bg-amber-500/5',
        className,
      )}
      role="note"
      aria-label="助手行程上下文"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-medium text-foreground">{display.headline}</p>
          {!compact && display.detail ? (
            <p className="text-[10px] leading-relaxed text-muted-foreground">{display.detail}</p>
          ) : null}
          <p className="text-[10px] font-mono tabular-nums text-muted-foreground">
            {display.revisionLabel}
            {grounding?.stage ? ` · ${grounding.stage}` : ''}
          </p>
          {display.warnStale && grounding?.consistencyWarning ? (
            <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
              {grounding.consistencyWarning}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => {
              void refresh();
              onRefreshContext?.();
            }}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            同步
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={() => openContextDiff()}
          >
            变化
          </Button>
        </div>
      </div>
    </div>
  );
}
