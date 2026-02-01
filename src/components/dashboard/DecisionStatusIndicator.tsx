/**
 * 决策状态指示器组件
 * 显示决策状态：ALLOW（已通过）、NEED_ADJUST（需要调整）、REJECT（已拒绝）
 */

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DecisionStatus = 'ALLOW' | 'NEED_ADJUST' | 'REJECT';

interface DecisionStatusIndicatorProps {
  status: DecisionStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  ALLOW: {
    label: '已通过',
    icon: CheckCircle,
    variant: 'default' as const,
    // 使用中性色背景，通过图标和描边表达状态
    className: 'bg-slate-50 text-slate-700 border-slate-300',
    iconClassName: 'text-slate-600',
  },
  NEED_ADJUST: {
    label: '需要调整',
    icon: AlertTriangle,
    variant: 'secondary' as const,
    // 使用中性色背景，通过图标表达状态
    className: 'bg-slate-50 text-slate-700 border-slate-300',
    iconClassName: 'text-amber-600',
  },
  REJECT: {
    label: '已拒绝',
    icon: XCircle,
    variant: 'destructive' as const,
    // 使用中性色背景，通过图标表达状态
    className: 'bg-slate-50 text-slate-700 border-slate-300',
    iconClassName: 'text-slate-600',
  },
};

const sizeConfig = {
  sm: {
    iconSize: 'w-4 h-4',
    textSize: 'text-xs',
    padding: 'px-2 py-1',
  },
  md: {
    iconSize: 'w-5 h-5',
    textSize: 'text-sm',
    padding: 'px-3 py-1.5',
  },
  lg: {
    iconSize: 'w-6 h-6',
    textSize: 'text-base',
    padding: 'px-4 py-2',
  },
};

export default function DecisionStatusIndicator({
  status,
  size = 'md',
  showLabel = true,
  className,
}: DecisionStatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeStyles = sizeConfig[size];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 border',
        config.className,
        sizeStyles.padding,
        className
      )}
    >
      <Icon className={cn(sizeStyles.iconSize, config.iconClassName)} />
      {showLabel && (
        <span className={cn('font-medium', sizeStyles.textSize)}>
          {config.label}
        </span>
      )}
    </Badge>
  );
}
