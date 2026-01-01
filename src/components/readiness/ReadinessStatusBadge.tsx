import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessStatus } from '@/types/readiness';

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
  const config = {
    ready: {
      label: 'Ready',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800 border-green-200',
      iconClassName: 'text-green-600',
    },
    nearly: {
      label: 'Nearly',
      icon: AlertTriangle,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconClassName: 'text-yellow-600',
    },
    'not-ready': {
      label: 'Not Ready',
      icon: XCircle,
      className: 'bg-red-100 text-red-800 border-red-200',
      iconClassName: 'text-red-600',
    },
  };

  const { label, icon: Icon, className, iconClassName } = config[status];
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


