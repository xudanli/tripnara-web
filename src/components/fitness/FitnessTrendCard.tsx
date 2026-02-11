/**
 * 体能趋势展示卡片
 * 显示用户体能变化趋势和置信度
 * 
 * @module components/fitness/FitnessTrendCard
 */

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, HelpCircle, RefreshCw, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFitnessTrend } from '@/hooks/useFitnessTrend';
import { FitnessTrendChart } from './FitnessTrendChart';
import type { FitnessTrend, TrendType } from '@/types/fitness-analytics';
import { TREND_TYPE_CONFIG } from '@/types/fitness-analytics';

interface FitnessTrendCardProps {
  periodDays?: number;
  showChart?: boolean;
  showDetailsLink?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

function TrendIcon({ trend, className }: { trend: TrendType; className?: string }) {
  switch (trend) {
    case 'IMPROVING':
      return <TrendingUp className={cn('w-5 h-5', className)} />;
    case 'DECLINING':
      return <TrendingDown className={cn('w-5 h-5', className)} />;
    case 'STABLE':
      return <Minus className={cn('w-5 h-5', className)} />;
    default:
      return <HelpCircle className={cn('w-5 h-5', className)} />;
  }
}

function TrendContent({ trend, showChart }: { trend: FitnessTrend; showChart: boolean }) {
  const { t, i18n } = useTranslation();
  const config = TREND_TYPE_CONFIG[trend.trend];
  const isZh = i18n.language === 'zh';
  
  return (
    <div className="space-y-4">
      <div className={cn('p-4 rounded-lg', config.bgColorClass)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-full bg-white/80', config.colorClass)}>
            <TrendIcon trend={trend.trend} className={config.colorClass} />
          </div>
          <div className="flex-1">
            <div className={cn('text-lg font-semibold', config.colorClass)}>
              {config.icon} {config.label}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isZh ? trend.summaryZh : trend.summary}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">
            {Math.round(trend.confidence * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">置信度</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{trend.dataPoints}</div>
          <div className="text-xs text-muted-foreground">数据点</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold">{trend.periodDays}</div>
          <div className="text-xs text-muted-foreground">分析天数</div>
        </div>
      </div>

      {showChart && trend.trend !== 'INSUFFICIENT_DATA' && (
        <div className="mt-4">
          <FitnessTrendChart 
            trend={trend.trend}
            slope={trend.slope}
            dataPoints={trend.dataPoints}
          />
        </div>
      )}

      {trend.trend === 'INSUFFICIENT_DATA' && (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-muted-foreground">
            继续完成更多行程后，我们将为您分析体能趋势
          </p>
        </div>
      )}
    </div>
  );
}

export function FitnessTrendCard({
  periodDays = 90,
  showChart = true,
  showDetailsLink = false,
  onViewDetails,
  className,
}: FitnessTrendCardProps) {
  const { t } = useTranslation();
  const { data: trend, isLoading, error, refetch, isRefetching } = useFitnessTrend(periodDays);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              体能趋势
            </CardTitle>
            <CardDescription>
              分析您最近 {periodDays} 天的体能变化
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-8 h-8" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 rounded-lg text-center">
            <p className="text-sm text-red-600">加载趋势数据失败</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              重试
            </Button>
          </div>
        ) : trend ? (
          <>
            <TrendContent trend={trend} showChart={showChart} />
            {showDetailsLink && onViewDetails && (
              <Button 
                variant="ghost" 
                className="w-full mt-4"
                onClick={onViewDetails}
              >
                查看完整报告
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default FitnessTrendCard;
