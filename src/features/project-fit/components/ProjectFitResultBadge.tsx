import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fitOverallResultDescription,
  fitOverallResultLabel,
} from '@/lib/project-fit-display';
import type { FitOverallResult } from '@/types/project-fit';

const VARIANT: Record<
  FitOverallResult,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  STRONG_FIT: 'default',
  BASIC_FIT: 'default',
  CONDITIONAL: 'secondary',
  NOT_RECOMMENDED: 'destructive',
};

interface ProjectFitResultBadgeProps {
  result: FitOverallResult | string | null | undefined;
  label?: string | null;
  showDescription?: boolean;
  className?: string;
}

/** 四档结论展示 · 禁止 0–100 综合分 */
export function ProjectFitResultBadge({
  result,
  label,
  showDescription,
  className,
}: ProjectFitResultBadgeProps) {
  if (!result) {
    return (
      <Badge variant="outline" className={className}>
        待评估
      </Badge>
    );
  }

  const displayLabel = label ?? fitOverallResultLabel(result);
  const variant = VARIANT[result as FitOverallResult] ?? 'outline';

  return (
    <div className={cn('space-y-1', className)}>
      <Badge variant={variant} className="text-sm">
        {displayLabel}
      </Badge>
      {showDescription && (
        <p className="text-xs text-muted-foreground">
          {fitOverallResultDescription(result)}
        </p>
      )}
    </div>
  );
}
