/**
 * Auto 综合视图
 * 整合 Abu、Dr.Dre、Neptune 三个视角的关键信息
 */

import { useState, useMemo } from 'react';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity,
  RefreshCw,
  Eye,
  Compass,
  Plus,
  Target,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyStateCard } from '@/components/ui/empty-state-images';
import { getPersonaIconColorClasses, getPersonaBackgroundClasses } from '@/lib/persona-colors';
import AbuView from './AbuView';
import DrDreView from './DrDreView';
import NeptuneView from './NeptuneView';
import type { 
  OverallMetrics, 
  AbuViewData, 
  DrDreViewData, 
  NeptuneViewData 
} from '@/utils/trip-data-extractors';
import { Spinner } from '@/components/ui/spinner';

interface AutoViewProps {
  trip: TripDetail;
  overallMetrics: OverallMetrics | null;
  abuData: AbuViewData | null;
  drDreData: DrDreViewData | null;
  neptuneData: NeptuneViewData | null;
  onItemClick?: (item: ItineraryItem) => void;
  onNavigateToPlanStudio?: () => void;
  onAddItem?: () => void; // ✅ 添加行程项回调
  onRepairApplied?: () => void; // 🆕 修复应用后的回调
  onAlternativeApplied?: () => void; // 🆕 替代方案应用后的回调
}

