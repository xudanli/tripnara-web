import { Badge } from '@/components/ui/badge';
import { systemRecommendationLabel } from '@/lib/project-fit-display';
import type { SystemRecommendation } from '@/types/project-fit';
import { cn } from '@/lib/utils';

const VARIANT: Record<SystemRecommendation, string> = {
  APPROVE: 'bg-gate-allow-foreground/10 text-gate-allow-foreground dark:text-gate-allow-foreground',
  CLARIFY: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  WAITLIST: 'bg-muted/10 text-muted-foreground dark:text-muted-foreground',
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
