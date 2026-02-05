/**
 * Day 行程卡片组件
 * 优化后的卡片式布局，提高识别与可读性
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SuggestionBadge } from '@/components/trips/SuggestionBadge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { MapPin, AlertTriangle, ArrowRight, Lightbulb, Plus, Luggage, Target, Sparkles, HelpCircle, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TripDay, DayMetricsResponse } from '@/types/trip';
import type { Suggestion } from '@/types/suggestion';
import { tripsApi } from '@/api/trips';
import type { BudgetDetailsResponse } from '@/types/trip';
import { formatCurrency as formatCurrencyAmount } from '@/utils/format';
import { EmptyStateCard } from '@/components/ui/empty-state-images';

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
  tripId?: string; // 用于获取预算数据
  onViewBudget?: () => void; // 查看预算详情回调
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
  tripId,
  onViewBudget,
}: DayItineraryCardProps) {
  const [dayBudget, setDayBudget] = useState<{ spent: number; budget: number } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);
  const [expanded, setExpanded] = useState(false); // 展开/收起状态

  useEffect(() => {
    if (tripId && day.date) {
      loadDayBudget();
    }
  }, [tripId, day.date]);

  const loadDayBudget = async () => {
    if (!tripId || !day.date) return;
    try {
      setLoadingBudget(true);
      const details = await tripsApi.getBudgetDetails(tripId, {
        startDate: day.date,
        endDate: day.date,
        limit: 100,
        offset: 0,
      });
      
      // 计算当日支出
      const spent = details.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      
      // 获取预算约束以计算日均预算
      try {
        const constraint = await tripsApi.getBudgetConstraint(tripId);
        const totalBudget = constraint.budgetConstraint.total || 0;
        const dailyBudget = constraint.budgetConstraint.dailyBudget || (totalBudget / (dayIndex + 1)); // 简单估算
        setDayBudget({ spent, budget: dailyBudget });
      } catch {
        // 如果没有预算约束，只显示已支出
        setDayBudget({ spent, budget: 0 });
      }
    } catch (err) {
      console.error('Failed to load day budget:', err);
    } finally {
      setLoadingBudget(false);
    }
  };
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
            {/* P0 - 主要信息：Day 和日期（更大字体，更明显） */}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl font-bold text-foreground">Day {dayIndex + 1}</div>
              <div className="text-base text-muted-foreground font-medium">
                {format(new Date(day.date), 'yyyy.MM.dd')}
              </div>
            </div>
            {/* P1 - 次要信息：当天主题（中等字体） */}
            {day.theme && (
              <div className="text-sm font-medium text-muted-foreground mb-3">
                {day.theme}
              </div>
            )}
            
            {/* P1 - 次要信息：行程项数量和建议徽章 */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className="gap-1 text-xs font-medium">
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

            {/* P2 - 辅助信息：每日预算概览（展开时显示） */}
            {expanded && dayBudget && dayBudget.budget > 0 && (() => {
              const usagePercent = Math.min((dayBudget.spent / dayBudget.budget) * 100, 100);
              const isOverBudget = dayBudget.spent > dayBudget.budget;
              const statusColor = isOverBudget ? 'budget-critical' : usagePercent >= 80 ? 'budget-warning' : 'budget-safe';
              const textColor = isOverBudget ? 'text-budget-critical-foreground' : usagePercent >= 80 ? 'text-budget-warning-foreground' : 'text-budget-safe-foreground';
              const borderColor = isOverBudget ? 'border-red-200' : usagePercent >= 80 ? 'border-yellow-200' : 'border-green-200';
              
              return (
                <div className={cn('mb-3 p-3 bg-muted/30 rounded-lg border-2', borderColor)}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Wallet className="w-3.5 h-3.5" />
                      当日预算
                    </span>
                    <span className={cn('font-bold text-sm', textColor)}>
                      {formatCurrencyAmount(dayBudget.spent, 'CNY')} / {formatCurrencyAmount(dayBudget.budget, 'CNY')}
                    </span>
                  </div>
                  <Progress
                    value={usagePercent}
                    className={cn('h-2 mb-2', {
                      'bg-budget-safe/20': statusColor === 'budget-safe',
                      'bg-budget-warning/20': statusColor === 'budget-warning',
                      'bg-budget-critical/20': statusColor === 'budget-critical',
                    })}
                  />
                  {isOverBudget && onViewBudget && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-1 h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={onViewBudget}
                    >
                      查看预算详情
                    </Button>
                  )}
                </div>
              );
            })()}
            
            {/* 展开/收起按钮（有行程项时显示） */}
            {day.ItineraryItem.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 h-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    收起详情
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    展开详情
                  </>
                )}
              </Button>
            )}
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
              <div className={cn('px-4 py-2 rounded-lg text-right border-2', healthStatus.bg, {
                'border-green-200': healthScore >= 80,
                'border-yellow-200': healthScore >= 60 && healthScore < 80,
                'border-red-200': healthScore < 60,
              })}>
                <div className="text-xs text-muted-foreground mb-1 font-medium">健康指数</div>
                <div className={cn('text-lg font-bold', healthStatus.color)}>
                  {healthScore >= 80 ? '✅' : healthScore >= 60 ? '⚠️' : '❌'} {healthStatus.label}
                </div>
                <div className={cn('text-xs font-semibold mt-0.5', healthStatus.color)}>
                  {healthScore}%
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
            <EmptyStateCard
              type="no-itinerary-items"
              title="暂无行程项"
              description="一个行程项可以是景点、美食、住宿或交通。试着添加第一站吧！"
              imageWidth={120}
              imageHeight={120}
              className="py-4"
              action={
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

                {/* 帮助提示 */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>不确定从哪开始？试试从热门景点添加吧</span>
                </div>
              </div>
              }
            />
          </div>
        ) : (
          <>
            {/* P2 - 辅助信息：指标横向条（展开时显示） */}
            {expanded && (
              <>
                {dayMetrics ? (
                  <div className="flex items-center gap-4 flex-wrap mb-4 p-3 bg-muted/20 rounded-lg border border-border/50">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-base">🚶</span>
                      <span className="font-medium text-muted-foreground">步行：</span>
                      <span className="font-semibold text-foreground">{dayMetrics.metrics.walk.toFixed(1)}km</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-base">🚗</span>
                      <span className="font-medium text-muted-foreground">车程：</span>
                      <span className="font-semibold text-foreground">{Math.round(dayMetrics.metrics.drive)}min</span>
                    </div>
                    {pacing && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-base">{pacing.icon}</span>
                        <span className="font-medium text-muted-foreground">节奏：</span>
                        <span className="font-semibold text-foreground">{pacing.label}</span>
                      </div>
                    )}
                    <div className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold', riskColor)}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>冲突：</span>
                      <span>{dayConflicts.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-muted/20 rounded-lg border border-border/50 text-xs text-muted-foreground text-center">
                    加载指标中...
                  </div>
                )}

                {/* P1 - 次要信息：操作按钮（展开时显示） */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onViewItinerary}
                    className="flex-1 font-medium"
                  >
                    <ArrowRight className="w-4 h-4 mr-1" />
                    查看行程
                  </Button>
                  {(abuCount > 0 || drdreCount > 0 || neptuneCount > 0) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={onViewSuggestions}
                      className="flex-1 font-semibold bg-primary hover:bg-primary/90"
                    >
                      <Lightbulb className="w-4 h-4 mr-1" />
                      查看建议
                      {(abuCount + drdreCount + neptuneCount) > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                          {abuCount + drdreCount + neptuneCount}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

