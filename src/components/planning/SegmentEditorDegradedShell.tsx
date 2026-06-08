import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SegmentEditorDegradation } from '@/lib/world-model-guards';
import { Clock, Lock, Route } from 'lucide-react';

export interface SegmentEditorDegradedShellProps {
  degradation: SegmentEditorDegradation;
  children: ReactNode;
  className?: string;
  onAdjustSlotTiming?: () => void;
  /** toolbar：日程 Tab 内仅顶栏，不套大边框 */
  variant?: 'full' | 'toolbar';
}

function DegradedToolbar({
  degradation,
  onAdjustSlotTiming,
}: {
  degradation: SegmentEditorDegradation;
  onAdjustSlotTiming?: () => void;
}) {
  const showTimingCta =
    degradation.isTopologyLocked && degradation.timingEditable && onAdjustSlotTiming;

  return (
    <div
      className={cn(
        'flex flex-wrap items-start gap-2 px-3 py-2.5 border rounded-lg',
        degradation.isTopologyLocked
          ? 'border-amber-200/80 bg-amber-50/60'
          : 'border-border/60 bg-muted/30'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            degradation.isTopologyLocked
              ? 'bg-amber-100 text-amber-800'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {degradation.isTopologyLocked ? (
            <Lock className="h-4 w-4" aria-hidden />
          ) : (
            <Route className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {degradation.isTopologyLocked ? '路线段已锁定' : '路线结构只读'}
            </span>
            <Badge
              variant="outline"
              className="border-amber-400/60 bg-amber-100/80 text-amber-900 text-[10px] font-normal"
            >
              防震荡保护
            </Badge>
            {degradation.timingEditable ? (
              <Badge variant="secondary" className="text-[10px] font-normal">
                可微调时间
              </Badge>
            ) : null}
          </div>
          {degradation.slotTimingGuidanceZh ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {degradation.slotTimingGuidanceZh}
            </p>
          ) : null}
        </div>
      </div>
      {showTimingCta ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="shrink-0 bg-amber-700 hover:bg-amber-800 text-white"
          onClick={onAdjustSlotTiming}
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          去微调各站时间
        </Button>
      ) : null}
    </div>
  );
}

export function SegmentEditorDegradedShell({
  degradation,
  children,
  className,
  onAdjustSlotTiming,
  variant = 'full',
}: SegmentEditorDegradedShellProps) {
  if (!degradation.structureReadOnly && !degradation.isTopologyLocked) {
    return <>{children}</>;
  }

  const toolbar = (
    <DegradedToolbar degradation={degradation} onAdjustSlotTiming={onAdjustSlotTiming} />
  );

  if (variant === 'toolbar') {
    return (
      <div className={cn('space-y-4', className)}>
        {toolbar}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border transition-colors',
        degradation.isTopologyLocked
          ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/90 to-background shadow-sm'
          : 'border-muted bg-muted/20',
        className
      )}
    >
      <div
        className={cn(
          'border-b',
          degradation.isTopologyLocked ? 'border-amber-200/80' : 'border-border/60'
        )}
      >
        <div className="px-0 py-0 [&>div]:border-0 [&>div]:rounded-none [&>div]:mb-0">
          {toolbar}
        </div>
      </div>
      <div className="p-3 sm:p-4" aria-readonly={degradation.structureReadOnly || undefined}>
        {children}
      </div>
    </div>
  );
}
