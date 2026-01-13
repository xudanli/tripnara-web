import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReadinessStatus } from '@/types/readiness';
import {
  normalizeGateStatus,
  getGateStatusClasses,
  getGateStatusIcon,
  getGateStatusLabel,
} from '@/lib/gate-status';

interface ReadinessStatusBadgeProps {
  status: ReadinessStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function ReadinessStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: ReadinessStatusBadgeProps) {
  // 映射 ReadinessStatus 到 GateStatus
  const statusMap: Record<ReadinessStatus, string> = {
    ready: 'ALLOW',
    nearly: 'NEED_CONFIRM',
    'not-ready': 'REJECT',
  };

  // 标准化状态并使用设计 Token
  const gateStatus = normalizeGateStatus(statusMap[status]);
  const statusClasses = getGateStatusClasses(gateStatus);
  const StatusIcon = getGateStatusIcon(gateStatus);
  const label = getGateStatusLabel(gateStatus);
  
  const Icon = StatusIcon;
  const className = statusClasses;
  const iconClassName = ''; // 使用 Token 中的颜色
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 font-semibold',
        className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className={cn('h-4 w-4', iconClassName)} />}
      {label}
    </Badge>
  );
}


