import { cn } from '@/lib/utils';
import { SOFT_PREFER_PRIORITY_HINT } from '@/lib/soft-constraint.util';
import {
  sliderToSoftPriority,
  softPriorityLabelClass,
  type SoftPreferencePriority,
} from './constraint-console-view.util';
import { workbenchSegmentIdle, workbenchSegmentSelected } from './workbench-ui';

const PRIORITY_OPTIONS: SoftPreferencePriority[] = ['高', '中', '低'];

export interface SoftPreferencePriorityPickerProps {
  sliderValue: number;
  onCommit: (sliderValue: number) => void;
  className?: string;
  compact?: boolean;
}

const SLIDER_BY_PRIORITY = { 高: 85, 中: 50, 低: 25 } as const;

/** 软约束重要程度 · 高/中/低（映射到 PATCH priority） */
export function SoftPreferencePriorityPicker({
  sliderValue,
  onCommit,
  className,
  compact = false,
}: SoftPreferencePriorityPickerProps) {
  const priority = sliderToSoftPriority(sliderValue);

  return (
    <div className={cn('space-y-1.5', className)}>
      {!compact ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{SOFT_PREFER_PRIORITY_HINT}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {PRIORITY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onCommit(SLIDER_BY_PRIORITY[option])}
            className={cn(
              'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
              priority === option
                ? cn(softPriorityLabelClass(option), workbenchSegmentSelected)
                : workbenchSegmentIdle,
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
