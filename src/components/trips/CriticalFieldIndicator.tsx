/**
 * Critical 字段标识组件
 * 用于标记 Critical 字段（安全相关的关键问题）
 * 🆕 P4: 添加解释提示（Tooltip），说明为什么需要这个信息
 */

import { AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CriticalFieldIndicatorProps {
  isCritical?: boolean;
  required?: boolean;
  className?: string;
  /**
   * 🆕 P4: 自定义解释文本
   * 如果未提供，使用默认解释
   */
  explanation?: string;
}

export default function CriticalFieldIndicator({
  isCritical,
  required,
  className,
  explanation,
}: CriticalFieldIndicatorProps) {
  if (!isCritical && !required) {
    return null;
  }

  // 🆕 P4: 默认解释文本（符合认知科学中的"上下文帮助"原则）
  const defaultExplanation = isCritical
    ? '这是安全相关的关键信息，必须填写才能继续创建行程。这些信息帮助我们评估行程的安全性和可行性，确保您的旅行安全。'
    : '这是必填信息，需要填写才能继续。';

  const explanationText = explanation || defaultExplanation;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 cursor-help', className)}>
            {isCritical ? (
              <>
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-600 font-medium">
                  必填（安全相关）
                </span>
                <HelpCircle className="h-3 w-3 text-red-500 opacity-70" />
              </>
            ) : required ? (
              <span className="text-xs text-red-500">*</span>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-slate-900 text-white text-xs leading-relaxed p-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>为什么需要这个信息？</span>
            </div>
            <p>{explanationText}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
