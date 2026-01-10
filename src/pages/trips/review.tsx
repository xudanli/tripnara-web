import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { tripReviewApi, anchorApi } from '@/api/trip-review';
import { tripsApi } from '@/api/trips';
import type { TripReviewDetail, AnchorRule, ReviewSummary } from '@/types/trip-review';
import type { TripDetail } from '@/types/trip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Download, RefreshCw, CheckCircle2, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import Timeline from '@/components/trips/review/Timeline';
import Insights from '@/components/trips/review/Insights';
import Anchors from '@/components/trips/review/Anchors';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function TripReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = id || searchParams.get('tripId');

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [reviewData, setReviewData] = useState<TripReviewDetail | null>(null);
  const [anchorsSaved, setAnchorsSaved] = useState<AnchorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'insights' | 'anchors'>('timeline');

  useEffect(() => {
    if (tripId) {
      loadTrip();
      loadReview();
      loadAnchors();
    }
  }, [tripId]);

  const loadAnchors = async () => {
    try {
      const anchors = await anchorApi.getAll();
      setAnchorsSaved(anchors);
    } catch (err: any) {
      console.error('Failed to load anchors:', err);
    }
  };

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err: any) {
      console.error('Failed to load trip:', err);
    }
  };

  const loadReview = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await tripReviewApi.getReview(tripId);
      setReviewData(data);
    } catch (err: any) {
      // 如果复盘不存在，不显示错误，允许用户生成
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError(null);
      } else {
        setError(err.message || '加载复盘数据失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!tripId) return;
    try {
      setGenerating(true);
      setError(null);
      const data = await tripReviewApi.generate(tripId);
      setReviewData(data);
    } catch (err: any) {
      setError(err.message || '生成复盘失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportReview = async (format: 'pdf' | 'md') => {
    if (!tripId || !reviewData) return;
    try {
      const blob = await tripReviewApi.exportReview(tripId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-review-${tripId}.${format === 'pdf' ? 'pdf' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || '导出失败');
    }
  };

  if (loading && !reviewData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!tripId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-600">未找到行程ID</p>
          <Button onClick={() => navigate('/dashboard/trips')} className="mt-4">
            返回行程列表
          </Button>
        </div>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(`/dashboard/trips/${tripId}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回行程详情
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <RefreshCw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-2">还没有复盘数据</h2>
            <p className="text-gray-600 mb-6">
              生成复盘可以帮助你了解这次旅行的执行情况，并提取有价值的经验
            </p>
            <Button onClick={handleGenerateReview} disabled={generating} size="lg">
              {generating ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  生成复盘
                </>
              )}
            </Button>
            {error && (
              <div className="mt-4 text-red-600 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, events, insights, anchorsSuggested } = reviewData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/dashboard/trips/${tripId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <div>
                <h1 className="text-2xl font-bold">行程复盘</h1>
                {trip && (
                  <p className="text-sm text-gray-600 mt-1">
                    {trip.destination} · {format(new Date(trip.startDate), 'yyyy年MM月dd日', { locale: zhCN })} - {format(new Date(trip.endDate), 'yyyy年MM月dd日', { locale: zhCN })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExportReview('md')}
              >
                <Download className="w-4 h-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Bar - KPI Pills */}
        {summary && (
          <div className="mb-6">
            <SummaryBar summary={summary} />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="timeline">证据时间线</TabsTrigger>
            <TabsTrigger value="insights">系统洞察</TabsTrigger>
            <TabsTrigger value="anchors">
              锚点规则
              {anchorsSuggested.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {anchorsSuggested.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <Timeline
              events={events}
              tripStartDate={trip?.startDate}
              onEditEvent={async (eventId, updates) => {
                if (!tripId) return;
                try {
                  await tripReviewApi.updateEvent(tripId, eventId, updates);
                  await loadReview();
                } catch (err: any) {
                  setError(err.message || '更新事件失败');
                }
              }}
            />
          </TabsContent>

          <TabsContent value="insights">
            <Insights
              insights={insights}
              onVote={async (insightId, vote, note) => {
                // TODO: 实现洞察投票API
                console.log('Vote insight:', insightId, vote, note);
              }}
              onSaveAnchor={async (insightId) => {
                // TODO: 实现保存锚点功能
                console.log('Save anchor from insight:', insightId);
              }}
            />
          </TabsContent>

          <TabsContent value="anchors">
            <Anchors
              anchorsSuggested={anchorsSuggested}
              anchorsSaved={anchorsSaved}
              onSave={async (anchor) => {
                if (!tripId) return;
                try {
                  await anchorApi.save({
                    type: anchor.type,
                    ruleText: anchor.ruleText,
                    parameters: anchor.parameters,
                    evidenceTripIds: anchor.evidenceTripIds,
                    strength: anchor.strength,
                    scope: anchor.scope,
                    status: 'saved',
                  });
                  await loadReview();
                } catch (err: any) {
                  setError(err.message || '保存锚点失败');
                }
              }}
              onUpdate={async (anchorId, updates) => {
                try {
                  await anchorApi.update(anchorId, updates);
                  await loadReview();
                } catch (err: any) {
                  setError(err.message || '更新锚点失败');
                }
              }}
              onDelete={async (anchorId) => {
                try {
                  await anchorApi.delete(anchorId);
                  await loadReview();
                } catch (err: any) {
                  setError(err.message || '删除锚点失败');
                }
              }}
              onDisable={async (anchorId) => {
                try {
                  await anchorApi.update(anchorId, { status: 'disabled' });
                  await loadReview();
                } catch (err: any) {
                  setError(err.message || '禁用锚点失败');
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Summary Bar Component - KPI Pills
function SummaryBar({ summary }: { summary: ReviewSummary }) {
  const { completion, changeRate, scheduleHealth, riskExposure, budgetDeviation } = summary;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {/* 完成度 */}
        <KPIPill
          icon={CheckCircle2}
          label="完成度"
          value={`${Math.round(completion.completionRate * 100)}%`}
          subtitle={`${completion.completedPlanItems}/${completion.totalPlanItems} 项`}
          color="green"
        />

        {/* 变更强度 */}
        <KPIPill
          icon={RefreshCw}
          label="变更率"
          value={`${Math.round(changeRate.changeRate * 100)}%`}
          subtitle={`${changeRate.replacedCount + changeRate.skippedCount} 次变更`}
          color="blue"
        />

        {/* 时间健康度 */}
        <KPIPill
          icon={Clock}
          label="延误"
          value={`${scheduleHealth.totalDelayMinutes} 分钟`}
          subtitle={scheduleHealth.totalDelayMinutes > 0 ? '有延误' : '准时'}
          color={scheduleHealth.totalDelayMinutes > 0 ? 'orange' : 'green'}
        />

        {/* 风险暴露 */}
        <KPIPill
          icon={AlertTriangle}
          label="风险事件"
          value={riskExposure.riskEventCount.toString()}
          subtitle={`影响: ${riskExposure.totalRiskImpact > 0 ? '+' : ''}${riskExposure.totalRiskImpact.toFixed(1)}`}
          color={riskExposure.riskEventCount > 0 ? 'red' : 'green'}
        />

        {/* 预算偏差（可选） */}
        {budgetDeviation && (
          <KPIPill
            icon={DollarSign}
            label="预算偏差"
            value={`${(budgetDeviation.deviation || 0) > 0 ? '+' : ''}${(budgetDeviation.deviation || 0).toFixed(0)}`}
            subtitle={`实际: ${budgetDeviation.actualCost}`}
            color={(budgetDeviation.deviation || 0) > 0 ? 'orange' : 'green'}
          />
        )}
      </div>
    </div>
  );
}

// KPI Pill Component
function KPIPill({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle: string;
  color: 'green' | 'blue' | 'orange' | 'red';
}) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-600 mb-1">{label}</div>
        <div className="text-xl font-semibold mb-1">{value}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>
    </div>
  );
}

