/**
 * Auto 综合视图
 * 整合 Abu、Dr.Dre、Neptune 三个视角的关键信息
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TripDetail, ItineraryItem } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'abu' | 'dre' | 'neptune'>('overview');

  // 使用默认值，如果数据未加载完成
  const metrics = overallMetrics || {
    safetyScore: 0,
    rhythmScore: 0,
    readinessScore: 0,
    criticalIssues: 0,
    warnings: 0,
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
    if (score >= 80) return { label: '良好', className: 'bg-green-100 text-green-800 border-green-200' };
    if (score >= 60) return { label: '需注意', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: '需修复', className: 'bg-red-100 text-red-800 border-red-200' };
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
            <Badge variant="outline" className={safetyBadge.className}>
              {safetyBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Abu 安全视角 */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-sm">安全视角</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">安全评分</span>
                    <span className={`text-sm font-semibold ${getSafetyColor(metrics.safetyScore)}`}>
                      {metrics.safetyScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">关键问题</span>
                    <Badge variant={metrics.criticalIssues > 0 ? 'destructive' : 'secondary'} className="text-xs">
                      {metrics.criticalIssues}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dr.Dre 节奏视角 */}
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-sm">节奏视角</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">节奏评分</span>
                    <span className="text-sm font-semibold text-orange-600">
                      {metrics.rhythmScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">警告</span>
                    <Badge variant={metrics.warnings > 0 ? 'default' : 'secondary'} className="text-xs">
                      {metrics.warnings}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Neptune 修复视角 */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">修复视角</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">准备度</span>
                    <span className="text-sm font-semibold text-green-600">
                      {metrics.readinessScore}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="abu" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            安全
          </TabsTrigger>
          <TabsTrigger value="dre" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            节奏
          </TabsTrigger>
          <TabsTrigger value="neptune" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            修复
          </TabsTrigger>
        </TabsList>

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
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600 opacity-50" />
                      <p>暂无关键问题</p>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">总天数</span>
                    </div>
                    <span className="text-sm font-medium">{keyMetrics.totalDays} 天</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">行程项数</span>
                    </div>
                    <span className="text-sm font-medium">{keyMetrics.totalItems} 个</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">总预算</span>
                    </div>
                    <span className="text-sm font-medium">¥{keyMetrics.totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">已使用</span>
                    </div>
                    <span className="text-sm font-medium">¥{keyMetrics.budgetUsed.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('abu')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  查看安全详情
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('dre')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  调整节奏
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('neptune')}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  查看修复建议
                  <ArrowRight className="w-4 h-4 ml-2" />
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

