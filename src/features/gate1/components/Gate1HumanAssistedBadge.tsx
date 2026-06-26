import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { gate1SourceTypeLabel } from '@/lib/gate1-display';
import type { Gate1SourceType } from '@/types/gate1';

interface Gate1HumanAssistedBadgeProps {
  sourceType: Gate1SourceType;
  humanAssistedLabel?: string;
  version?: number;
  className?: string;
}

/** 已发布输出必须展示人工协助标识（接口文档 §1.4） */
export function Gate1HumanAssistedBadge({
  sourceType,
  humanAssistedLabel,
  version,
  className,
}: Gate1HumanAssistedBadgeProps) {
  const label = gate1SourceTypeLabel(sourceType, humanAssistedLabel);
  const variant =
    sourceType === 'HUMAN_ASSISTED'
      ? 'secondary'
      : sourceType === 'HYBRID'
        ? 'outline'
        : 'default';

  return (
    <Badge variant={variant} className={cn('font-normal', className)}>
      {label}
      {version != null ? ` · v${version}` : ''}
    </Badge>
  );
}
