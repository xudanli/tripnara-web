import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PlanObjectSourceBadgeProps {
  className?: string;
  compact?: boolean;
}

/** PlanObject 投影来源标识（proofs evidenceSource / semanticKey 前缀） */
export function PlanObjectSourceBadge({ className, compact = false }: PlanObjectSourceBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-border/80 bg-muted/15 font-normal text-muted-foreground',
        compact ? 'h-5 text-[10px]' : 'text-[10px]',
        className,
      )}
      title="来源：日内行程评估（PlanObject 投影）"
    >
      日内评估
    </Badge>
  );
}
