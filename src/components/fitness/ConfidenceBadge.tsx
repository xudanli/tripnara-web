/**
 * 置信度徽章组件
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConfidenceLevel } from '@/types/fitness';
import { CONFIDENCE_LEVEL_CONFIG } from '@/constants/fitness';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * 置信度徽章
 * 
 * @example
 * ```tsx
 * <ConfidenceBadge level="MEDIUM" showTooltip />
 * ```
 */
export function ConfidenceBadge({ 
  level, 
  showTooltip = true,
  size = 'md',
  className 
}: ConfidenceBadgeProps) {
  const config = CONFIDENCE_LEVEL_CONFIG[level] || CONFIDENCE_LEVEL_CONFIG.LOW;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        'border-transparent',
        sizeClasses[size],
        className
      )}
    >
      置信度: {config.label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