export default function AutoView({ 
  trip, 
  overallMetrics, 
  abuData, 
  drDreData, 
  neptuneData,
  onItemClick,
  onNavigateToPlanStudio,
  onAddItem,
  onRepairApplied,
  onAlternativeApplied
}: AutoViewProps) {
  const [isExpanded, setIsExpanded] = useState(false); // ✅ 控制综合视图展开/折叠
  const [expandedView, setExpandedView] = useState<'abu' | 'dre' | 'neptune' | null>(null); // ✅ 控制哪个视角的详细视图展开

  // 使用默认值，如果数据未加载完成
  const metrics = overallMetrics || {
    safetyScore: 0,
    rhythmScore: 0,
    readinessScore: 0,
    criticalIssues: 0,
    warnings: 0,
    drDreWarnings: 0,
    suggestions: 0,
  };

  // 从 abuData 中提取关键问题
  const criticalIssues = useMemo(() => {
    if (!abuData) return [];
    return abuData.alerts
      .filter(alert => alert.severity === 'warning')
      .map(alert => ({
        id: alert.id,
        title: alert.title,
        description: alert.message,
        persona: alert.persona,
        severity: alert.severity,
      }));
  }, [abuData]);

  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  
  // ✅ 如果行程项为空，显示优化的空状态引导
  const hasTripItems = trip?.TripDay?.some(day => day.ItineraryItem && day.ItineraryItem.length > 0) || false;
  if (!hasTripItems) {
    return (
      <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="py-24 px-8 min-h-[60vh] flex items-center justify-center">
          <EmptyStateCard
            type="no-trip-added"
            title="你还没有添加任何行程哦～"
            description="这里现在空空的，但每一次精彩旅程都从第一步开始 ✨ 点击下方按钮，轻松开启你的旅行计划！"
            imageWidth={180}
            imageHeight={180}
            action={
              <div className="flex flex-col items-center gap-4 w-full max-w-md">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {/* 主按钮：创建第一个行程项 */}
                  {onAddItem ? (
                    <Button
                      size="lg"
                      onClick={onAddItem}
                      className="flex-1 text-base h-12 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      创建第一个行程项
                    </Button>
                  ) : onNavigateToPlanStudio ? (
                    <Button
                      size="lg"
                      onClick={onNavigateToPlanStudio}
                      className="flex-1 text-base h-12 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <Target className="w-5 h-5 mr-2" />
                      开始规划我的行程
                    </Button>
                  ) : null}
                  
                  {/* 次按钮：进入规划工作台 */}
                  {onNavigateToPlanStudio && onAddItem && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={onNavigateToPlanStudio}
                      className="flex-1 text-base h-12"
                    >
                      <Compass className="w-5 h-5 mr-2" />
                      进入规划工作台
                    </Button>
                  )}
                </div>
                
                {/* 辅助提示 - 更轻量 */}
                <p className="text-xs text-muted-foreground/70 max-w-md">
                  一个行程项可以是景点、美食、住宿或交通，试试添加第一站吧
                </p>
              </div>
            }
          />
        </CardContent>
      </Card>
    );
  }

  // 如果数据未加载完成，显示加载状态
  if (!overallMetrics && !abuData && !drDreData && !neptuneData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">加载综合数据...</span>
      </div>
    );
  }

  // 🎯 计算综合健康状态和异常指标
  const overallHealth = Math.min(metrics.safetyScore, metrics.rhythmScore, metrics.readinessScore);
  const hasIssues = overallHealth < 90;
  const lowestMetric = useMemo(() => {
    const metricsList = [
      { name: '安全', score: metrics.safetyScore, key: 'safety' },
      { name: '节奏', score: metrics.rhythmScore, key: 'rhythm' },
      { name: '修复', score: metrics.readinessScore, key: 'readiness' },
    ];
    return metricsList.reduce((min, m) => m.score < min.score ? m : min);
  }, [metrics]);

  // 🎯 获取状态文案和颜色
  const getStatusInfo = () => {
    if (overallHealth >= 90) {
      return {
        icon: '🟢',
        text: '行程状态：良好',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    } else if (overallHealth >= 60) {
      return {
        icon: '🟡',
        text: '行程状态：可优化',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    } else {
      return {
        icon: '🔴',
        text: '行程状态：需修复',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    }
  };

  const statusInfo = getStatusInfo();

  // 🎯 获取指标显示文本
  const getMetricsText = () => {
    const parts = [];
    if (metrics.safetyScore < 90) {
      parts.push(`⚠ 安全 ${metrics.safetyScore}`);
    } else {
      parts.push(`安全 ${metrics.safetyScore}`);
    }
    if (metrics.rhythmScore < 90) {
      const rhythmLabel = lowestMetric.key === 'rhythm' ? '节奏偏紧' : '节奏';
      parts.push(`⚠ ${rhythmLabel} ${metrics.rhythmScore}`);
    } else {
      parts.push(`节奏 ${metrics.rhythmScore}`);
    }
    if (metrics.readinessScore < 90) {
      parts.push(`⚠ 修复 ${metrics.readinessScore}`);
    } else {
      parts.push(`修复 ${metrics.readinessScore}`);
    }
    return parts.join(' · ');
  };

  return (
    <div className="space-y-6">
      {/* 🎯 单行综合健康状态条 */}
      <Card className="border border-gray-200 hover:border-gray-300 transition-colors">
        {/* 单行状态条（默认显示） */}
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* 左侧：模块身份 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">综合视图</span>
            </div>

            {/* 中间：状态总结 + 指标 */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* 状态总结 */}
              <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded', statusInfo.bgColor)}>
                <span className="text-xs">{statusInfo.icon}</span>
                <span className={cn('text-xs font-medium', statusInfo.color)}>
                  {statusInfo.text}（{overallHealth}%）
                </span>
              </div>

              {/* 指标文本 */}
              <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                {getMetricsText()}
              </div>
            </div>

            {/* 右侧：行动入口 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasIssues ? (
                <>
                  <span className="text-xs text-muted-foreground">▶</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="h-7 px-2 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  >
                    查看问题
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-xs text-muted-foreground">当前无明显问题</span>
                  <span className="text-xs text-muted-foreground">｜</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(true)}
                    className="h-7 px-2 text-xs"
                  >
                    ▶ 查看分析
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>

        {/* 展开后的详细视图 */}
        {isExpanded && (
          <CardContent className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">综合分析（3 个视角）</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-7 px-2 text-xs"
              >
                <ChevronUp className="w-3 h-3 mr-1" />
                收起
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Abu 安全视角 */}
              <Card className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow', getPersonaBackgroundClasses('ABU'))}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Shield className={cn('w-4 h-4', getPersonaIconColorClasses('ABU'))} />
                      <span className="font-semibold text-sm">安全视角</span>
                    </div>
                    {abuData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setExpandedView(expandedView === 'abu' ? null : 'abu')}
                      >
                        {expandedView === 'abu' ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            查看详情
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">安全评分</span>
                      <span className={cn('text-sm font-bold', getSafetyColor(metrics.safetyScore))}>
                        {metrics.safetyScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.criticalIssues === 0 ? '无关键风险' : `有 ${metrics.criticalIssues} 个关键问题`}
                    </p>
                    
                    {/* 🆕 关键问题列表（整合到安全视角卡片中） */}
                    {criticalIssues.length > 0 && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="text-xs font-medium text-red-600 mb-2">关键问题：</div>
                        {criticalIssues.slice(0, 3).map((issue) => (
                          <div
                            key={issue.id}
                            className="p-2 bg-red-50 border border-red-200 rounded text-xs"
                          >
                            <div className="font-medium text-red-900 mb-0.5">{issue.title}</div>
                            <div className="text-red-700 line-clamp-2">{issue.description}</div>
                          </div>
                        ))}
                        {criticalIssues.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            还有 {criticalIssues.length - 3} 个问题，点击查看详情 →
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
                
                {/* 🆕 展开后的详细视图 */}
                {expandedView === 'abu' && abuData && (
                  <CardContent className="pt-0 border-t">
                    <AbuView trip={trip} abuData={abuData} onItemClick={onItemClick} />
                  </CardContent>
                )}
              </Card>

              {/* Dr.Dre 节奏视角 */}
              <Card className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow', getPersonaBackgroundClasses('DR_DRE'))}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className={cn('w-4 h-4', getPersonaIconColorClasses('DR_DRE'))} />
                      <span className="font-semibold text-sm">节奏视角</span>
                    </div>
                    {drDreData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setExpandedView(expandedView === 'dre' ? null : 'dre')}
                      >
                        {expandedView === 'dre' ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            查看详情
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">节奏评分</span>
                      <span className={cn('text-sm font-bold', getPersonaIconColorClasses('DR_DRE'))}>
                        {metrics.rhythmScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {metrics.rhythmScore >= 80 
                        ? '节奏适中，行程流畅'
                        : metrics.rhythmScore >= 60
                        ? '节奏基本合理，有少量优化空间'
                        : '节奏需要调整，建议优化'}
                    </p>
                    {metrics.drDreWarnings > 0 && (
                      <p className="text-xs text-muted-foreground">
                        有 {metrics.drDreWarnings} 个建议可优化
                      </p>
                    )}
                  </div>
                </CardContent>
                
                {/* 🆕 展开后的详细视图 */}
                {expandedView === 'dre' && drDreData && (
                  <CardContent className="pt-0 border-t">
                    <DrDreView trip={trip} drDreData={drDreData} tripMetrics={null} onItemClick={onItemClick} />
                  </CardContent>
                )}
              </Card>

              {/* Neptune 修复视角 */}
              <Card className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow', getPersonaBackgroundClasses('NEPTUNE'))}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className={cn('w-4 h-4', getPersonaIconColorClasses('NEPTUNE'))} />
                      <span className="font-semibold text-sm">修复视角</span>
                    </div>
                    {neptuneData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setExpandedView(expandedView === 'neptune' ? null : 'neptune')}
                      >
                        {expandedView === 'neptune' ? (
                          <>
                            <ChevronUp className="w-3 h-3 mr-1" />
                            收起
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3 mr-1" />
                            查看详情
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">准备度</span>
                      <span className={cn('text-sm font-bold', getPersonaIconColorClasses('NEPTUNE'))}>
                        {metrics.readinessScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.suggestions === 0 ? '行程准备度高' : `当前有 ${metrics.suggestions} 个修复建议`}
                    </p>
                  </div>
                </CardContent>
                
                {/* 🆕 展开后的详细视图 */}
                {expandedView === 'neptune' && neptuneData && (
                  <CardContent className="pt-0 border-t">
                    <NeptuneView 
                      trip={trip} 
                      neptuneData={neptuneData} 
                      onItemClick={onItemClick}
                      onRepairApplied={onRepairApplied}
                      onAlternativeApplied={onAlternativeApplied}
                    />
                  </CardContent>
                )}
              </Card>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

