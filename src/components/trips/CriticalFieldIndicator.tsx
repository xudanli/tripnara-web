/**
 * Critical 字段标识组件
 * 用于标记 Critical 字段（安全相关的关键问题）
 */

import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CriticalFieldIndicatorProps {
  isCritical?: boolean;
  required?: boolean;
  className?: string;
}

export default function CriticalFieldIndicator({
  isCritical,
  required,
  className,
}: CriticalFieldIndicatorProps) {
  if (!isCritical && !required) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {isCritical ? (
        <>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-xs text-red-600 font-medium">
            必填（安全相关）
          </span>
        </>
      ) : required ? (
        <span className="text-xs text-red-500">*</span>
      ) : null}
    </div>
  );
}
