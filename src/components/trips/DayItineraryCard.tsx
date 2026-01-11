/**
 * Day 行程卡片组件
 * 优化后的卡片式布局，提高识别与可读性
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SuggestionBadge } from '@/components/trips/SuggestionBadge';
import { format } from 'date-fns';
import { MapPin, AlertTriangle, ArrowRight, Lightbulb, Plus, Luggage, Target, Sparkles, Compass, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripDay, DayMetricsResponse } from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';

interface DayItineraryCardProps {
  day: TripDay;
  dayIndex: number;
  dayMetrics?: DayMetricsResponse;
  suggestions: Suggestion[];
  onViewItinerary?: () => void;
  onViewSuggestions?: () => void;
  onAddItem?: () => void;
  onQuickPlan?: () => void;
  onViewRecommendations?: () => void;
  className?: string;
}

export default function DayItineraryCard({
  day,
  dayIndex,
  dayMetrics,
  suggestions,
  onViewItinerary,
  onViewSuggestions,
  onAddItem,
  onQuickPlan,
  onViewRecommendations,
  className,
}: DayItineraryCardProps) {
  const daySuggestions = suggestions.filter(
    (s) => s.scope === 'day' && s.scopeId === day.id
  );
  const abuCount = daySuggestions.filter((s) => s.persona === 'abu').length;
  const drdreCount = daySuggestions.filter((s) => s.persona === 'drdre').length;
  const neptuneCount = daySuggestions.filter((s) => s.persona === 'neptune').length;

  // 计算健康状态
  const healthScore = dayMetrics
    ? Math.round(
        ((dayMetrics.metrics.buffer / 60) * 40 + // 缓冲时间占比（最多40分）
          (1 - Math.min(dayMetrics.conflicts.length / 5, 1)) * 40 + // 冲突数量（最多40分）
          (dayMetrics.metrics.walk < 10 ? 1 : 0.5) * 20) // 步行距离（最多20分）
      )
    : null;

  const healthStatus = healthScore
    ? healthScore >= 80
      ? { label: '可执行', color: 'text-green-600', bg: 'bg-green-50' }
      : healthScore >= 60
      ? { label: '需注意', color: 'text-yellow-600', bg: 'bg-yellow-50' }
      : { label: '有风险', color: 'text-red-600', bg: 'bg-red-50' }
    : null;

  // 风险等级
  const dayConflicts = dayMetrics?.conflicts || [];
  const hasHighRisk = dayConflicts.some((c) => c.severity === 'HIGH');
  const hasMediumRisk = dayConflicts.some((c) => c.severity === 'MEDIUM');
  // const riskLevel = hasHighRisk ? '高' : hasMediumRisk ? '中' : '低'; // 未使用
  const riskColor = hasHighRisk
    ? 'text-red-600 bg-red-50'
    : hasMediumRisk
    ? 'text-yellow-600 bg-yellow-50'
    : 'text-green-600 bg-green-50';

  // 节奏判断
  const getPacingLabel = () => {
    if (!dayMetrics) return null;
    const totalTime = dayMetrics.metrics.walk + dayMetrics.metrics.drive + dayMetrics.metrics.buffer;
    const itemCount = day.ItineraryItem.length;
    const avgTimePerItem = totalTime / (itemCount || 1);
    
    if (avgTimePerItem < 60) return { label: '快', icon: '⚡' };
    if (avgTimePerItem < 120) return { label: '适中', icon: '🚶' };
    return { label: '慢', icon: '🐢' };
  };

  const pacing = getPacingLabel();

  return (
    <Card className={cn('border-l-4 border-l-primary hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* 左侧：Day 和日期 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-2xl font-bold">Day {dayIndex + 1}</div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(day.date), 'yyyy.MM.dd')}
              </div>
            </div>
            
            {/* 行程项数量 Badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                共 {day.ItineraryItem.length} 个行程项
              </Badge>
              {(abuCount > 0 || drdreCount > 0 || neptuneCount > 0) && (
                <div className="flex gap-1.5">
                  <SuggestionBadge
                    persona="abu"
                    count={abuCount}
                    onClick={onViewSuggestions}
                  />
                  <SuggestionBadge
                    persona="drdre"
                    count={drdreCount}
                    onClick={onViewSuggestions}
                  />
                  <SuggestionBadge
                    persona="neptune"
                    count={neptuneCount}
                    onClick={onViewSuggestions}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 右侧：健康状态摘要 或 空状态时的主按钮 */}
          {day.ItineraryItem.length === 0 && onAddItem ? (
            <Button
              size="sm"
              onClick={onAddItem}
              className="shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              添加第一个行程项
            </Button>
          ) : day.ItineraryItem.length === 0 ? (
            // ✅ 只有当有回调时才显示按钮
            (onAddItem || onViewItinerary) ? (
              <Button
                size="sm"
                onClick={onAddItem || onViewItinerary}
                className="shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加第一个行程项
              </Button>
            ) : null
          ) : (
            healthStatus && healthScore !== null && (
              <div className={cn('px-3 py-1.5 rounded-lg text-right', healthStatus.bg)}>
                <div className="text-xs text-muted-foreground mb-0.5">健康指数</div>
                <div className={cn('text-sm font-semibold', healthStatus.color)}>
                  ✅ {healthStatus.label} {healthScore}%
                </div>
              </div>
            )
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* ✅ 空状态：当没有行程项时显示友好提示和引导 */}
        {day.ItineraryItem.length === 0 ? (
          <div className="mb-4 py-8 px-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-dashed border-gray-200">
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* 图标 */}
              <div className="p-3 rounded-full bg-gray-100">
                <Luggage className="w-6 h-6 text-gray-400" />
              </div>
              
              {/* 主文案 */}
              <div className="text-center space-y-2 max-w-sm">
                <p className="text-sm font-medium text-gray-700">暂无行程项</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  一个行程项可以是景点、美食、住宿或交通。试着添加第一站吧！
                </p>
              </div>

              {/* 主要操作按钮组 */}
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {/* 主按钮：优先显示添加按钮，如果有快速规划则显示快速规划 */}
                {onAddItem ? (
                  <Button
                    size="sm"
                    onClick={onAddItem}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加行程项
                  </Button>
                ) : onQuickPlan ? (
                  <Button
                    size="sm"
                    onClick={onQuickPlan}
                    className="w-full"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    快速规划一天行程
                  </Button>
                ) : onViewItinerary ? (
                  <Button
                    size="sm"
                    onClick={onViewItinerary}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加行程项
                  </Button>
                ) : null}

                {/* 次要操作按钮 */}
                <div className="flex gap-2">
                  {onViewRecommendations && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onViewRecommendations}
                      className="flex-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      热门推荐
                    </Button>
                  )}
                  {onQuickPlan && onAddItem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onQuickPlan}
                      className="flex-1"
                    >
                      <Target className="w-3.5 h-3.5 mr-1.5" />
                      快速规划
                    </Button>
                  )}
                </div>
              </div>

              {/* 帮助提示 */}
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>不确定从哪开始？试试从热门景点添加吧</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 指标横向条 */}
            {dayMetrics ? (
              <div className="flex items-center gap-3 flex-wrap mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs">
                  <span>🚶</span>
                  <span className="font-medium">步行：</span>
                  <span>{dayMetrics.metrics.walk.toFixed(1)}km</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span>🚗</span>
                  <span className="font-medium">车程：</span>
                  <span>{Math.round(dayMetrics.metrics.drive)}min</span>
                </div>
                {pacing && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>{pacing.icon}</span>
                    <span className="font-medium">节奏：</span>
                    <span>{pacing.label}</span>
                  </div>
                )}
                <div className={cn('flex items-center gap-1.5 text-xs px-2 py-0.5 rounded', riskColor)}>
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium">冲突：</span>
                  <span>{dayConflicts.length}</span>
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs text-muted-foreground text-center">
                加载指标中...
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onViewItinerary}
                className="flex-1"
              >
                <ArrowRight className="w-4 h-4 mr-1" />
                查看行程
              </Button>
              {(abuCount > 0 || drdreCount > 0 || neptuneCount > 0) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onViewSuggestions}
                  className="flex-1"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  查看建议
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

