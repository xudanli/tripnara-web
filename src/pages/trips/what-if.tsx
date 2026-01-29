import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { planningPolicyApi } from '@/api/planning-policy';
import { tripsApi } from '@/api/trips';
import type {
  RobustnessMetrics,
  Candidate,
  DayScheduleResult,
  PlanningPolicy,
  OptimizationSuggestion,
  EvaluateCandidatesResponse,
} from '@/types/strategy';
import type { TripDetail, ScheduleResponse } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Play,
  BarChart3,
  Target,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RiskScoreDisplay, RiskScoreBadge } from '@/components/ui/risk-score-display';
import type { RiskDimension } from '@/components/ui/risk-score-display';

/**
 * 将字符串风险等级转换为风险评分 (0-100)
 */
function riskLevelToScore(riskLevel: string): number {
  const mapping: Record<string, number> = {
    'LOW': 25,
    'MEDIUM': 50,
    'HIGH': 80,
    'CRITICAL': 95,
  };
  return mapping[riskLevel] || 50;
}

export default function WhatIfPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId');
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [, setTrip] = useState<TripDetail | null>(null);
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 评估状态
  const [currentStep, setCurrentStep] = useState<'evaluate' | 'candidates' | 'results'>('evaluate');
  const [baseMetrics, setBaseMetrics] = useState<RobustnessMetrics | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluateCandidatesResponse['data'] | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadTrip();
      loadSchedule();
    }
  }, [tripId, date]);

  const loadTrip = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err: any) {
      setError(err.message || '加载行程失败');
    }
  };

  const loadSchedule = async () => {
    if (!tripId) return;
    try {
      const data = await tripsApi.getSchedule(tripId, date);
      setSchedule(data);
    } catch (err: any) {
      console.error('Failed to load schedule:', err);
    }
  };

  const buildPolicy = (): PlanningPolicy => {
    // 从行程配置构建策略（示例）
    return {
      pacing: {
        hpMax: 100,
        regenRate: 0.3,
        walkSpeedMin: 75,
        forcedRestIntervalMin: 120,
      },
      constraints: {
        maxSingleWalkMin: 30,
        requireWheelchairAccess: false,
        forbidStairs: false,
      },
      weights: {
        tagAffinity: {
          ATTRACTION: 1.0,
          RESTAURANT: 1.2,
        },
        walkPainPerMin: 0.5,
        overtimePenaltyPerMin: 1.0,
      },
    };
  };

  const buildSchedule = (): DayScheduleResult | null => {
    if (!schedule?.schedule) return null;

    const stops: DayScheduleResult['stops'] = schedule.schedule.items.map((item, idx) => ({
      kind: item.type === 'ACTIVITY' ? 'POI' : item.type === 'REST' ? 'REST' : 'MEAL',
      id: item.placeId ? String(item.placeId) : `item-${idx}`,
      name: item.placeName,
      startMin: parseTimeToMinutes(item.startTime),
      endMin: parseTimeToMinutes(item.endTime),
    }));

    return {
      stops,
      metrics: {
        totalTravelMin: schedule.schedule.totalDuration || 0,
        totalWalkMin: 0,
        totalTransfers: 0,
        totalQueueMin: 0,
        overtimeMin: 0,
        hpEnd: 85,
      },
    };
  };

  const parseTimeToMinutes = (timeStr: string | null | undefined | Date): number => {
    try {
      // ✅ 防御性检查：确保 timeStr 是有效值
      if (!timeStr) return 0;
      
      // ✅ 如果是 Date 对象，转换为字符串
      let timeString: string;
      if (timeStr instanceof Date) {
        timeString = timeStr.toISOString();
      } else if (typeof timeStr === 'string') {
        timeString = timeStr;
      } else {
        // 其他类型，尝试转换为字符串
        timeString = String(timeStr);
      }
      
      // ✅ 确保 timeString 是字符串且不为空
      if (typeof timeString !== 'string' || !timeString.trim()) {
        return 0;
      }
      
      // 支持多种时间格式
      let date: Date;
      if (timeString.includes('T') || timeString.includes(' ')) {
        date = parseISO(timeString);
      } else if (timeString.includes(':')) {
        // HH:mm 格式
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + (minutes || 0);
      } else {
        return 0;
      }
      
      // ✅ 确保 date 是有效的 Date 对象
      if (!date || isNaN(date.getTime())) {
        return 0;
      }
      
      return date.getHours() * 60 + date.getMinutes();
    } catch {
      return 0;
    }
  };

  const minutesToTimeString = (minutes: number, dateStr: string): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00.000Z`;
  };

  const handleEvaluateDay = async () => {
    if (!tripId || !schedule) {
      setError('请先加载行程和日程');
      return;
    }

    const daySchedule = buildSchedule();
    if (!daySchedule) {
      setError('无法构建日程数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentStep('evaluate');

      const policy = buildPolicy();
      const placeIds = daySchedule.stops
        .filter((s) => s.kind === 'POI')
        .map((s) => Number(s.id))
        .filter((id) => !isNaN(id));

      const result = await planningPolicyApi.evaluateDay({
        placeIds: placeIds.length > 0 ? placeIds : undefined,
        policy,
        schedule: daySchedule,
        dayEndMin: 1200,
        dateISO: date,
        dayOfWeek: new Date(date).getDay(),
        config: {
          samples: 300,
          seed: 42,
        },
      });

      setBaseMetrics(result.metrics);
      setCurrentStep('candidates');
    } catch (err: any) {
      setError(err.message || '评估失败');
      console.error('Evaluate day error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCandidates = async () => {
    if (!baseMetrics || !schedule) {
      setError('请先完成稳健度评估');
      return;
    }

    const daySchedule = buildSchedule();
    if (!daySchedule) {
      setError('无法构建日程数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await planningPolicyApi.generateCandidates({
        metrics: baseMetrics,
        schedule: daySchedule,
      });

      setCandidates(result.candidates);
      setCurrentStep('results');
    } catch (err: any) {
      setError(err.message || '生成候选方案失败');
      console.error('Generate candidates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateCandidates = async () => {
    if (!candidates.length || !schedule) {
      setError('请先生成候选方案');
      return;
    }

    const daySchedule = buildSchedule();
    if (!daySchedule) {
      setError('无法构建日程数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const policy = buildPolicy();
      const placeIds = daySchedule.stops
        .filter((s) => s.kind === 'POI')
        .map((s) => Number(s.id))
        .filter((id) => !isNaN(id));

      const suggestions: OptimizationSuggestion[] = candidates
        .filter((c) => c.suggestion)
        .map((c) => c.suggestion!);

      const result = await planningPolicyApi.evaluateCandidates({
        placeIds: placeIds.length > 0 ? placeIds : undefined,
        policy,
        schedule: daySchedule,
        dayEndMin: 1200,
        dateISO: date,
        dayOfWeek: new Date(date).getDay(),
        config: {
          samples: 300,
          seed: 42,
        },
        suggestions,
      });

      setEvaluationResult(result);
    } catch (err: any) {
      setError(err.message || '评估候选方案失败');
      console.error('Evaluate candidates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCandidate = async (candidateId: string) => {
    if (!evaluationResult || !tripId) {
      setError('请先完成评估');
      return;
    }

    try {
      setApplying(true);
      setError(null);

      const result = await planningPolicyApi.applyCandidate({
        report: evaluationResult,
        candidateId,
      });

      // 转换策略模块的DayScheduleResult到行程模块的DayScheduleResult
      const scheduleForSave: import('@/types/trip').DayScheduleResult = {
        items: result.schedule.stops.map((stop) => ({
          placeId: stop.kind === 'POI' ? Number(stop.id) : 0,
          placeName: stop.name || '',
          type: stop.kind === 'POI' ? 'ACTIVITY' : stop.kind === 'REST' ? 'REST' : 'MEAL_FLOATING',
          startTime: minutesToTimeString(stop.startMin, date),
          endTime: minutesToTimeString(stop.endMin, date),
          metadata: {},
        })),
        totalDuration: result.schedule.metrics.totalTravelMin,
      };

      // 保存到数据库
      await tripsApi.saveSchedule(tripId, date, scheduleForSave);

      // 重新加载日程
      await loadSchedule();
      setEvaluationResult(null);
      setBaseMetrics(null);
      setCandidates([]);
      setCurrentStep('evaluate');

      alert('方案已成功应用！');
    } catch (err: any) {
      setError(err.message || '应用方案失败');
      console.error('Apply candidate error:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleOneClickEvaluate = async () => {
    if (!tripId || !schedule) {
      setError('请先加载行程和日程');
      return;
    }

    const daySchedule = buildSchedule();
    if (!daySchedule) {
      setError('无法构建日程数据');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setCurrentStep('results');

      const policy = buildPolicy();
      const placeIds = daySchedule.stops
        .filter((s) => s.kind === 'POI')
        .map((s) => Number(s.id))
        .filter((id) => !isNaN(id));

      const result = await planningPolicyApi.whatIfEvaluate({
        placeIds: placeIds.length > 0 ? placeIds : undefined,
        policy,
        schedule: daySchedule,
        dayEndMin: 1200,
        dateISO: date,
        dayOfWeek: new Date(date).getDay(),
        config: {
          samples: 300,
          seed: 42,
        },
        budgetStrategy: {
          baseSamples: 300,
          candidateSamples: 300,
          confirmSamples: 600,
        },
      });

      setEvaluationResult(result);
      setBaseMetrics(result.base.metrics || null);
    } catch (err: any) {
      setError(err.message || '评估失败');
      console.error('What-If evaluate error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div>
          <h1 className="text-3xl font-bold">What-If 分析</h1>
          <p className="text-muted-foreground mt-1">稳健度评估和行程优化建议</p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <Card>
        <CardHeader>
          <CardTitle>评估流程</CardTitle>
          <CardDescription>分步评估或一键评估</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleEvaluateDay} disabled={loading || !tripId} variant="outline">
              {loading && currentStep === 'evaluate' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              步骤1: 评估稳健度
            </Button>
            <Button
              onClick={handleGenerateCandidates}
              disabled={loading || !baseMetrics}
              variant="outline"
            >
              {loading && currentStep === 'candidates' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              步骤2: 生成候选方案
            </Button>
            <Button
              onClick={handleEvaluateCandidates}
              disabled={loading || !candidates.length}
              variant="outline"
            >
              {loading && currentStep === 'results' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Target className="w-4 h-4 mr-2" />
              )}
              步骤3: 评估候选方案
            </Button>
            <Button onClick={handleOneClickEvaluate} disabled={loading || !tripId} variant="default">
              <Zap className="w-4 h-4 mr-2" />
              一键评估
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 评估结果 */}
      <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as any)}>
        <TabsList>
          <TabsTrigger value="evaluate">稳健度评估</TabsTrigger>
          <TabsTrigger value="candidates" disabled={!baseMetrics}>候选方案</TabsTrigger>
          <TabsTrigger value="results" disabled={!evaluationResult}>评估结果</TabsTrigger>
        </TabsList>

        {/* 稳健度指标 */}
        <TabsContent value="evaluate" className="space-y-4">
          {baseMetrics ? (
            <Card>
              <CardHeader>
                <CardTitle>稳健度指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">时间窗口错过概率</div>
                    <div className="text-2xl font-bold">
                      {(baseMetrics.timeWindowMissProb * 100).toFixed(1)}%
                    </div>
                    <Progress value={baseMetrics.timeWindowMissProb * 100} className="mt-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">等待概率</div>
                    <div className="text-2xl font-bold">
                      {(baseMetrics.windowWaitProb * 100).toFixed(1)}%
                    </div>
                    <Progress value={baseMetrics.windowWaitProb * 100} className="mt-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">P10 完成率</div>
                    <div className="text-2xl font-bold">
                      {(baseMetrics.completionRateP10 * 100).toFixed(1)}%
                    </div>
                    <Progress value={baseMetrics.completionRateP10 * 100} className="mt-2" />
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">准时概率</div>
                    <div className="text-2xl font-bold">
                      {(baseMetrics.onTimeProb * 100).toFixed(1)}%
                    </div>
                    <Progress value={baseMetrics.onTimeProb * 100} className="mt-2" />
                  </div>
                </div>
                {/* 风险评估 - 使用新的风险评分组件 */}
                <RiskScoreDisplay
                  overallScore={riskLevelToScore(baseMetrics.riskLevel)}
                  dimensions={[
                    {
                      name: '时间风险',
                      score: baseMetrics.onTimeProb * 10, // 转换为 0-100
                      description: '基于准时概率评估',
                      source: '行程调度算法',
                      confidence: 85,
                    },
                    {
                      name: '完成度风险',
                      score: (1 - baseMetrics.completionRateP10) * 100,
                      description: '基于完成率评估',
                      source: '历史数据分析',
                      confidence: 80,
                    },
                  ]}
                  compact={true}
                />
                
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">总缓冲时间</div>
                      <div className="font-semibold">{baseMetrics.totalBufferMin} 分钟</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">最紧张节点</div>
                      <div className="font-semibold">{baseMetrics.tightestNode}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"步骤1: 评估稳健度"按钮开始评估</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 候选方案 */}
        <TabsContent value="candidates" className="space-y-4">
          {candidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{candidate.title}</CardTitle>
                    <CardDescription>{candidate.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {candidate.suggestion && (
                      <div className="text-sm text-muted-foreground">
                        建议: {candidate.suggestion.reason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"步骤2: 生成候选方案"按钮生成方案</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 评估结果 */}
        <TabsContent value="results" className="space-y-4">
          {evaluationResult ? (
            <>
              {/* 原计划 */}
              <Card>
                <CardHeader>
                  <CardTitle>原计划</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">错过概率</div>
                      <div className="text-lg font-semibold">
                        {(evaluationResult.base.metrics?.timeWindowMissProb || 0) * 100}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">完成率</div>
                      <div className="text-lg font-semibold">
                        {(evaluationResult.base.metrics?.completionRateP10 || 0) * 100}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">准时概率</div>
                      <div className="text-lg font-semibold">
                        {(evaluationResult.base.metrics?.onTimeProb || 0) * 100}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">风险等级</div>
                      <Badge variant="secondary">
                        <RiskScoreBadge 
                          score={riskLevelToScore(evaluationResult.base.metrics?.riskLevel || 'MEDIUM')} 
                          showLabel={true}
                        />
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 候选方案对比 */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">候选方案对比</h2>
                {evaluationResult.candidates.map((candidate) => {
                  const isWinner = candidate.id === evaluationResult.winnerId;
                  return (
                    <Card key={candidate.id} className={isWinner ? 'border-primary bg-primary/5' : ''}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {candidate.title}
                              {isWinner && (
                                <Badge variant="default">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  推荐方案
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>{candidate.description}</CardDescription>
                          </div>
                          <Button
                            onClick={() => handleApplyCandidate(candidate.id)}
                            disabled={applying}
                            size="sm"
                          >
                            {applying ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            应用方案
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* 指标对比 */}
                          {candidate.metrics && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground">错过概率</div>
                                <div className="text-lg font-semibold">
                                  {(candidate.metrics.timeWindowMissProb * 100).toFixed(1)}%
                                </div>
                                {candidate.deltaSummary && (
                                  <div
                                    className={`text-xs ${
                                      candidate.deltaSummary.missDelta < 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {candidate.deltaSummary.missDelta > 0 ? '+' : ''}
                                    {(candidate.deltaSummary.missDelta * 100).toFixed(1)}pp
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">完成率</div>
                                <div className="text-lg font-semibold">
                                  {(candidate.metrics.completionRateP10 * 100).toFixed(1)}%
                                </div>
                                {candidate.deltaSummary && (
                                  <div
                                    className={`text-xs ${
                                      candidate.deltaSummary.completionP10Delta > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {candidate.deltaSummary.completionP10Delta > 0 ? '+' : ''}
                                    {(candidate.deltaSummary.completionP10Delta * 100).toFixed(1)}pp
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">准时概率</div>
                                <div className="text-lg font-semibold">
                                  {(candidate.metrics.onTimeProb * 100).toFixed(1)}%
                                </div>
                                {candidate.deltaSummary && (
                                  <div
                                    className={`text-xs ${
                                      candidate.deltaSummary.onTimeDelta > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {candidate.deltaSummary.onTimeDelta > 0 ? '+' : ''}
                                    {(candidate.deltaSummary.onTimeDelta * 100).toFixed(1)}pp
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">风险等级</div>
                                <RiskScoreBadge 
                                  score={riskLevelToScore(candidate.metrics.riskLevel)} 
                                  showLabel={false}
                                />
                              </div>
                            </div>
                          )}

                          {/* 置信度 */}
                          {candidate.confidence && (
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="text-sm font-medium mb-1">置信度</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{candidate.confidence.level}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {candidate.confidence.reason}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 主要驱动因素 */}
                          {candidate.explainTopDrivers && candidate.explainTopDrivers.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-2">主要改善因素</div>
                              <div className="space-y-1">
                                {candidate.explainTopDrivers.map((driver, idx) => (
                                  <div key={idx} className="text-sm text-muted-foreground">
                                    • {driver.driver}: {driver.deltaPp > 0 ? '+' : ''}
                                    {driver.deltaPp}pp
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 风险警告 */}
              {evaluationResult.riskWarning && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <p className="text-yellow-800">{evaluationResult.riskWarning}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>点击"步骤3: 评估候选方案"或"一键评估"按钮查看结果</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

