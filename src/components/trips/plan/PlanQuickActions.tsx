/**
 * 规划Tab - 快速操作面板组件
 * 显示快速操作按钮（进入规划工作台、批量优化等）
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Compass, Sparkles } from 'lucide-react';

interface PlanQuickActionsProps {
  tripStatus: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  onNavigateToPlanStudio?: () => void;
  onAutoOptimize?: () => void;
  hasHighPrioritySuggestions?: boolean;
  disabled?: boolean;
}

export default function PlanQuickActions({
  tripStatus,
  onNavigateToPlanStudio,
  onAutoOptimize,
  hasHighPrioritySuggestions = false,
  disabled = false,
}: PlanQuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">快速操作</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 进入规划工作台按钮（仅规划中状态） */}
        {tripStatus === 'PLANNING' && onNavigateToPlanStudio && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onNavigateToPlanStudio}
            disabled={disabled}
          >
            <Compass className="w-4 h-4 mr-2" />
            进入规划工作台
          </Button>
        )}

        {/* Auto综合优化按钮（如果有高优先级建议） */}
        {hasHighPrioritySuggestions && onAutoOptimize && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onAutoOptimize}
            disabled={disabled}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Auto 综合优化
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
