import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Edit,
  ThumbsUp,
  ThumbsDown,
  Anchor,
} from 'lucide-react';
import { toast } from 'sonner';
import type { HikeReview } from '@/types/trail';
import { hikePlanRepository, isUuidLike } from '@/services/hike-plan-repository';
import { Spinner } from '@/components/ui/spinner';
import { HikingElevationChart } from '@/components/hiking/HikingElevationChart';
import { gpsTrackToElevationProfile } from '@/lib/gps-to-elevation';
import type { GpsTrackResponse } from '@/types/hike-plan';

export default function HikeReviewPage() {
  const { hikePlanId: paramId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();
  const planId = paramId && isUuidLike(paramId) ? paramId : undefined;

  const [review, setReview] = useState<HikeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [gpsTrack, setGpsTrack] = useState<GpsTrackResponse | null>(null);

  useEffect(() => {
    if (!planId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await hikePlanRepository.getReview(planId);
        setReview(res.review);
      } catch {
        setReview(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [planId]);

  useEffect(() => {
    if (!planId) return;
    hikePlanRepository.getTrack(planId).then(setGpsTrack).catch(() => setGpsTrack(null));
  }, [planId]);

  const elevationFromGps = useMemo(() => {
    if (!gpsTrack?.points.length) return [];
    return gpsTrackToElevationProfile(gpsTrack.points);
  }, [gpsTrack]);

  const handleGenerate = async () => {
    if (!planId) return;
    setGenerating(true);
    try {
      const res = await hikePlanRepository.generateReview(planId, { useGpsTrack: true });
      setReview(res.review);
      const track = await hikePlanRepository.getTrack(planId);
      setGpsTrack(track);
      toast.success('已根据 GPS 与执行记录生成复盘');
    } catch (e) {
      toast.error((e as Error).message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleInsightFeedback = (insightId: string, vote: 'agree' | 'disagree') => {
    if (!review || !planId) return;
    const next = {
      ...review,
      insights: review.insights.map((insight) =>
        insight.id === insightId ? { ...insight, userFeedback: vote } : insight
      ),
    };
    setReview(next);
    void hikePlanRepository.updateReview(planId, { insights: next.insights });
    toast.success(vote === 'agree' ? '已同意' : '已不同意');
  };

  const categoryLabels: Record<string, string> = {
    highlight: '高光',
    friction: '摩擦点',
    rhythm: '节奏',
    safety: '安全',
    decision: '决策',
  };

  const categoryColors: Record<string, string> = {
    highlight: 'bg-green-50 border-green-200',
    friction: 'bg-red-50 border-red-200',
    rhythm: 'bg-blue-50 border-blue-200',
    safety: 'bg-yellow-50 border-yellow-200',
    decision: 'bg-purple-50 border-purple-200',
  };

  const eventTypeLabels: Record<string, string> = {
    delay: '延误',
    fatigue: '疲劳',
    wind: '风大',
    water_crossing: '涉水',
    turnaround: '折返',
    skip: '跳过',
  };

  const eventTypeColors: Record<string, string> = {
    delay: 'bg-yellow-100 text-yellow-800',
    fatigue: 'bg-orange-100 text-orange-800',
    wind: 'bg-blue-100 text-blue-800',
    water_crossing: 'bg-cyan-100 text-cyan-800',
    turnaround: 'bg-gray-100 text-gray-800',
    skip: 'bg-gray-100 text-gray-800',
  };

  if (!planId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">无效的 HikePlan ID</p>
        <Button onClick={() => navigate('/dashboard/trails/my-hikes')}>我的徒步</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <p className="text-muted-foreground mb-4">尚未生成复盘，可基于 GPS 轨迹与执行事件生成</p>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中…' : '生成复盘'}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <div className="mb-6 flex justify-between items-start gap-4">
        <div>
        <h1 className="text-3xl font-bold mb-2">徒步复盘</h1>
        <p className="text-muted-foreground">
          证据 → 洞察 → 锚点沉淀
        </p>
        </div>
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? '重新生成中…' : '重新生成'}
        </Button>
      </div>

      {/* 执行摘要 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>执行摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{review.actualDistanceKm.toFixed(1)} km</div>
              <div className="text-sm text-muted-foreground">实际距离</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Math.floor(review.actualDurationMin / 60)}h {review.actualDurationMin % 60}m
              </div>
              <div className="text-sm text-muted-foreground">实际耗时</div>
            </div>
            <div>
              <div className="text-2xl font-bold">+{review.actualElevationGainedM} m</div>
              <div className="text-sm text-muted-foreground">实际爬升</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Date(review.completedDate).toLocaleDateString('zh-CN')}
              </div>
              <div className="text-sm text-muted-foreground">完成日期</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="elevation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="elevation">海拔剖面事件</TabsTrigger>
          <TabsTrigger value="insights">洞察</TabsTrigger>
          <TabsTrigger value="anchors">锚点规则</TabsTrigger>
        </TabsList>

        {/* 海拔剖面上的事件钉子 */}
        <TabsContent value="elevation">
          <Card>
            <CardHeader>
              <CardTitle>海拔剖面上的事件钉子</CardTitle>
              <CardDescription>
                延误、体能崩、风大、涉水、折返点全部钉在剖面上，一眼看出"崩在哪段坡"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {elevationFromGps.length > 1 ? (
                <HikingElevationChart
                  className="mb-6"
                  points={elevationFromGps}
                  dataSource="live_dem"
                />
              ) : (
                <div className="h-48 bg-muted rounded-lg mb-6 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">暂无 GPS 海拔数据</p>
                    <p className="text-xs mt-1">执行页开启定位并记录轨迹后可展示</p>
                  </div>
                </div>
              )}
              {gpsTrack && (
                <p className="text-xs text-muted-foreground mb-4">
                  GPS：{gpsTrack.summary.distanceKm.toFixed(2)} km ·{' '}
                  {gpsTrack.summary.pointCount} 点 · {gpsTrack.summary.durationMin} min
                </p>
              )}
              <div className="relative h-8 mb-4">
                {review.elevationEvents.map((event) => {
                  const denom = Math.max(review.actualDistanceKm, 0.1);
                  return (
                    <div
                      key={event.id}
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: `${Math.min(98, (event.distanceKm / denom) * 100)}%` }}
                      title={event.description}
                    >
                      <div
                        className={`w-3 h-3 rounded-full border-2 border-white ${
                          event.impact === 'negative'
                            ? 'bg-red-500'
                            : event.impact === 'positive'
                            ? 'bg-green-500'
                            : 'bg-gray-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* 事件列表 */}
              <div className="space-y-3">
                {review.elevationEvents.map((event) => (
                  <Card key={event.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className={eventTypeColors[event.type] || 'bg-gray-100'}
                            >
                              {eventTypeLabels[event.type] || event.type}
                            </Badge>
                            <span className="text-sm font-medium">
                              {event.distanceKm.toFixed(1)} km · {event.elevationM} m
                            </span>
                            {event.impact === 'negative' && (
                              <Badge variant="destructive" className="text-xs">
                                负面影响
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(event.timestamp).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 洞察 */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>洞察</CardTitle>
              <CardDescription>从事件中提炼的洞察</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {review.insights.map((insight) => (
                <Card
                  key={insight.id}
                  className={`border ${categoryColors[insight.category] || 'bg-gray-50'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[insight.category] || insight.category}
                          </Badge>
                          <h3 className="font-semibold">{insight.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        {insight.evidence && insight.evidence.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">证据：</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {insight.evidence.map((ev, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{ev}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant={insight.userFeedback === 'agree' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleInsightFeedback(insight.id, 'agree')}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        同意
                      </Button>
                      <Button
                        variant={insight.userFeedback === 'disagree' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleInsightFeedback(insight.id, 'disagree')}
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        不同意
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-3 w-3 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 锚点规则 */}
        <TabsContent value="anchors">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Anchor className="h-5 w-5" />
                <CardTitle>锚点规则</CardTitle>
              </div>
              <CardDescription>
                下次自动更稳：基于本次经验生成的规则
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {review.anchorRules.map((rule) => (
                <Card
                  key={rule.id}
                  className={`border ${
                    rule.priority === 'high'
                      ? 'bg-red-50 border-red-200'
                      : rule.priority === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={rule.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {rule.priority === 'high' ? '高优先级' : '中优先级'}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium mb-1">
                          条件：{rule.condition}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          动作：{rule.action}
                        </div>
                        {rule.context && (
                          <div className="text-xs text-muted-foreground italic">
                            {rule.context}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" className="w-full mt-4">
                <Anchor className="h-4 w-4 mr-2" />
                添加新锚点规则
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 确认按钮 */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          稍后确认
        </Button>
        <Button
          onClick={() => {
            setReview((prev) => ({ ...prev, status: 'user_confirmed' }));
            toast.success('复盘已确认');
            navigate(-1);
          }}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          确认复盘
        </Button>
      </div>
    </div>
  );
}

