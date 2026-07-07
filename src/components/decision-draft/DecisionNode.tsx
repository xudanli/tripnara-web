/**
 * 决策节点组件
 * 显示决策步骤的卡片
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { Edit2, Brain } from 'lucide-react';
import type { DecisionStep, UserMode } from '@/types/decision-draft';
import { cn } from '@/lib/utils';
import { type GateStatus } from '@/lib/gate-status';

export interface DecisionNodeProps {
  step: DecisionStep;
  userMode: UserMode;
  selected?: boolean;
  highlighted?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
}

// 决策类型图标颜色映射（使用设计 Token）
const DECISION_TYPE_COLORS: Record<string, string> = {
  'transport-decision': 'text-muted-foreground dark:text-muted-foreground',
  'pace-decision': 'text-gate-allow-foreground dark:text-gate-allow-foreground',
  'poi-selection': 'text-muted-foreground dark:text-muted-foreground',
  'accommodation-decision': 'text-orange-600 dark:text-orange-400',
  'timing-decision': 'text-yellow-600 dark:text-yellow-400',
  'budget-decision': 'text-gate-reject-foreground dark:text-gate-reject-foreground',
  'safety-decision': 'text-pink-600 dark:text-pink-400',
  'preference-decision': 'text-muted-foreground dark:text-muted-foreground',
  'other': 'text-gray-600 dark:text-gray-400',
};

/**
 * 将 DecisionStepStatus 映射到 GateStatus
 */
function mapDecisionStatusToGateStatus(status: DecisionStep['status']): GateStatus {
  switch (status) {
    case 'approved':
      return 'ALLOW';
    case 'pending':
      return 'NEED_CONFIRM';
    case 'rejected':
      return 'REJECT';
    case 'modified':
      return 'SUGGEST_REPLACE';
    default:
      return 'NEED_CONFIRM';
  }
}

export default function DecisionNode({
  step,
  userMode,
  selected = false,
  highlighted = false,
  onClick,
  onEdit,
}: DecisionNodeProps) {
  const typeColor = DECISION_TYPE_COLORS[step.type] || DECISION_TYPE_COLORS.other;
  const gateStatus = mapDecisionStatusToGateStatus(step.status);

  return (
    <Card
      className={cn(
        'w-[200px] cursor-pointer transition-all hover:shadow-lg animate-in fade-in slide-in-from-bottom-2',
        selected && 'ring-2 ring-primary',
        highlighted && 'ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-950'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Brain className={cn('w-4 h-4', typeColor)} />
            <CardTitle className="text-sm font-semibold line-clamp-2">
              {step.title}
            </CardTitle>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* 使用 GateStatusBanner 显示裁决状态 */}
        <GateStatusBanner status={gateStatus} size="sm" />
        
        {/* 决策类型 */}
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {step.type.replace('-decision', '').replace('-', ' ')}
          </Badge>
        </div>

        {/* 置信度（Expert/Studio模式） */}
        {userMode !== 'toc' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">置信度:</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all bg-primary')}
                style={{ width: `${step.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium">
              {Math.round(step.confidence * 100)}%
            </span>
          </div>
        )}

        {/* 描述（Expert/Studio模式） */}
        {userMode !== 'toc' && step.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {step.description}
          </p>
        )}

        {/* 证据数量 */}
        {step.evidence.length > 0 && (
          <div className="text-xs text-muted-foreground">
            📎 {step.evidence.length} 条证据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
