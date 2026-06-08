import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getSegmentEditorDegradation, resolvePlanningBannerText } from '@/lib/world-model-guards';
import type { WorldModelGuards } from '@/types/world-model-guards';
import { AlertTriangle, Clock, Info, Lock } from 'lucide-react';

export interface PlanningBannerProps {
  guards?: WorldModelGuards | null;
  className?: string;
}

/**
 * 规划工作台顶栏：优先 `banner_message_zh`，否则按 `segment_editor_mode` 默认文案。
 */
export function PlanningBanner({ guards, className }: PlanningBannerProps) {
  const text = resolvePlanningBannerText(guards ?? null);
  if (!text) return null;

  const degradation = getSegmentEditorDegradation(guards ?? null);
  const isTopologyLock = degradation.isTopologyLocked;
  const isWarning = Boolean(
    isTopologyLock ||
      guards?.segment_editor_mode === 'slot_timing_only' ||
      guards?.segment_editor_mode === 'readonly'
  );

  return (
    <Alert
      className={cn(
        'mb-4',
        isTopologyLock
          ? 'border-amber-500/50 bg-gradient-to-r from-amber-50 to-amber-50/30 text-amber-950 [&>svg]:text-amber-700'
          : isWarning
            ? 'border-amber-500/40 bg-amber-50 text-amber-950 [&>svg]:text-amber-700'
            : 'border-sky-500/40 bg-sky-50 text-sky-950 [&>svg]:text-sky-700',
        className
      )}
    >
      {isTopologyLock ? (
        <Lock className="h-4 w-4" />
      ) : isWarning ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertDescription className="space-y-1.5">
        <p>{text}</p>
        {isTopologyLock && degradation.timingEditable ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-900/85 font-medium">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            下一步：在下方「日程」中点击各站「微调时间」，勿增删或替换地点。
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
