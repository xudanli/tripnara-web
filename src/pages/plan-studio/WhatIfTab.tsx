import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import type { PersonaMode } from '@/components/common/PersonaModeToggle';
import { tripsApi } from '@/api/trips';
import { planningPolicyApi } from '@/api/planning-policy';
import type { TripDetail, ScheduleItem } from '@/types/trip';
import type { WhatIfEvaluateRequest, Candidate, PlanningPolicy, ScheduleStop, ScheduleMetrics } from '@/types/strategy';
import { toast } from 'sonner';

interface WhatIfTabProps {
  tripId: string;
  personaMode?: PersonaMode;
}

export default function WhatIfTab({ tripId, personaMode = 'abu' }: WhatIfTabProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [scenarios, setScenarios] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  const loadTrip = async () => {
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  const handleCompare = async () => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      toast.error(t('planStudio.whatIfTab.noTripData'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 获取第一个日期的 Schedule
      const firstDay = trip.TripDay[0];
      const scheduleResponse = await tripsApi.getSchedule(tripId, firstDay.date);

      if (!scheduleResponse.schedule) {
        toast.error(t('planStudio.whatIfTab.noSchedule'));
        return;
      }

      // 收集地点 ID
      const placeIds: number[] = [];
      const poiLookup: Record<string, any> = {};
      
      for (const day of trip.TripDay) {
        if (day.ItineraryItem) {
          for (const item of day.ItineraryItem) {
            if (item.placeId && !placeIds.includes(item.placeId)) {
              placeIds.push(item.placeId);
              if (item.Place) {
                poiLookup[item.placeId.toString()] = {
                  id: item.placeId,
                  name: item.Place.nameCN || item.Place.nameEN,
                  category: item.Place.category,
                  location: {
                    lat: item.Place.metadata?.latitude || 0,
                    lng: item.Place.metadata?.longitude || 0,
                  },
                };
              }
            }
          }
        }
      }

      // 构建规划策略（根据 personaMode）
      // 注意：PlanningPolicy 的实际结构需要根据后端要求调整
      const policy: PlanningPolicy = {
        pacing: {
          hpMax: personaMode === 'abu' ? 100 : personaMode === 'dre' ? 80 : 90,
          regenRate: personaMode === 'abu' ? 10 : personaMode === 'dre' ? 15 : 12,
          walkSpeedMin: 4.0,
          forcedRestIntervalMin: 120,
        },
        constraints: {
          maxSingleWalkMin: personaMode === 'abu' ? 60 : personaMode === 'dre' ? 90 : 75,
          requireWheelchairAccess: false,
          forbidStairs: false,
        },
        weights: {
          tagAffinity: {},
          walkPainPerMin: personaMode === 'abu' ? 0.1 : personaMode === 'dre' ? 0.05 : 0.08,
          overtimePenaltyPerMin: personaMode === 'abu' ? 0.2 : personaMode === 'dre' ? 0.1 : 0.15,
        },
      };

      // 计算 dayEndMin（一天的结束时间，以分钟为单位）
      const dayEnd = new Date(firstDay.date);
      dayEnd.setHours(22, 0, 0, 0); // 假设晚上10点结束
      const dayEndMin = dayEnd.getHours() * 60 + dayEnd.getMinutes();

      // 获取星期几（0 = 周日, 1 = 周一, ...）
      const dayOfWeek = new Date(firstDay.date).getDay();

      // 构建 What-If 评估请求
      // 需要将 trip.DayScheduleResult 转换为 strategy.DayScheduleResult
      // 如果 schedule 存在，则转换；否则使用默认值
      const scheduleForWhatIf: { stops: ScheduleStop[]; metrics: ScheduleMetrics } = scheduleResponse.schedule ? {
        stops: scheduleResponse.schedule.items.map((item: ScheduleItem, idx: number): ScheduleStop => {
          // 将时间字符串转换为分钟数（从一天开始）
          const startDate = new Date(`2000-01-01T${item.startTime}`);
          const endDate = new Date(`2000-01-01T${item.endTime}`);
          const startMin = startDate.getHours() * 60 + startDate.getMinutes();
          const endMin = endDate.getHours() * 60 + endDate.getMinutes();
          
          // 将 ItineraryItemType 映射到 ScheduleStop kind
          let kind: 'POI' | 'REST' | 'MEAL' | 'TRANSIT' = 'POI';
          if (item.type === 'REST') kind = 'REST';
          else if (item.type === 'MEAL_FLOATING' || item.type === 'MEAL_ANCHOR') kind = 'MEAL';
          else if (item.type === 'TRANSIT') kind = 'TRANSIT';
          
          return {
            kind,
            id: item.placeId?.toString() || `item-${idx}`,
            name: item.placeName || '',
            startMin,
            endMin,
            lat: item.metadata?.lat || item.metadata?.latitude,
            lng: item.metadata?.lng || item.metadata?.longitude,
          };
        }),
        metrics: {
          totalTravelMin: scheduleResponse.schedule.totalDuration || 0,
          totalWalkMin: 0,
          totalTransfers: 0,
          totalQueueMin: 0,
          overtimeMin: 0,
          hpEnd: 100,
        },
      } : {
        stops: [],
        metrics: {
          totalTravelMin: 0,
          totalWalkMin: 0,
          totalTransfers: 0,
          totalQueueMin: 0,
          overtimeMin: 0,
          hpEnd: 100,
        },
      };

      const request: WhatIfEvaluateRequest = {
        placeIds,
        poiLookup,
        policy,
        schedule: scheduleForWhatIf,
        dayEndMin,
        dateISO: firstDay.date,
        dayOfWeek,
        config: {
          samples: 3, // 生成3个候选方案
        },
      };

      // 调用 What-If 评估接口
      const response = await planningPolicyApi.whatIfEvaluate(request);
      
      // 转换响应为场景列表
      const candidates = response.candidates || [];
      setScenarios(candidates);

      if (candidates.length === 0) {
        toast.warning(t('planStudio.whatIfTab.noCandidates'));
      } else {
        toast.success(t('planStudio.whatIfTab.generateSuccess', { count: candidates.length }));
      }
    } catch (err: any) {
      console.error('Failed to compare scenarios:', err);
      const errorMessage = err.message || t('planStudio.whatIfTab.generateFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('planStudio.whatIfTab.title')}</CardTitle>
          <CardDescription>{t('planStudio.whatIfTab.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCompare} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                {t('planStudio.whatIfTab.generating')}
              </>
            ) : (
              t('planStudio.whatIfTab.generateComparison')
            )}
          </Button>

          {error && (
            <Card className="border-red-200 bg-red-50 mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {scenarios.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {scenarios.map((scenario) => {
                const metrics = scenario.metrics;
                // 从 RobustnessMetrics 中提取数据
                const completionRate = metrics ? (metrics.completionRateP10 * 10).toFixed(1) : '0';
                const onTimeProb = metrics ? (metrics.onTimeProb * 10).toFixed(1) : '0';
                const riskLevel = metrics?.riskLevel || 'LOW';
                const riskValue = riskLevel === 'HIGH' ? 8 : riskLevel === 'MEDIUM' ? 5 : 2;

                return (
                <Card key={scenario.id} className="cursor-pointer hover:border-primary">
                  <CardHeader>
                      <CardTitle className="text-lg">{scenario.title || scenario.description || `方案 ${scenario.id}`}</CardTitle>
                      {scenario.description && (
                        <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                      )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                      {metrics && (
                        <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                              {t('planStudio.whatIfTab.completionRate')}
                      </span>
                            <Badge>{completionRate}/10</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                              {t('planStudio.whatIfTab.onTimeProb')}
                      </span>
                            <Badge>{onTimeProb}/10</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                              {t('planStudio.whatIfTab.risk')}
                      </span>
                            <Badge variant={riskValue > 5 ? 'destructive' : 'outline'}>
                              {riskLevel}
                      </Badge>
                    </div>
                          {metrics.totalBufferMin && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {t('planStudio.whatIfTab.totalBuffer')}
                              </span>
                              <span className="font-semibold">{Math.floor(metrics.totalBufferMin / 60)}h {metrics.totalBufferMin % 60}m</span>
                            </div>
                          )}
                        </>
                      )}
                      {scenario.impactCost && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {t('planStudio.whatIfTab.impactSeverity')}: {scenario.impactCost.severity}
                          </div>
                        </div>
                      )}
                      <Button 
                        className="w-full mt-4"
                        onClick={async () => {
                          try {
                            // 应用候选方案
                            await planningPolicyApi.applyCandidate({
                              report: { 
                                base: scenarios[0] || scenario, 
                                candidates: scenarios, 
                                winnerId: scenario.id 
                              },
                              candidateId: scenario.id,
                            });
                            toast.success(t('planStudio.whatIfTab.applySuccess'));
                            // 重新加载数据
                            await loadTrip();
                          } catch (err: any) {
                            toast.error(err.message || t('planStudio.whatIfTab.applyFailed'));
                          }
                        }}
                      >
                        {t('planStudio.whatIfTab.applyScenario')}
                      </Button>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

