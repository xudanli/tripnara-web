/**
 * BudgetProgress - 预算进度条组件
 * 
 * 显示预算使用情况，支持预警阈值展示
 * 设计原则：Clarity over Charm - 清晰展示预算状态
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

export interface BudgetProgressProps {
  /** 已使用/预计支出金额 */
  spent: number;
  /** 总预算 */
  total: number;
  /** 预警阈值（0-1），默认 0.8 */
  alertThreshold?: number;
  /** 货币单位 */
  currency?: string;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 标签文字 */
  label?: string;
}

type BudgetStatus = 'normal' | 'warning' | 'danger';

export function BudgetProgress({
  spent,
  total,
  alertThreshold = 0.8,
  currency = 'CNY',
  showDetails = true,
  className,
  label = '预算使用情况',
}: BudgetProgressProps) {
  // 计算使用百分比和状态
  const { percentage, status, remaining } = useMemo(() => {
    const pct = total > 0 ? (spent / total) * 100 : 0;
    const remaining = total - spent;
    
    let status: BudgetStatus = 'normal';
    if (pct >= 100) {
      status = 'danger';
    } else if (pct >= alertThreshold * 100) {
      status = 'warning';
    }
    
    return { percentage: Math.min(pct, 100), status, remaining };
  }, [spent, total, alertThreshold]);

  // 状态对应的样式和图标
  const statusConfig = {
    normal: {
      progressClass: 'bg-primary',
      bgClass: 'bg-muted',
      textClass: 'text-foreground',
      icon: CheckCircle2,
      iconClass: 'text-green-600',
    },
    warning: {
      progressClass: 'bg-amber-500',
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-700',
      icon: AlertTriangle,
      iconClass: 'text-amber-600',
    },
    danger: {
      progressClass: 'bg-destructive',
      bgClass: 'bg-red-100',
      textClass: 'text-red-700',
      icon: XCircle,
      iconClass: 'text-red-600',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <StatusIcon className={cn('w-4 h-4', config.iconClass)} />
          {label}
        </span>
        <span className={cn('text-sm font-semibold', config.textClass)}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      {/* 进度条 */}
      <div className="relative">
        <Progress 
          value={percentage} 
          className={cn('h-2', config.bgClass)}
        />
        
        {/* 预警阈值标记线 */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-amber-600 opacity-60"
          style={{ left: `${alertThreshold * 100}%` }}
          title={`预警线 ${(alertThreshold * 100).toFixed(0)}%`}
        />
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatCurrency(spent, currency)} / {formatCurrency(total, currency)}
          </span>
          <span className={cn(
            remaining < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'
          )}>
            {remaining >= 0 
              ? `剩余 ${formatCurrency(remaining, currency)}`
              : `超支 ${formatCurrency(Math.abs(remaining), currency)}`
            }
          </span>
        </div>
      )}

      {/* 预警提示 */}
      {status === 'warning' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
          <AlertTriangle className="w-3 h-3" />
          <span>已达到预警阈值 ({(alertThreshold * 100).toFixed(0)}%)</span>
        </div>
      )}
      
      {status === 'danger' && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          <XCircle className="w-3 h-3" />
          <span>预算已超支，建议调整方案</span>
        </div>
      )}
    </div>
  );
}

export default BudgetProgress;
