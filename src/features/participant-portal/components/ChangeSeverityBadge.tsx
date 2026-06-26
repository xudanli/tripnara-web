import { Badge } from '@/components/ui/badge';
import type { ChangeNoticeSeverity } from '@/types/participant-portal';
import { cn } from '@/lib/utils';

const SEVERITY_STYLE: Record<ChangeNoticeSeverity, string> = {
  LOW: 'border-muted bg-muted/30 text-muted-foreground',
  MEDIUM: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
  HIGH: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100',
  EMERGENCY: 'border-destructive/50 bg-destructive/10 text-destructive',
};

const SEVERITY_LABEL: Record<ChangeNoticeSeverity, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  EMERGENCY: '紧急',
};

export function ChangeSeverityBadge({
  severity,
  className,
}: {
  severity: ChangeNoticeSeverity;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('font-normal', SEVERITY_STYLE[severity], className)}>
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}
