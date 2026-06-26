import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CERTAINTY_LEVEL_LABELS,
  certaintyLevelClasses,
} from '@/lib/experience-fulfillment-display.util';
import type { UserCertaintyLevel } from '@/types/experience-fulfillment';

interface CertaintyBadgeProps {
  level: UserCertaintyLevel;
  label?: string;
  className?: string;
}

export function CertaintyBadge({ level, label, className }: CertaintyBadgeProps) {
  const text = label ?? CERTAINTY_LEVEL_LABELS[level];
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', certaintyLevelClasses(level), className)}
    >
      {text}
    </Badge>
  );
}
