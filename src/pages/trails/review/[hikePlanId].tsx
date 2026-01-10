import { useState } from 'react';
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

export default function HikeReviewPage() {
  const { hikePlanId } = useParams<{ hikePlanId: string }>();
  const navigate = useNavigate();

  // 模拟复盘数据
  const [review, setReview] = useState<HikeReview>({
    id: 'review-1',
    hikePlanId: hikePlanId || '',
    trailId: 'trail-1',
    completedDate: new Date().toISOString(),
    actualDistanceKm: 15.2,
    actualDurationMin: 420,
    actualElevationGainedM: 850,
    elevationEvents: [
      {
        id: 'event-1',
        type: 'delay',
        distanceKm: 5.2,
        elevationM: 1200,
        timestamp: new Date().toISOString(),
        description: '在 5.2km 处因风大延误 30 分钟',
        impact: 'negative',
      },
      {
        id: 'event-2',
        type: 'fatigue',
        distanceKm: 8.5,
        elevationM: 1500,
        timestamp: new Date().toISOString(),
        description: '在 8.5km 处明显疲劳，休息 20 分钟',
        impact: 'negative',
      },
      {
        id: 'event-3',
        type: 'turnaround',
        distanceKm: 12.0,
        elevationM: 1800,
        timestamp: new Date().toISOString(),
        description: '在 12km 处因时间不足提前折返',
        impact: 'neutral',
      },
    ],
    insights: [
      {
        id: 'insight-1',
        category: 'friction',
        title: '暴露山脊段风大影响节奏',
        description: '在 5-6km 的暴露山脊段，风速超过 10m/s 时明显影响行进速度',
        evidence: ['事件记录：5.2km 处延误 30 分钟', '天气数据：风速 10.5m/s'],
      },
      {
        id: 'insight-2',
        category: 'rhythm',
        title: '日爬升超过 900m 会明显疲劳',
        description: '实际爬升 850m，在 8.5km 处已明显疲劳，建议下次改为 2 天行程',
        evidence: ['事件记录：8.5km 处疲劳', '实际爬升：850m'],
      },
      {
        id: 'insight-3',
        category: 'highlight',
        title: '日落前 90 分钟必须在下撤段',
        description: '本次在 12km 处折返，刚好在日落前 90 分钟，时间控制合理',
        evidence: ['事件记录：12km 折返', '日落时间：18:30'],
      },
    ],
    anchorRules: [
      {
        id: 'rule-1',
        condition: '风速 > 12m/s 的暴露山脊',
        action: '不走',
        context: '下次自动更稳',
        priority: 'high',
      },
      {
        id: 'rule-2',
        condition: '每日爬升 > 900m',
        action: '改 2 天',
        context: '避免明显疲劳',
        priority: 'high',
      },
      {
        id: 'rule-3',
        condition: '日落前 90 分钟',
        action: '必须在下撤段',
        context: '确保安全返回',
        priority: 'high',
      },
    ],
    status: 'generated',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleInsightFeedback = (insightId: string, vote: 'agree' | 'disagree') => {
    setReview((prev) => ({
      ...prev,
      insights: prev.insights.map((insight) =>
        insight.id === insightId ? { ...insight, userFeedback: vote } : insight
      ),
    }));
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">徒步复盘</h1>
        <p className="text-muted-foreground">
          证据 → 洞察 → 锚点沉淀
        </p>
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
              {/* 海拔剖面图占位 */}
              <div className="h-64 bg-muted rounded-lg mb-6 flex items-center justify-center text-muted-foreground relative">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p>交互式海拔剖面图</p>
                  <p className="text-xs mt-1">事件钉子标注在对应位置</p>
                </div>
                {/* 模拟事件标记 */}
                {review.elevationEvents.map((event) => (
                  <div
                    key={event.id}
                    className="absolute"
                    style={{
                      left: `${(event.distanceKm / review.actualDistanceKm) * 100}%`,
                      bottom: `${(event.elevationM / 2000) * 100}%`,
                    }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full border-2 border-white ${
                        event.impact === 'negative'
                          ? 'bg-red-500'
                          : event.impact === 'positive'
                          ? 'bg-green-500'
                          : 'bg-gray-500'
                      }`}
                      title={event.description}
                    />
                  </div>
                ))}
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

