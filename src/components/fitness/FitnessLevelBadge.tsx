/**
 * 体能等级徽章组件
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FitnessLevel } from '@/types/fitness';
import { FITNESS_LEVEL_CONFIG } from '@/constants/fitness';

interface FitnessLevelBadgeProps {
  level: FitnessLevel;
  showEmoji?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * 体能等级徽章
 * 
 * @example
 * ```tsx
 * <FitnessLevelBadge level="MEDIUM_HIGH" showEmoji />
 * ```
 */
export function FitnessLevelBadge({ 
  level, 
  showEmoji = true, 
  size = 'md',
  className 
}: FitnessLevelBadgeProps) {
  const config = FITNESS_LEVEL_CONFIG[level] || FITNESS_LEVEL_CONFIG.MEDIUM;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        config.borderColor,
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {showEmoji && <span className="mr-1">{config.emoji}</span>}
      {config.label}
    </Badge>
  );
}
