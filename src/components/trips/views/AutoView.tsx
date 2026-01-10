/**
 * Auto 综合视图
 * 整合 Abu、Dr.Dre、Neptune 三个视角的关键信息
 */

import { useState, useMemo } from 'react';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  TrendingUp, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity,
  DollarSign,
  BarChart3,
  Eye,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
}

export default function AutoView({ 
  trip, 
  overallMetrics, 
  abuData, 
  drDreData, 
  neptuneData,
  onItemClick 
}: AutoViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'abu' | 'dre' | 'neptune'>('overview');

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

  // 关键指标（从 trip 中提取）
  const keyMetrics = useMemo(() => {
    return {
      totalDays: trip.TripDay?.length || 0,
      totalItems: trip.statistics?.totalItems || 0,
      totalBudget: trip.totalBudget || 0,
      budgetUsed: trip.statistics?.budgetUsed || 0,
    };
  }, [trip]);

  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSafetyBadge = (score: number) => {
    if (score >= 80) return { 
      label: '良好', 
      icon: CheckCircle2,
      className: 'bg-green-50 text-green-700 border-green-200 rounded-full px-3 py-1' 
    };
    if (score >= 60) return { 
      label: '需注意', 
      icon: AlertTriangle,
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200 rounded-full px-3 py-1' 
    };
    return { 
      label: '需修复', 
      icon: AlertTriangle,
      className: 'bg-red-50 text-red-700 border-red-200 rounded-full px-3 py-1' 
    };
  };

  const safetyBadge = getSafetyBadge(metrics.safetyScore);
  
  // 如果数据未加载完成，显示加载状态
  if (!overallMetrics && !abuData && !drDreData && !neptuneData) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8" />
        <span className="ml-2">加载综合数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 综合概览卡片 */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                综合视图
              </CardTitle>
              <CardDescription className="mt-1">
                整合三人格的视角，全面了解行程状态
              </CardDescription>
            </div>
            <Badge variant="outline" className={cn('flex items-center gap-1.5', safetyBadge.className)}>
              {safetyBadge.icon && <safetyBadge.icon className="w-3.5 h-3.5" />}
              {safetyBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Abu 安全视角 */}
            <Card className="border border-red-100 bg-gradient-to-br from-red-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-red-100/50">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-sm">🛡 安全视角</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">安全评分</span>
                      <span className={`text-base font-bold ${getSafetyColor(metrics.safetyScore)}`}>
                        {metrics.safetyScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={metrics.safetyScore} 
                      className="h-2"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-red-100">
                    <span className="text-xs text-muted-foreground">关键问题</span>
                    <Badge 
                      variant={metrics.criticalIssues > 0 ? 'destructive' : 'secondary'} 
                      className="text-xs"
                    >
                      {metrics.criticalIssues}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dr.Dre 节奏视角 */}
            <Card className="border border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-orange-100/50">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="font-semibold text-sm">🧠 节奏视角</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">节奏评分</span>
                      <span className="text-base font-bold text-orange-600">
                        {metrics.rhythmScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={metrics.rhythmScore} 
                      className="h-2 bg-orange-100"
                    />
                  </div>
                  <div className="pt-2 border-t border-orange-100">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {metrics.rhythmScore >= 80 
                        ? '📊 节奏适中，建议不多，行程流畅'
                        : metrics.rhythmScore >= 60
                        ? '📊 节奏基本合理，有少量优化空间'
                        : '📊 节奏需要调整，建议优化'}
                    </p>
                    {metrics.drDreWarnings > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">⚠️ 有 {metrics.drDreWarnings} 个建议可优化</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => setActiveTab('dre')}
                        >
                          查看 →
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Neptune 修复视角 */}
            <Card className="border border-green-100 bg-gradient-to-br from-green-50/50 to-white shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-green-100/50">
                    <Wrench className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-sm">🛠 修复视角</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">准备度</span>
                      <span className="text-base font-bold text-green-600">
                        {metrics.readinessScore}/100
                      </span>
                    </div>
                    <Progress 
                      value={metrics.readinessScore} 
                      className="h-2 bg-green-100"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-100">
                    <span className="text-xs text-muted-foreground">建议</span>
                    <Badge variant="outline" className="text-xs">
                      {metrics.suggestions}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* 标签页切换详细视图 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="sticky top-0 z-10 bg-white border-b">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              概览
            </TabsTrigger>
            <TabsTrigger 
              value="abu" 
              className="flex items-center gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:font-semibold"
            >
              <Shield className="w-4 h-4" />
              🛡 安全
            </TabsTrigger>
            <TabsTrigger 
              value="dre" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:font-semibold"
            >
              <TrendingUp className="w-4 h-4" />
              🧠 节奏
            </TabsTrigger>
            <TabsTrigger 
              value="neptune" 
              className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:font-semibold"
            >
              <Wrench className="w-4 h-4" />
              🛠 修复
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 关键问题摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  关键问题
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {criticalIssues.length > 0 ? (
                    criticalIssues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`p-3 border rounded-lg ${
                          issue.severity === 'warning'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className={`font-medium text-sm mb-1 ${
                          issue.severity === 'warning'
                            ? 'text-red-900'
                            : 'text-yellow-900'
                        }`}>
                          {issue.title}
                        </div>
                        <div className={`text-xs ${
                          issue.severity === 'warning'
                            ? 'text-red-700'
                            : 'text-yellow-700'
                        }`}>
                          {issue.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-sm">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="font-medium text-gray-900 mb-1">行程没有明显阻碍</p>
                      <p className="text-muted-foreground">放心前往 ✨</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 指标摘要 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  关键指标
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                          <Clock className="w-5 h-5 text-blue-600 mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">总天数</span>
                          <span className="text-xl font-bold text-blue-700">{keyMetrics.totalDays}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">天</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>行程总天数</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                          <Activity className="w-5 h-5 text-purple-600 mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">行程项数</span>
                          <span className="text-xl font-bold text-purple-700">{keyMetrics.totalItems}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">个</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>行程项总数</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                          <DollarSign className="w-5 h-5 text-green-600 mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">总预算</span>
                          <span className="text-lg font-bold text-green-700">¥{keyMetrics.totalBudget.toLocaleString()}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>行程总预算</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                          <DollarSign className="w-5 h-5 text-amber-600 mb-2" />
                          <span className="text-xs text-muted-foreground mb-1">预算使用情况</span>
                          <span className="text-lg font-bold text-amber-700">¥{keyMetrics.budgetUsed.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            ({keyMetrics.totalBudget > 0 ? Math.round((keyMetrics.budgetUsed / keyMetrics.totalBudget) * 100) : 0}%)
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>已使用的预算金额及占比</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <Card className="border-t-2 border-t-gray-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                快速操作
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setActiveTab('abu')}
                  className="flex items-center justify-center gap-2 h-auto py-4 bg-red-600 hover:bg-red-700"
                >
                  <Shield className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">查看安全详情</div>
                    <div className="text-xs opacity-90">检查风险与合规</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setActiveTab('dre')}
                  className="flex items-center justify-center gap-2 h-auto py-4 bg-orange-600 hover:bg-orange-700"
                >
                  <TrendingUp className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">调整节奏</div>
                    <div className="text-xs opacity-90">优化行程节奏</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setActiveTab('neptune')}
                  className="flex items-center justify-center gap-2 h-auto py-4 bg-green-600 hover:bg-green-700"
                >
                  <Wrench className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold">查看修复建议</div>
                    <div className="text-xs opacity-90">获取替代方案</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Abu 详细视图 */}
        <TabsContent value="abu">
          {abuData ? (
            <AbuView trip={trip} abuData={abuData} onItemClick={onItemClick} />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Spinner className="w-6 h-6" />
              <span className="ml-2">加载安全数据...</span>
            </div>
          )}
        </TabsContent>

        {/* Dr.Dre 详细视图 */}
        <TabsContent value="dre">
          {drDreData ? (
            <DrDreView trip={trip} drDreData={drDreData} tripMetrics={null} onItemClick={onItemClick} />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Spinner className="w-6 h-6" />
              <span className="ml-2">加载节奏数据...</span>
            </div>
          )}
        </TabsContent>

        {/* Neptune 详细视图 */}
        <TabsContent value="neptune">
          {neptuneData ? (
            <NeptuneView trip={trip} neptuneData={neptuneData} onItemClick={onItemClick} />
          ) : (
            <div className="flex items-center justify-center p-8">
              <Spinner className="w-6 h-6" />
              <span className="ml-2">加载修复数据...</span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

