import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  formatExecutabilityStatusLabel,
  REPAIR_ACTION_LABEL,
} from '@/lib/trip-executability.util';
import type { LocalRepairPreview } from '@/types/trip-executability';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface RepairPreviewCardProps {
  preview: LocalRepairPreview;
  className?: string;
}

export function RepairPreviewCard({ preview, className }: RepairPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border border-border/70 bg-card px-3 py-2.5',
        className,
      )}
      data-testid={`repair-preview-${preview.optionId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{preview.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {REPAIR_ACTION_LABEL[preview.action]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {preview.loadTierBefore} → {preview.loadTierAfter}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {formatExecutabilityStatusLabel(preview.statusBefore)} →{' '}
              {formatExecutabilityStatusLabel(preview.statusAfter)}
            </Badge>
            {preview.minutesReleased > 0 ? (
              <Badge variant="outline" className="text-[10px]">
                释放 {preview.minutesReleased} 分钟
              </Badge>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          了解详情
          {expanded ? (
            <ChevronUp className="ml-1 h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      {expanded ? (
        <div className="mt-2 space-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <p>目标：{preview.targetRefs.join(', ') || '—'}</p>
          <p>预期驾驶负荷：{preview.loadTierBefore} → {preview.loadTierAfter}</p>
          <p>
            预期可执行性：
            {formatExecutabilityStatusLabel(preview.statusBefore)} →{' '}
            {formatExecutabilityStatusLabel(preview.statusAfter)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
