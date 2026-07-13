import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DayExecutabilityBadgeModel } from '@/lib/trip-executability.util';

export interface ScheduleDayTepBadgeProps {
  model: DayExecutabilityBadgeModel;
  onClick?: () => void;
  className?: string;
}

export function ScheduleDayTepBadge({ model, onClick, className }: ScheduleDayTepBadgeProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={cn(
        'flex flex-wrap items-center gap-1.5',
        onClick && 'rounded-md transition-colors hover:bg-muted/40',
        className,
      )}
      onClick={onClick}
      data-testid={`schedule-day-tep-badge-${model.dayIndex}`}
    >
      {model.loadTier && (model.loadTier === 'HIGH' || model.loadTier === 'EXTREME') ? (
        <Badge variant="outline" className="text-[10px]">
          负荷 {model.loadTier}
        </Badge>
      ) : null}
      {model.isVulnerable ? (
        <Badge variant="outline" className="gap-1 text-[10px] text-warning-foreground">
          <AlertTriangle className="h-3 w-3" />
          最脆弱
        </Badge>
      ) : null}
      {model.flexibleCount === 0 && model.findingCount > 0 ? (
        <Badge variant="secondary" className="text-[10px]">
          弹性 0
        </Badge>
      ) : null}
      {model.weatherSensitiveCount > 0 ? (
        <Badge variant="outline" className="text-[10px]">
          天气敏感 {model.weatherSensitiveCount}
        </Badge>
      ) : null}
    </Wrapper>
  );
}
