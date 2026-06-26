import { Badge } from '@/components/ui/badge';
import { gate1RiskLevelBadgeVariant, gate1RiskLevelLabel } from '@/lib/gate1-display';
import type { Gate1RiskLevel } from '@/types/gate1';

interface Gate1RiskBadgeProps {
  level: Gate1RiskLevel;
}

export function Gate1RiskBadge({ level }: Gate1RiskBadgeProps) {
  return (
    <Badge variant={gate1RiskLevelBadgeVariant(level)} title={gate1RiskLevelLabel(level)}>
      {gate1RiskLevelLabel(level)}
    </Badge>
  );
}
