/**
 * Auto 综合视图概览
 * 提取自AutoView，用于固定显示在规划Tab顶部
 */

import { useState, useMemo } from 'react';
import type { TripDetail } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Activity,
  RefreshCw,
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPersonaIconColorClasses, getPersonaBackgroundClasses } from '@/lib/persona-colors';
import type { 
  OverallMetrics, 
  AbuViewData, 
  DrDreViewData, 
  NeptuneViewData 
} from '@/utils/trip-data-extractors';

interface AutoOverviewProps {
  trip: TripDetail;
  overallMetrics: OverallMetrics | null;
  abuData: AbuViewData | null;
  drDreData: DrDreViewData | null;
  neptuneData: NeptuneViewData | null;
  onViewClick?: (view: 'abu' | 'dre' | 'neptune') => void;
  onRequestDetailView?: () => void; // 用户点击「查看问题」或「查看分析」时，请求展开详情 Tab
}

export default function AutoOverview({ 
  trip, 
  overallMetrics, 
  abuData, 
  drDreData, 
  neptuneData,
  onViewClick,
  onRequestDetailView
}: AutoOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false); // ✅ 控制综合视图展开/折叠
  
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

  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
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
                  onClick={() => {
                    setIsExpanded(true);
                    onRequestDetailView?.();
                  }}
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
                  onClick={() => {
                    setIsExpanded(true);
                    onRequestDetailView?.();
                  }}
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
        <CardContent className="pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200">
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
            <Card 
              className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow cursor-pointer', getPersonaBackgroundClasses('ABU'))}
              onClick={() => onViewClick?.('abu')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className={cn('w-4 h-4', getPersonaIconColorClasses('ABU'))} />
                    <span className="font-semibold text-sm">安全视角</span>
                  </div>
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
            </Card>

            {/* Dr.Dre 节奏视角 */}
            <Card 
              className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow cursor-pointer', getPersonaBackgroundClasses('DR_DRE'))}
              onClick={() => onViewClick?.('dre')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className={cn('w-4 h-4', getPersonaIconColorClasses('DR_DRE'))} />
                    <span className="font-semibold text-sm">节奏视角</span>
                  </div>
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
            </Card>

            {/* Neptune 修复视角 */}
            <Card 
              className={cn('border bg-gradient-to-br to-white shadow-sm hover:shadow-md transition-shadow cursor-pointer', getPersonaBackgroundClasses('NEPTUNE'))}
              onClick={() => onViewClick?.('neptune')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn('w-4 h-4', getPersonaIconColorClasses('NEPTUNE'))} />
                    <span className="font-semibold text-sm">修复视角</span>
                  </div>
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
            </Card>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
