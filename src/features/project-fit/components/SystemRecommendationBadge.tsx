import { Badge } from '@/components/ui/badge';
import { systemRecommendationLabel } from '@/lib/project-fit-display';
import type { SystemRecommendation } from '@/types/project-fit';
import { cn } from '@/lib/utils';

const VARIANT: Record<SystemRecommendation, string> = {
  APPROVE: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  CLARIFY: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  WAITLIST: 'bg-blue-500/10 text-blue-800 dark:text-blue-300',
  REJECT: 'bg-destructive/10 text-destructive',
};

interface SystemRecommendationBadgeProps {
  recommendation: SystemRecommendation | string;
  className?: string;
}

export function SystemRecommendationBadge({
  recommendation,
  className,
}: SystemRecommendationBadgeProps) {
  const rec = recommendation as SystemRecommendation;
  return (
    <Badge variant="outline" className={cn(VARIANT[rec] ?? '', className)}>
      系统建议：{systemRecommendationLabel(recommendation)}
    </Badge>
  );
}
