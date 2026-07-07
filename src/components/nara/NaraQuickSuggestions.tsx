import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Hotel, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NaraQuickSuggestion {
  id: string;
  label: string;
  prompt: string;
  icon?: LucideIcon;
}

interface NaraQuickSuggestionsProps {
  suggestions: NaraQuickSuggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function buildDefaultNaraSuggestions(options?: {
  drivingConflictDay?: number | null;
  destinationLabel?: string | null;
}): NaraQuickSuggestion[] {
  const day = options?.drivingConflictDay;
  const suggestions: NaraQuickSuggestion[] = [];

  if (day != null) {
    suggestions.push({
      id: 'optimize-driving',
      label: `优化 Day ${day} 驾驶时长`,
      prompt: `Day ${day} 驾驶时间偏长，请给出几种优化方案，并说明对预算和体验的影响。`,
      icon: Clock,
    });
  }

  suggestions.push({
    id: 'accommodation',
    label: '推荐合适住宿区域',
    prompt: options?.destinationLabel
      ? `基于当前${options.destinationLabel}行程节奏，推荐合适的住宿区域并说明理由。`
      : '基于当前行程节奏，推荐合适的住宿区域并说明理由。',
    icon: Hotel,
  });

  suggestions.push({
    id: 'aurora',
    label: '极光最佳观测时间',
    prompt: '结合当前行程日期和地点，极光最佳观测时间是什么时候？',
    icon: Sparkles,
  });

  return suggestions.slice(0, 3);
}

export default function NaraQuickSuggestions({
  suggestions,
  onSelect,
  disabled,
  className,
}: NaraQuickSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2 px-4 py-2 border-b border-border/60 bg-muted/20', className)}>
      {suggestions.map((item) => {
        const Icon = item.icon ?? Sparkles;
        return (
          <Button
            key={item.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 rounded-full border-border/80 bg-background text-xs font-normal shadow-none hover:bg-muted/50"
            onClick={() => onSelect(item.prompt)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
