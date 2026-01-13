/**
 * GateStatusBanner - 裁决状态条组件
 * 
 * TripNARA 核心组件：用于显示四态裁决结果
 * - ALLOW: 通过
 * - NEED_CONFIRM: 需确认
 * - SUGGEST_REPLACE: 建议替换
 * - REJECT: 拒绝
 */

import { cn } from '@/lib/utils';
import {
  getGateStatusClasses,
  getGateStatusIcon,
  getGateStatusLabel,
  normalizeGateStatus,
  type GateStatus,
} from '@/lib/gate-status';

export interface GateStatusBannerProps {
  /**
   * 决策状态（支持旧状态自动映射）
   */
  status: GateStatus | string;
  /**
   * 可选的消息文本
   */
  message?: string;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  /**
   * 尺寸
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * GateStatusBanner 组件
 * 
 * 用于在 Banner、Card、Timeline、Log 等位置显示裁决状态
 */
export function GateStatusBanner({
  status,
  message,
  className,
  showIcon = true,
  size = 'md',
}: GateStatusBannerProps) {
  // 标准化状态（支持旧状态映射）
  const normalizedStatus = normalizeGateStatus(status);
  
  // 获取状态配置
  const Icon = getGateStatusIcon(normalizedStatus);
  const label = getGateStatusLabel(normalizedStatus);
  const statusClasses = getGateStatusClasses(normalizedStatus);
  
  // 尺寸样式
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  
  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border font-medium transition-colors',
        statusClasses,
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label={`决策状态: ${label}`}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      <span>{label}</span>
      {message && (
        <span className="opacity-90 font-normal ml-1">{message}</span>
      )}
    </div>
  );
}
