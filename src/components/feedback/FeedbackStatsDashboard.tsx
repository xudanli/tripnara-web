import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp, MessageSquare, Star, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { decisionApi } from '@/api/decision';
import type { FeedbackStatsQuery, FeedbackStatsResponse } from '@/types/feedback';
import { toast } from 'sonner';

interface FeedbackStatsDashboardProps {
  userId?: string;
  tripId?: string;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export default function FeedbackStatsDashboard({
  userId,
  tripId,
  startDate,
  endDate,
  className,
}: FeedbackStatsDashboardProps) {
  const [stats, setStats] = useState<FeedbackStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: FeedbackStatsQuery = {};
      if (userId) query.userId = userId;
      if (tripId) query.tripId = tripId;
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;

      const result = await decisionApi.getFeedbackStats(query);
      setStats(result);
    } catch (err: any) {
      console.error('加载反馈统计失败:', err);
      setError(err.message || '加载反馈统计失败');
      toast.error('加载反馈统计失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [userId, tripId, startDate, endDate]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="w-8 h-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                反馈统计
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                用户反馈数据统计和分析
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStats}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 反馈数量统计 */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">计划变体反馈</span>
              </div>
              <p className="text-2xl font-bold">{stats.planVariantCount}</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">冲突反馈</span>
              </div>
              <p className="text-2xl font-bold">{stats.conflictCount}</p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">质量反馈</span>
              </div>
              <p className="text-2xl font-bold">{stats.decisionQualityCount}</p>
            </div>
          </div>

          {/* 平均评分 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">平均满意度</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-blue-900">
                  {stats.averageSatisfaction.toFixed(1)}
                </p>
                <span className="text-sm text-blue-700">/ 5.0</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.averageSatisfaction / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">平均计划质量</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-green-900">
                  {stats.averagePlanQuality.toFixed(1)}
                </p>
                <span className="text-sm text-green-700">/ 5.0</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${(stats.averagePlanQuality / 5) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
