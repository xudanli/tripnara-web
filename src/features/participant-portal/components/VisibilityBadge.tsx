import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FieldVisibility =
  | 'PUBLIC_TO_PROJECT'
  | 'ADVISOR_DEIDENTIFIED'
  | 'PRIVACY_ANALYST_ONLY';

const VISIBILITY_CONFIG: Record<
  FieldVisibility,
  { label: string; className: string }
> = {
  PUBLIC_TO_PROJECT: {
    label: '团队可见',
    className: 'border-border bg-muted/15 text-muted-foreground dark:border-border dark:bg-muted/15 dark:text-muted-foreground',
  },
  ADVISOR_DEIDENTIFIED: {
    label: '仅顾问可见（脱敏）',
    className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
  PRIVACY_ANALYST_ONLY: {
    label: '仅本人和指定隐私分析员可见',
    className: 'border-border bg-muted/15 text-muted-foreground dark:border-border dark:bg-muted/15 dark:text-muted-foreground',
  },
};

interface VisibilityBadgeProps {
  visibility: FieldVisibility;
  className?: string;
}

export function VisibilityBadge({ visibility, className }: VisibilityBadgeProps) {
  const config = VISIBILITY_CONFIG[visibility];
  return (
    <Badge variant="outline" className={cn('text-[10px] font-normal', config.className, className)}>
      {config.label}
    </Badge>
  );
}
