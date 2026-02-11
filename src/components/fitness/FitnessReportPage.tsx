/**
 * 体能报告页面组件
 * @module components/fitness/FitnessReportPage
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Calendar, TrendingUp, AlertTriangle, 
  Target, CheckCircle, XCircle, RefreshCw, ArrowLeft 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFitnessReport } from '@/hooks/useFitnessReport';
import { FitnessTrendChart } from './FitnessTrendChart';
import { FitnessTimeline } from './FitnessTimeline';
import { TREND_TYPE_CONFIG, ANOMALY_TYPE_CONFIG, ANOMALY_SEVERITY_CONFIG } from '@/types/fitness-analytics';

interface FitnessReportPageProps {
  periodDays?: number;
  onBack?: () => void;
  className?: string;
}

function SummaryCard({ title, value, subValue, icon: Icon }: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && <div className="text-xs text-muted-foreground mt-1">{subValue}</div>}
    </div>
  );
}

export function FitnessReportPage({ periodDays = 30, onBack, className }: FitnessReportPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: report, isLoading, error, refetch, isRefetching } = useFitnessReport(periodDays);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className={cn('text-center py-16', className)}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
        <p className="text-muted-foreground mb-4">加载报告失败</p>
        <Button onClick={() => refetch()}>重试</Button>
      </div>
    );
  }

  const trendConfig = TREND_TYPE_CONFIG[report.trend.trend];

  return (
    <div className={cn('space-y-6', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              体能分析报告
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(report.period.start), 'yyyy年MM月dd日', { locale: zhCN })} - {format(new Date(report.period.end), 'yyyy年MM月dd日', { locale: zhCN })}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={cn('w-4 h-4 mr-1', isRefetching && 'animate-spin')} />
          刷新
        </Button>
      </div>

      {/* 概览摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="行程次数" 
          value={report.summary.totalTrips} 
          icon={Calendar}
        />
        <SummaryCard 
          title="完成率" 
          value={`${Math.round(report.summary.completionRate * 100)}%`}
          icon={report.summary.completionRate >= 0.8 ? CheckCircle : XCircle}
        />
        <SummaryCard 
          title="平均疲劳指数" 
          value={report.summary.avgFatigueIndex.toFixed(2)}
          icon={Target}
        />
        <SummaryCard 
          title="平均体感评分" 
          value={report.summary.avgEffortRating.toFixed(1)}
          subValue={report.summary.avgEffortRating < 1.5 ? '偏累' : report.summary.avgEffortRating > 2.5 ? '偏轻松' : '适中'}
          icon={TrendingUp}
        />
      </div>

      {/* 详细内容 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">趋势分析</TabsTrigger>
          <TabsTrigger value="changes">体能变化</TabsTrigger>
          <TabsTrigger value="timeline">时间线</TabsTrigger>
        </TabsList>

        {/* 趋势分析 */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                趋势分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('p-4 rounded-lg mb-4', trendConfig.bgColorClass)}>
                <div className={cn('text-lg font-semibold', trendConfig.colorClass)}>
                  {trendConfig.icon} {trendConfig.label}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {report.trend.summaryZh}
                </p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>置信度: {Math.round(report.trend.confidence * 100)}%</span>
                  <span>数据点: {report.trend.dataPoints}</span>
                </div>
              </div>
              
              {report.trend.trend !== 'INSUFFICIENT_DATA' && (
                <FitnessTrendChart 
                  trend={report.trend.trend}
                  slope={report.trend.slope}
                  dataPoints={report.trend.dataPoints}
                  height={150}
                />
              )}
            </CardContent>
          </Card>

          {/* 异常检测 */}
          {report.anomalies.hasAnomaly && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  检测到异常
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.anomalies.anomalies.map((anomaly, index) => {
                  const typeConfig = ANOMALY_TYPE_CONFIG[anomaly.type];
                  const severityConfig = ANOMALY_SEVERITY_CONFIG[anomaly.severity];
                  return (
                    <div key={index} className={cn('p-3 rounded-lg', severityConfig.bgColorClass)}>
                      <div className="flex items-center gap-2">
                        <span>{typeConfig.icon}</span>
                        <span className={cn('font-medium', severityConfig.colorClass)}>{typeConfig.label}</span>
                        <Badge variant="outline" className={severityConfig.colorClass}>{severityConfig.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{anomaly.descriptionZh}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 建议 */}
          {report.recommendationsZh && report.recommendationsZh.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>建议</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.recommendationsZh.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 体能变化 */}
        <TabsContent value="changes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>体能变化</CardTitle>
              <CardDescription>报告周期内的体能数值变化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">单日最大爬升</p>
                    <p className="text-xl font-bold">
                      {report.capabilityChanges.startMaxDailyAscentM}m → {report.capabilityChanges.endMaxDailyAscentM}m
                    </p>
                  </div>
                  <Badge className={report.capabilityChanges.changePercent >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {report.capabilityChanges.changePercent >= 0 ? '+' : ''}{report.capabilityChanges.changePercent.toFixed(1)}%
                  </Badge>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">校准次数</p>
                  <p className="text-xl font-bold">{report.capabilityChanges.calibrationCount} 次</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 时间线 */}
        <TabsContent value="timeline" className="mt-4">
          <FitnessTimeline limit={20} collapsible={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FitnessReportPage;
