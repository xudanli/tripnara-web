/**
 * 编排进度卡片（展示 ui_state 与 orchestrationResult）
 * 用于规划工作台、Agent 等场景，当后端返回编排数据时展示
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const ORCHESTRATION_PHASE_LABELS: Record<string, string> = {
  INTAKE: '接收请求',
  STATE_UPDATE: '状态更新',
  RESEARCH: '调研中',
  GATE_EVAL: '评估可行性',
  CONTEXT_BUILD: '构建上下文',
  PLAN_GEN: '生成行程',
  OPTIMIZE: '优化中',
  VERIFY: '验证中',
  COMPLIANCE: '合规检查',
  REPAIR: '修复中',
  NARRATE: '生成说明',
  FEEDBACK: '反馈处理',
  DONE: '已完成',
  FAILED: '失败',
  TIMEOUT: '超时',
  HALLUCINATION_DETECTION: '幻觉检测',
};

export interface OrchestrationUiState {
  phase?: string;
  ui_status?: string;
  progress_percent?: number;
  message?: string;
  requires_user_action?: boolean;
  current_step_detail?: string;
}

export interface OrchestrationResult {
  state?: any;
  itinerary?: any;
  gate_result?: {
    result?: string;
    reason?: string;
    warnings?: string[];
    [key: string]: any;
  };
  decision_log?: any[];
  decisionState?: any;
}

interface OrchestrationProgressCardProps {
  ui_state?: OrchestrationUiState | null;
  orchestrationResult?: OrchestrationResult | null;
}

export function OrchestrationProgressCard({
  ui_state,
  orchestrationResult,
}: OrchestrationProgressCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasUiState =
    ui_state &&
    (ui_state.phase ||
      ui_state.progress_percent != null ||
      ui_state.message ||
      ui_state.current_step_detail);
  const hasGateResult = orchestrationResult?.gate_result;
  const hasContent = hasUiState || hasGateResult;

  if (!hasContent) return null;

  const displayMessage = ui_state?.message ?? ui_state?.current_step_detail;
  const progress =
    ui_state?.progress_percent ?? (ui_state?.phase === 'DONE' ? 100 : undefined);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <ChevronRight
              className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')}
            />
            <span>
              {ui_state?.phase
                ? ORCHESTRATION_PHASE_LABELS[ui_state.phase] ?? ui_state.phase
                : '编排进度'}
              {progress != null && ` · ${progress}%`}
            </span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          {displayMessage && (
            <p className="text-muted-foreground">{displayMessage}</p>
          )}
          {progress != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>进度</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {hasGateResult && (
            <div className="border-t pt-2 mt-2">
              <div className="font-medium mb-1">Gate 评估</div>
              <div className="text-muted-foreground">
                {orchestrationResult?.gate_result?.reason ??
                  orchestrationResult?.gate_result?.result ??
                  '—'}
              </div>
              {orchestrationResult?.gate_result?.warnings &&
                orchestrationResult.gate_result.warnings.length > 0 && (
                  <ul className="mt-1 list-disc list-inside text-amber-600">
                    {orchestrationResult.gate_result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
