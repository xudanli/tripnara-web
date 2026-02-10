/**
 * 规划Tab - 顶部操作区组件
 * 包含健康度展示和关键操作按钮
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HealthBar from '@/components/trips/HealthBar';
import ComplianceRulesCard from '@/components/trips/ComplianceRulesCard';
import PersonaModeToggle, { type PersonaMode } from '@/components/common/PersonaModeToggle';
import { Plus, Sparkles, Compass, Info } from 'lucide-react';

interface PlanTopActionsProps {
  healthMetrics: {
    executable: number;
    buffer: number;
    risk: number;
    cost: number;
  };
  hasTripItems: boolean;
  suggestions: Array<{ severity: string }>;
  tripStatus: string;
  tripId: string;
  countryCodes: string[];
  viewMode?: PersonaMode; // 🆕 视图模式
  onViewModeChange?: (mode: PersonaMode) => void; // 🆕 视图模式变更回调
  onMetricClick?: (metricName: 'schedule' | 'budget' | 'pace' | 'feasibility') => void;
  onAddItem?: () => void;
  onAutoOptimize?: () => void;
  onNavigateToPlanStudio?: () => void;
}

export default function PlanTopActions({
  healthMetrics,
  hasTripItems,
  suggestions,
  tripStatus,
  tripId,
  countryCodes,
  viewMode,
  onViewModeChange,
  onMetricClick,
  onAddItem,
  onAutoOptimize,
  onNavigateToPlanStudio,
}: PlanTopActionsProps) {
  const highPrioritySuggestions = suggestions.filter(s => s.severity === 'blocker');

  return (
    <div className="sticky top-0 z-10 bg-white border-b shadow-sm p-4 mb-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* 左侧：健康度概览（桌面端60%，移动端100%） */}
        <div className="flex-1 w-full lg:max-w-[60%]">
          {hasTripItems ? (
            <HealthBar
              executable={healthMetrics.executable}
              buffer={healthMetrics.buffer}
              risk={healthMetrics.risk}
              cost={healthMetrics.cost}
              onMetricClick={onMetricClick}
            />
          ) : (
            <div className="text-center text-xs text-muted-foreground/60 py-4">
              <Info className="w-3 h-3 mx-auto mb-1 opacity-40" />
              <p className="opacity-60">等待添加行程项</p>
            </div>
          )}
        </div>

        {/* 中间：合规性检查（桌面端30%，移动端隐藏） */}
        <div className="hidden md:flex flex-1 max-w-[30%]">
          {countryCodes.length > 0 && (
            <ComplianceRulesCard
              tripId={tripId}
              countryCodes={countryCodes}
              ruleTypes={['VISA', 'TRANSPORT', 'ENTRY']}
            />
          )}
        </div>

        {/* 右侧：操作按钮（桌面端10%，移动端100%） */}
        <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-1 lg:max-w-[10%] lg:justify-end">
          {/* 🆕 视图模式切换 - 只在规划中状态显示 */}
          {tripStatus !== 'CANCELLED' && viewMode !== undefined && onViewModeChange && (
            <PersonaModeToggle value={viewMode} onChange={onViewModeChange} />
          )}

          {/* + 添加行程按钮 */}
          {tripStatus !== 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddItem}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">添加行程</span>
            </Button>
          )}

          {/* Auto 综合优化按钮 */}
          {tripStatus === 'PLANNING' && hasTripItems && (
            <Button
              onClick={onAutoOptimize}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
              disabled={highPrioritySuggestions.length === 0}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Auto 综合</span>
              {highPrioritySuggestions.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {highPrioritySuggestions.length}
                </Badge>
              )}
            </Button>
          )}

          {/* 进入规划工作台按钮 */}
          {tripStatus === 'PLANNING' && onNavigateToPlanStudio && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToPlanStudio}
              className="hidden lg:flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span className="hidden xl:inline">规划工作台</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
