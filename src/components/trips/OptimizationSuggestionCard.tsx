/**
 * 优化建议卡片 - 规划 Tab 插画风格
 * 设计：左侧彩色竖条 | 标题 | 指标行 | 高优先级标签 | 描述 | 采纳建议 + 忽略
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Suggestion } from '@/types/suggestion';
import { Badge } from '@/components/ui/badge';
import {
  personaSuggestionReasonCodesDebugEnabled,
  stripPersonaMessageTechnicalTail,
  shouldHideOptimizationSuggestionActions,
  formatReasonCodesDisplayZh,
} from '@/lib/persona-alert-display';

export interface SuggestionMetrics {
  label: string;
  value: string; // e.g. "+5", "-2", "+$50"
}

export interface OptimizationSuggestionCardProps {
  suggestion: Suggestion;
  metrics?: SuggestionMetrics[];
  highPriority?: boolean;
  onApply?: (suggestion: Suggestion) => void;
  onDismiss?: (suggestion: Suggestion) => void;
  onClick?: (suggestion: Suggestion) => void;
  onActionClick?: (suggestion: Suggestion, actionId: string) => void;
}

const PERSONA_ACCENT = {
  abu: 'bg-muted/150',
  drdre: 'bg-muted/150',
  neptune: 'bg-gate-allow-foreground',
  user_action: 'bg-slate-500',
} as const;

const STATUS_LABEL: Record<string, string> = {
  new: 'NEW',
  seen: 'SEEN',
  applied: 'APPLIED',
  dismissed: 'DISMISSED',
};

/** 从 metadata 推导指标（可选） */
function deriveMetrics(suggestion: Suggestion): SuggestionMetrics[] {
  const m: SuggestionMetrics[] = [];
  const meta = suggestion.metadata;
  if (!meta) return m;

  if (meta.riskLevel && suggestion.persona === 'abu') {
    m.push({
      label: '安全评分',
      value: meta.riskLevel === 'high' ? '-5' : meta.riskLevel === 'medium' ? '-2' : '+3',
    });
  }
  if (meta.metricType === 'fatigue' && suggestion.persona === 'drdre') {
    const delta = meta.currentValue != null && meta.threshold != null
      ? Math.round((meta.threshold - meta.currentValue) * 10) : 0;
    m.push({ label: '节奏评分', value: delta >= 0 ? `+${delta}` : `${delta}` });
  }
  if (meta.repairType && suggestion.persona === 'neptune') {
    m.push({ label: '修复评分', value: '+4' });
  }
  return m;
}

export function OptimizationSuggestionCard({
  suggestion,
  metrics: propMetrics,
  highPriority = suggestion.severity === 'blocker',
  onApply,
  onDismiss,
  onClick,
  onActionClick,
}: OptimizationSuggestionCardProps) {
  const [open, setOpen] = useState(true);
  const accent = PERSONA_ACCENT[suggestion.persona] ?? 'bg-gray-500';
  const metrics = propMetrics ?? deriveMetrics(suggestion);

  const title = suggestion.title || suggestion.summary || '无描述';
  const description = stripPersonaMessageTechnicalTail(
    suggestion.description || suggestion.summary || ''
  );

  const hideSuggestActions =
    shouldHideOptimizationSuggestionActions(suggestion.metadata?.reasonCodes) ||
    suggestion.persona === 'user_action';

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const applyAction = suggestion.actions.find(
      (a) => a.type === 'apply' || a.label.includes('采纳') || a.label.includes('应用') || a.label.includes('调整') || a.label.includes('修复')
    );
    if (applyAction) {
      onActionClick?.(suggestion, applyAction.id);
    } else {
      onApply?.(suggestion);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(suggestion);
      return;
    }
    const dismissAction = suggestion.actions.find((a) => a.type === 'dismiss' || a.id === 'dismiss');
    if (dismissAction) {
      onActionClick?.(suggestion, dismissAction.id);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'rounded-lg border bg-white shadow-sm overflow-hidden',
          onClick && 'cursor-pointer hover:shadow-md transition-shadow'
        )}
        onClick={() => onClick?.(suggestion)}
      >
        <div className="flex">
          {/* 左侧彩色竖条 */}
          <div className={cn('w-1 flex-shrink-0', accent)} />

          <div className="flex-1 min-w-0 p-3 sm:p-4">
            {/* 标题行：标题 + 高优先级标签 + 折叠图标 */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 flex-1">
                {title}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                {suggestion.status ? (
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABEL[suggestion.status] ?? String(suggestion.status).toUpperCase()}
                  </Badge>
                ) : null}
                {highPriority && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted/15 text-muted-foreground">
                    高优先级
                  </span>
                )}
                <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={open ? '收起' : '展开'}
                  >
                    {open ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* 指标行 */}
            {metrics.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                {metrics.map((metric, i) => (
                  <span key={i}>
                    {metric.label} {metric.value}
                    {i < metrics.length - 1 ? ' | ' : ''}
                  </span>
                ))}
              </div>
            )}

            <CollapsibleContent>
              {/* 描述 */}
              {description && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  {description}
                </p>
              )}

              {personaSuggestionReasonCodesDebugEnabled() &&
                suggestion.metadata?.reasonCodes &&
                suggestion.metadata.reasonCodes.length > 0 && (
                  <details className="mt-2 rounded border border-dashed border-muted-foreground/30 bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
                    <summary className="cursor-pointer select-none text-[10px]">
                      metadata.reasonCodes（调试）
                    </summary>
                    <p className="mt-1 text-[10px]">{formatReasonCodesDisplayZh(suggestion.metadata.reasonCodes)}</p>
                    <p className="mt-1 break-all font-mono opacity-80">
                      {suggestion.metadata.reasonCodes.join(', ')}
                    </p>
                  </details>
                )}

              {/* 管线/审计类：不展示采纳与忽略 */}
              {hideSuggestActions ? (
                <p className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  此为编排或系统记录类条目，无需采纳或忽略。
                </p>
              ) : (
              <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="default"
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleApply}
                >
                  采纳建议
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-300"
                  onClick={handleDismiss}
                >
                  忽略
                </Button>
              </div>
              )}
            </CollapsibleContent>
          </div>
        </div>
      </div>
    </Collapsible>
  );
}
