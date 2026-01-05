import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Brain, Wrench, CheckCircle2, XCircle, AlertTriangle, BarChart3, TrendingUp, FileText, ClipboardCheck } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
// PersonaMode 已移除 - 三人格现在是系统内部工具
import { tripsApi } from '@/api/trips';
// decisionApi 已移除 - 不再直接调用决策接口，改为通过 LangGraph Orchestrator
import { readinessApi } from '@/api/readiness';
import type { PersonaAlert, TripDetail, TripMetricsResponse, IntentResponse } from '@/types/trip';
// 以下类型已移除，因为不再直接调用决策接口
// import type { ValidateSafetyRequest, AdjustPacingRequest, ReplaceNodesRequest, RoutePlanDraft, WorldModelContext, RouteSegment, DEMEvidenceItem } from '@/types/strategy';
import { formatCurrency } from '@/utils/format';

interface PlanStudioSidebarProps {
  tripId: string;
  onOpenReadinessDrawer?: (findingId?: string) => void;
}

export default function PlanStudioSidebar({ tripId, onOpenReadinessDrawer }: PlanStudioSidebarProps) {
  const { t, i18n } = useTranslation();
  
  // 获取当前语言代码（'zh' 或 'en'）
  const getLangCode = () => {
    const lang = i18n.language || 'en';
    return lang.startsWith('zh') ? 'zh' : 'en';
  };
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<PersonaAlert[]>([]);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [processing, setProcessing] = useState(false);
  const [metrics, setMetrics] = useState<TripMetricsResponse | null>(null);
  const [intent, setIntent] = useState<IntentResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [neptuneReplacements, setNeptuneReplacements] = useState<any[]>([]); // 存储 Neptune 修复建议
  const [operationResult, setOperationResult] = useState<{ type: 'success' | 'info' | 'warning'; message: string } | null>(null); // 存储操作结果
  const [readinessSummary, setReadinessSummary] = useState<{ totalBlockers: number; totalMust: number; totalShould: number; totalOptional: number; risks: number } | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  
  // 显示所有人格的提醒，不再根据 personaMode 过滤
  // 去重：根据 alert.id 去重，避免重复显示
  // 如果 id 不存在，使用 title + message 作为唯一标识
  const uniqueAlerts = alerts.filter((alert, index, self) => {
    const identifier = alert.id || `${alert.title}-${alert.message}`;
    return index === self.findIndex(a => {
      const otherIdentifier = a.id || `${a.title}-${a.message}`;
      return otherIdentifier === identifier;
    });
  });
  
  // 按人格分组，用于显示筛选器
  const [filterPersona, setFilterPersona] = useState<'all' | 'ABU' | 'DR_DRE' | 'NEPTUNE'>('all');
  const filteredAlerts = filterPersona === 'all' 
    ? uniqueAlerts 
    : uniqueAlerts.filter(alert => alert.persona === filterPersona);
  
  // 按人格分组的数据
  const abuAlerts = uniqueAlerts.filter(alert => alert.persona === 'ABU');
  const drDreAlerts = uniqueAlerts.filter(alert => alert.persona === 'DR_DRE');
  const neptuneAlerts = uniqueAlerts.filter(alert => alert.persona === 'NEPTUNE');

  useEffect(() => {
    loadPersonaAlerts();
    loadTrip();
    loadMetrics();
    loadIntent();
    loadReadinessSummary();
  }, [tripId]);
  
  const loadReadinessSummary = async () => {
    if (!tripId) return;
    try {
      setLoadingReadiness(true);
      const result = await readinessApi.getTripReadiness(tripId, getLangCode()).catch(() => null);
      if (result) {
        const risks = result.risks?.length || result.findings?.flatMap(f => f.risks || []).length || 0;
        setReadinessSummary({
          totalBlockers: result.summary.totalBlockers,
          totalMust: result.summary.totalMust,
          totalShould: result.summary.totalShould,
          totalOptional: result.summary.totalOptional,
          risks,
        });
      }
    } catch (err) {
      console.error('Failed to load readiness summary:', err);
    } finally {
      setLoadingReadiness(false);
    }
  };

  const loadPersonaAlerts = async () => {
    if (!tripId) return;
    
    try {
      setLoading(true);
      const data = await tripsApi.getPersonaAlerts(tripId);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load persona alerts:', err);
      // 失败时使用空数组，不阻塞UI
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrip = async () => {
    if (!tripId) return;
    
    try {
      const data = await tripsApi.getById(tripId);
      setTrip(data);
    } catch (err) {
      console.error('Failed to load trip:', err);
    }
  };

  const loadMetrics = async () => {
    if (!tripId) return;
    
    try {
      setLoadingMetrics(true);
      const data = await tripsApi.getMetrics(tripId);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      // 失败时不阻塞UI，使用空值
      setMetrics(null);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadIntent = async () => {
    if (!tripId) return;
    
    try {
      const data = await tripsApi.getIntent(tripId);
      setIntent(data);
    } catch (err) {
      console.error('Failed to load intent:', err);
      // 失败时不阻塞UI，使用空值
      setIntent(null);
    }
  };

  // 计算两点间距离（公里）- Haversine公式
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 构建 RoutePlanDraft（从行程数据构建）
  // 此函数已废弃，因为不再直接调用决策接口
  /*
  const buildRoutePlanDraft = (): any | null => {
    if (!trip || !trip.TripDay || trip.TripDay.length === 0) {
      return null;
    }

    const segments: RoutePlanDraft['segments'] = [];
    
    // 从行程数据构建 segments
    trip.TripDay.forEach((day, dayIndex) => {
      if (day.ItineraryItem && day.ItineraryItem.length > 0) {
        day.ItineraryItem.forEach((item, index) => {
          if (item.Place && index > 0) {
            const prevItem = day.ItineraryItem[index - 1];
            if (prevItem?.Place) {
              // 获取位置信息（从 metadata 中获取）
              const fromLat = prevItem.Place.metadata?.location?.lat || 
                             (prevItem.Place.metadata as any)?.lat || 0;
              const fromLng = prevItem.Place.metadata?.location?.lng || 
                             (prevItem.Place.metadata as any)?.lng || 0;
              const toLat = item.Place.metadata?.location?.lat || 
                           (item.Place.metadata as any)?.lat || 0;
              const toLng = item.Place.metadata?.location?.lng || 
                           (item.Place.metadata as any)?.lng || 0;
              
              // 计算距离
              const distanceKm = calculateDistance(fromLat, fromLng, toLat, toLng);
              
              // 获取爬升和坡度（从 metadata 中获取）
              const ascentM = item.Place.metadata?.physicalMetadata?.elevationGainM || 
                             (item.Place.metadata as any)?.elevationGainM || 0;
              const slopePct = item.Place.metadata?.physicalMetadata?.slopePct || 
                               (item.Place.metadata as any)?.slopePct || 0;
              
              segments.push({
                segmentId: `seg-${day.id}-${index}`,
                dayIndex: dayIndex,
                distanceKm: distanceKm,
                ascentM: ascentM,
                slopePct: slopePct,
                metadata: {
                  fromPlaceId: String(prevItem.Place.id),
                  toPlaceId: String(item.Place.id),
                },
              });
            }
          }
        });
      }
    });

    return {
      tripId: trip.id,
      routeDirectionId: (trip as any).routeDirectionId || '', // 从 trip 数据中获取
      segments,
    };
  };

  // 构建 WorldModelContext（从行程数据构建 DEM 证据）
  const buildWorldModelContext = (): WorldModelContext | null => {
    if (!trip) return null;

    const countryCode = trip.destination || '';
    const month = new Date(trip.startDate).getMonth() + 1;

    // 从 segments 构建 DEM 证据
    const plan = buildRoutePlanDraft();
    const demEvidence: any[] = [];
    
    if (plan && plan.segments.length > 0) {
      // 计算3天滚动爬升
      let rollingAscent3Days = 0;
      const last3DaysSegments: any[] = [];
      
      plan.segments.forEach((segment: any, index: number) => {
        // 收集最近3天的 segments
        if (segment.dayIndex >= Math.max(0, plan.segments[plan.segments.length - 1].dayIndex - 2)) {
          last3DaysSegments.push(segment);
          rollingAscent3Days += segment.ascentM;
        }
        
        // 为每个 segment 创建 DEM 证据
        demEvidence.push({
          segmentId: segment.segmentId,
          elevationProfile: [], // 实际应从 DEM API 获取
          cumulativeAscent: segment.ascentM,
          maxSlopePct: segment.slopePct || 0,
          rollingAscent3Days: rollingAscent3Days,
          fatigueIndex: 0, // 需要计算
          violation: 'NONE',
          explanation: `路段 ${segment.segmentId} 的 DEM 数据`,
        });
      });
    } else {
      // 如果没有 segments，至少提供一个占位符 DEM 证据
      demEvidence.push({
        segmentId: 'placeholder-seg-1',
        elevationProfile: [],
        cumulativeAscent: 0,
        maxSlopePct: 0,
        rollingAscent3Days: 0,
        fatigueIndex: 0,
        violation: 'NONE',
        explanation: 'DEM 数据待从行程数据中提取',
      });
    }

    return {
      physical: {
        demEvidence, // 现在包含实际的 DEM 证据数据
        roadStates: [],
        hazardZones: [],
        ferryStates: [],
        countryCode,
        month,
      },
      human: {
        maxDailyAscentM: 1000,
        rollingAscent3DaysM: 2500,
        maxSlopePct: 20,
        weatherRiskWeight: 0.5,
        bufferDayBias: 'MEDIUM',
        riskTolerance: 'MEDIUM',
      },
      routeDirection: {
        id: (trip as any).routeDirectionId || '',
        nameCN: trip.destination || '',
        nameEN: trip.destination || '',
        countryCode,
      },
    };
  };

  // 手动操作函数已移除 - 三人格现在由系统自动调用
  // 以下函数已废弃，保留作为参考：
  /*
  const handleValidateSafety = async () => {
    if (!trip) {
      toast.error(t('planStudio.sidebar.noTripData'));
      return;
    }

    try {
      setProcessing(true);
      const plan = buildRoutePlanDraft();
      const worldContext = buildWorldModelContext();

      if (!plan || !worldContext) {
        toast.warning(t('planStudio.sidebar.insufficientData'));
        return;
      }

      const request: ValidateSafetyRequest = {
        tripId: trip.id,
        plan,
        worldContext,
      };

      const result = await decisionApi.validateSafety(request);
      
      if (result.allowed) {
        toast.success(t('planStudio.sidebar.abu.validationPassed'));
      } else {
        toast.warning(t('planStudio.sidebar.abu.validationFailed', { 
          violations: result.violations.length 
        }));
      }

      // 重新加载所有数据以更新状态
      await Promise.all([
        loadPersonaAlerts(),
        loadTrip(),
        loadMetrics(),
        loadIntent(),
      ]);
    } catch (err: any) {
      console.error('Failed to validate safety:', err);
      toast.error(err.message || t('planStudio.sidebar.abu.validationError'));
    } finally {
      setProcessing(false);
    }
  };
  */

  /*
  const handleAdjustPacing = async () => {
    if (!trip) {
      toast.error(t('planStudio.sidebar.noTripData'));
      return;
    }

    try {
      setProcessing(true);
      const plan = buildRoutePlanDraft();
      const worldContext = buildWorldModelContext();

      if (!plan || !worldContext) {
        toast.warning(t('planStudio.sidebar.insufficientData'));
        return;
      }

      const request: AdjustPacingRequest = {
        tripId: trip.id,
        plan,
        worldContext,
      };

      const result = await decisionApi.adjustPacing(request);
      
      if (result.success) {
        if (result.changes && result.changes.length > 0) {
          const message = t('planStudio.sidebar.dre.pacingAdjusted', { 
            changes: result.changes.length 
          });
          toast.success(message);
          setOperationResult({ type: 'success', message });
          
          // 如果有调整后的计划，可以在这里应用（如果需要）
          // if (result.adjustedPlan) {
          //   // 应用调整后的计划
          // }
        } else {
          // 如果没有变更，显示后端返回的消息
          const message = result.message || t('planStudio.sidebar.dre.pacingAdjusted', { changes: 0 });
          toast.info(message);
          setOperationResult({ type: 'info', message });
        }
      } else {
        // 如果 success 为 false，显示后端返回的消息（通常是"无需调整"等信息）
        const message = result.message || t('planStudio.sidebar.dre.pacingAdjustFailed');
        toast.info(message);
        setOperationResult({ type: 'info', message });
      }

      // 重新加载所有数据以更新状态
      await Promise.all([
        loadPersonaAlerts(),
        loadTrip(),
        loadMetrics(),
        loadIntent(),
      ]);
    } catch (err: any) {
      console.error('Failed to adjust pacing:', err);
      toast.error(err.message || t('planStudio.sidebar.dre.pacingError'));
    } finally {
      setProcessing(false);
    }
  };
  */

  /*
  const handleReplaceNodes = async () => {
    if (!trip) {
      toast.error(t('planStudio.sidebar.noTripData'));
      return;
    }

    try {
      setProcessing(true);
      const plan = buildRoutePlanDraft();
      const worldContext = buildWorldModelContext();

      if (!plan || !worldContext) {
        toast.warning(t('planStudio.sidebar.insufficientData'));
        return;
      }

      // 从 alerts 中获取不可用的节点
      const neptuneAlerts = alerts.filter(alert => 
        alert.persona === 'NEPTUNE' && 
        (alert.metadata?.type === 'REPLACE_NODE' || alert.metadata?.type === 'UNAVAILABLE_NODE')
      );
      
      const unavailableNodes: ReplaceNodesRequest['unavailableNodes'] = neptuneAlerts.map(alert => ({
        nodeId: alert.metadata?.nodeId || alert.metadata?.itemId || alert.id,
        reason: alert.metadata?.reason || alert.message || 'unavailable',
      }));

      // 如果没有不可用的节点，提示用户
      if (unavailableNodes.length === 0) {
        toast.warning(t('planStudio.sidebar.neptune.noUnavailableNodes'));
        // 可以选择不调用 API，或者提供一个占位符节点
        // 这里我们提供一个占位符，让后端知道需要检查所有节点
        unavailableNodes.push({
          nodeId: 'placeholder-check-all',
          reason: 'check_all_nodes',
        });
      }

      const request: ReplaceNodesRequest = {
        tripId: trip.id,
        plan,
        worldContext,
        unavailableNodes,
      };

      const result = await decisionApi.replaceNodes(request);
      
      if (result.success) {
        if (result.replacements && result.replacements.length > 0) {
          // 保存修复建议供 UI 显示
          setNeptuneReplacements(result.replacements);
          
          toast.success(t('planStudio.sidebar.neptune.nodesReplaced', { 
            replacements: result.replacements.length 
          }));
          
          // 如果有替换后的计划，可以在这里应用（如果需要）
          // if (result.replacedPlan) {
          //   // 应用替换后的计划
          // }
        } else {
          // 如果没有替换，清空之前的建议
          setNeptuneReplacements([]);
          // 如果没有替换，显示后端返回的消息
          toast.info(result.message || t('planStudio.sidebar.neptune.nodesReplaced', { replacements: 0 }));
        }
      } else {
        // 如果 success 为 false，清空之前的建议
        setNeptuneReplacements([]);
        // 如果 success 为 false，显示后端返回的消息
        toast.info(result.message || t('planStudio.sidebar.neptune.replaceFailed'));
      }

      // 重新加载所有数据以更新状态
      await Promise.all([
        loadPersonaAlerts(),
        loadTrip(),
        loadMetrics(),
        loadIntent(),
      ]);
    } catch (err: any) {
      console.error('Failed to replace nodes:', err);
      toast.error(err.message || t('planStudio.sidebar.neptune.replaceError'));
    } finally {
      setProcessing(false);
    }
  };
  */

  // 从提醒中提取门控状态和违规数量（Abu视图）
  const abuGatingStatus: 'ALLOW' | 'WARN' | 'BLOCK' = 
    filteredAlerts.some(a => a.severity === 'warning' && a.metadata?.action === 'REJECT') ? 'BLOCK' :
    filteredAlerts.some(a => a.severity === 'warning') ? 'WARN' : 'ALLOW';
  
  const abuViolations = {
    hard: filteredAlerts.filter(a => a.severity === 'warning' && a.metadata?.action === 'REJECT').length,
    soft: filteredAlerts.filter(a => a.severity === 'warning' && a.metadata?.action !== 'REJECT').length,
  };

  // 从 API 数据计算 Dr.Dre 指标
  // 计算总耗时（从实际行程项计算）
  const calculateTotalTime = (trip: TripDetail | null): number => {
    if (!trip || !trip.TripDay) return 0;
    
    let totalMinutes = 0;
    for (const day of trip.TripDay) {
      if (day.ItineraryItem) {
        for (const item of day.ItineraryItem) {
          if (item.startTime && item.endTime) {
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60); // 转换为分钟
            if (duration > 0) {
              totalMinutes += duration;
            }
          }
        }
      }
    }
    return totalMinutes;
  };

  const dreMetrics = (() => {
    // 如果没有 metrics 或 trip，返回 null 表示数据未加载
    if (!metrics || !trip) {
      return null;
    }

    // 从实际行程项计算总耗时
    const timeTotal = calculateTotalTime(trip);

    // 从 summary 获取数据
    const summary = metrics.summary;
    
    // 检查 summary 是否存在且包含必要字段
    // 如果字段不存在，使用 undefined 而不是 0，这样可以在 UI 中显示"加载中"
    const bufferTotal = summary?.totalBuffer !== undefined ? summary.totalBuffer : undefined;
    const costEstimate = summary?.totalCost !== undefined ? summary.totalCost : undefined;
    
    // 从 intent 获取权重（根据 planningPolicy 映射，或使用默认值）
    // planningPolicy 可能是 'safe' | 'experience' | 'challenge'，需要映射到权重
    const getWeightsFromPolicy = (policy?: string) => {
      switch (policy) {
        case 'safe':
          return { comfort: 50, experience: 30, cost: 20 };
        case 'experience':
          return { comfort: 30, experience: 50, cost: 20 };
        case 'challenge':
          return { comfort: 20, experience: 40, cost: 40 };
        default:
          return { comfort: 40, experience: 30, cost: 30 };
      }
    };
    
    const weights = getWeightsFromPolicy((intent as any)?.planningPolicy);

    // 计算平均疲劳指数（从所有日期的疲劳指数计算）
    const totalFatigue = metrics.days.reduce((sum, day) => sum + day.metrics.fatigue, 0);
    const avgFatigue = metrics.days.length > 0 ? Math.round(totalFatigue / metrics.days.length) : 0;

    // 计算总爬升（从所有日期计算）
    const totalAscent = metrics.days.reduce((sum, day) => sum + day.metrics.ascent, 0);

    return {
      timeTotal,
      bufferTotal,
      fatigueScore: avgFatigue,
      ascent: totalAscent,
      costEstimate,
      weights,
    };
  })();

  // 从 alerts 计算 Neptune 修复数据
  // 如果没有数据，返回 null 表示数据未加载
  const neptuneFixes = (() => {
    // 如果还在加载中，返回 null
    if (loading) {
      return null;
    }
    
    // 使用上面定义的 neptuneAlerts（从 uniqueAlerts 中过滤）
    const total = neptuneAlerts.length;
    
    // 从 alerts 的 metadata 中提取修复信息
    let replacePoints = 0;
    let moveTimeSlots = 0;
    
    neptuneAlerts.forEach(alert => {
      if (alert.metadata?.type === 'REPLACE_NODE') {
        replacePoints++;
      } else if (alert.metadata?.type === 'MOVE_TIME_SLOT') {
        moveTimeSlots++;
      }
    });
    
    // 已应用的修复数量（如果有状态标记）
    const applied = neptuneAlerts.filter(alert => alert.metadata?.status === 'APPLIED').length;
    
    return {
      total,
      applied,
    minimalChanges: {
        replacePoints,
        moveTimeSlots,
    },
  };
  })();

  const getStatusIcon = (status: 'ALLOW' | 'WARN' | 'BLOCK') => {
    switch (status) {
      case 'ALLOW':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'WARN':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'BLOCK':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'ALLOW' | 'WARN' | 'BLOCK') => {
    switch (status) {
      case 'ALLOW':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'WARN':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'BLOCK':
        return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  // 策略预览卡片（顶部）- 显示所有人格的数据
  const renderStrategyPreview = () => {
    // Abu 预览卡片
    const renderAbuPreview = () => {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-red-600" />
              {t('planStudio.sidebar.abu.gatingStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-3 border rounded-lg ${getStatusColor(abuGatingStatus)}`}>
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(abuGatingStatus)}
                <span className="font-semibold">
                  {t(`planStudio.sidebar.abu.status.${abuGatingStatus.toLowerCase()}`)}
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div>{t('planStudio.sidebar.abu.hardViolations', { count: abuViolations.hard })}</div>
                <div>{t('planStudio.sidebar.abu.softViolations', { count: abuViolations.soft })}</div>
              </div>
            </div>
            <Button variant="outline" className="w-full" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              {t('planStudio.sidebar.abu.viewEvidence')}
            </Button>
          </CardContent>
        </Card>
      );
    };

    // Dr.Dre 预览卡片
    const renderDrDrePreview = () => {
      if (loadingMetrics) {
        return (
          <div className="flex items-center justify-center py-4">
            <Spinner className="w-4 h-4" />
          </div>
        );
      }

      // 如果数据未加载，显示加载状态
      if (!dreMetrics) {
        return (
          <div className="flex items-center justify-center py-4">
            {loadingMetrics ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('planStudio.sidebar.loading')}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 border rounded">
              <div className="text-xs text-muted-foreground">{t('planStudio.sidebar.dre.totalTime')}</div>
              <div className="font-semibold">{Math.floor(dreMetrics.timeTotal / 60)}h</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-xs text-muted-foreground">{t('planStudio.sidebar.dre.totalBuffer')}</div>
              <div className="font-semibold">
                {dreMetrics.bufferTotal !== undefined 
                  ? `${Math.floor(dreMetrics.bufferTotal / 60)}h` 
                  : t('planStudio.sidebar.loading')}
              </div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-xs text-muted-foreground">{t('planStudio.sidebar.dre.fatigueScore')}</div>
              <div className="font-semibold">{dreMetrics.fatigueScore}</div>
            </div>
            <div className="p-2 border rounded">
              <div className="text-xs text-muted-foreground">{t('planStudio.sidebar.dre.estimatedCost')}</div>
              <div className="font-semibold">
                {dreMetrics.costEstimate !== undefined 
                  ? formatCurrency(dreMetrics.costEstimate, trip?.budgetConfig?.currency || 'CNY')
                  : t('planStudio.sidebar.loading')}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">{t('planStudio.sidebar.dre.currentWeights')}</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>{t('planStudio.sidebar.dre.comfort')}</span>
                <span className="font-medium">{dreMetrics.weights.comfort}%</span>
              </div>
              <div className="flex justify-between">
                <span>{t('planStudio.sidebar.dre.experience')}</span>
                <span className="font-medium">{dreMetrics.weights.experience}%</span>
              </div>
              <div className="flex justify-between">
                <span>{t('planStudio.sidebar.dre.cost')}</span>
                <span className="font-medium">{dreMetrics.weights.cost}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Neptune 预览卡片
    const renderNeptunePreview = () => {
      // 如果数据未加载，显示加载状态
      if (!neptuneFixes) {
        return (
          <div className="flex items-center justify-center py-4">
            {loading ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('planStudio.sidebar.loading')}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div className="p-3 border rounded-lg bg-gray-50">
            <div className="text-sm space-y-1">
              <div>
                {t('planStudio.sidebar.neptune.issuesFound', { count: neptuneFixes.total })}
              </div>
              <div>
                {t('planStudio.sidebar.neptune.issuesFixed', { count: neptuneFixes.applied })}
              </div>
            </div>
          </div>
          <div className="text-sm space-y-1">
            <div className="text-xs text-muted-foreground">{t('planStudio.sidebar.neptune.minimalChangeCost')}</div>
            <div className="space-y-1">
              <div>• {t('planStudio.sidebar.neptune.replacePoints', { count: neptuneFixes.minimalChanges.replacePoints })}</div>
              <div>• {t('planStudio.sidebar.neptune.moveTimeSlots', { count: neptuneFixes.minimalChanges.moveTimeSlots })}</div>
            </div>
          </div>
        </div>
      );
    };

    // 使用 Tabs 显示所有人格的数据
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">策略概览</CardTitle>
          <CardDescription>查看所有三人格的自动执行结果</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="abu" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="abu" className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Abu
              </TabsTrigger>
              <TabsTrigger value="dre" className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Dr.Dre
              </TabsTrigger>
              <TabsTrigger value="neptune" className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                Neptune
              </TabsTrigger>
            </TabsList>
            <TabsContent value="abu" className="mt-4">
              {renderAbuPreview()}
            </TabsContent>
            <TabsContent value="dre" className="mt-4">
              {renderDrDrePreview()}
            </TabsContent>
            <TabsContent value="neptune" className="mt-4">
              {renderNeptunePreview()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // 提示卡（中部）- 显示所有人格的提醒，支持筛选
  const renderAlertsCard = () => {
    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planStudio.sidebar.loading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Spinner className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      );
    }

    // 显示所有人格的提醒，使用筛选器
    // Abu 提醒显示
    const renderAbuAlerts = () => {
      // 按照 decisionSource 分组显示 alerts（使用 abuAlerts）
      const groupedAlerts = abuAlerts.reduce((acc, alert) => {
        const source = alert.metadata?.decisionSource || 'OTHER';
        if (!acc[source]) {
          acc[source] = [];
        }
        acc[source].push(alert);
        return acc;
      }, {} as Record<string, typeof filteredAlerts>);

      const getSourceName = (source: string): string => {
        switch (source) {
          case 'PHYSICAL':
            return '安全官 (PHYSICAL)';
          case 'HUMAN':
            return '能力评估 (HUMAN)';
          case 'PHILOSOPHY':
            return '路线哲学 (PHILOSOPHY)';
          case 'HEURISTIC':
            return '经验规则 (HEURISTIC)';
          default:
            return '其他';
        }
      };

      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planStudio.sidebar.abu.riskAlerts')}</CardTitle>
            <CardDescription>{t('planStudio.sidebar.abu.riskAlertsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {abuAlerts.length === 0 ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-center">
                <div className="text-green-800">{t('planStudio.sidebar.noAlerts')}</div>
            </div>
            ) : (
              Object.entries(groupedAlerts).map(([source, sourceAlerts]) => {
                // 对于每个 source，只显示一个汇总卡片
                // 如果有多个 alerts，合并显示
                const hasWarning = sourceAlerts.some(a => a.severity === 'warning');
                const hasInfo = sourceAlerts.some(a => a.severity === 'info');
                // const hasSuccess = sourceAlerts.some(a => a.severity === 'success'); // 未使用
                
                // 确定整体状态：如果有 warning，显示 warning；否则显示 info 或 success
                const overallSeverity = hasWarning ? 'warning' : hasInfo ? 'info' : 'success';
                
                const bgColor = 
                  overallSeverity === 'warning' ? 'bg-red-50 border-red-200 text-red-800' :
                  overallSeverity === 'info' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-green-50 border-green-200 text-green-800';
                
                // 合并所有 alerts 的消息
                const combinedMessage = sourceAlerts.map(a => a.message).join('；');
                const combinedTitle = sourceAlerts.length > 1 
                  ? `${sourceAlerts[0].title} (${sourceAlerts.length}项)`
                  : sourceAlerts[0].title;
                
                return (
                  <div key={source} className={`p-3 border rounded text-sm ${bgColor}`}>
                    <div className="font-medium text-blue-600 mb-1">{getSourceName(source)}</div>
                    <div className="font-medium">{combinedTitle}</div>
                    <div className="text-xs mt-1 opacity-80">{combinedMessage}</div>
            </div>
                );
              })
            )}
          </CardContent>
        </Card>
      );
    };

    // Dr.Dre 提醒显示
    const renderDrDreAlerts = () => {
      // 从 alerts 和 metrics 中提取指标异常（使用 drDreAlerts）
      const metricAlerts = drDreAlerts.filter(alert => 
        alert.metadata?.type === 'FATIGUE_PEAK' || 
        alert.metadata?.type === 'BUFFER_INSUFFICIENT' || 
        alert.metadata?.type === 'COST_OVER_BUDGET'
      );

      // 只使用从 API 获取的 alerts，不再进行前端硬编码检测
      const allIssues = metricAlerts.map(alert => ({
        type: alert.metadata?.type || 'UNKNOWN',
        title: alert.title,
        description: alert.message,
        severity: alert.severity === 'warning' ? 'HIGH' : alert.severity === 'info' ? 'MEDIUM' : 'LOW',
      }));

      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planStudio.sidebar.dre.metricAlerts')}</CardTitle>
            <CardDescription>{t('planStudio.sidebar.dre.metricAlertsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* 显示操作结果 */}
            {operationResult && (
              <div className={`p-3 border rounded text-sm ${
                operationResult.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                operationResult.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="font-medium">
                  {operationResult.type === 'success' ? '✓' : operationResult.type === 'warning' ? '⚠' : 'ℹ'} 
                  {' '}{t('planStudio.sidebar.dre.operationResult')}
              </div>
                <div className="text-xs mt-1 opacity-80">{operationResult.message}</div>
              </div>
            )}
            {/* 如果没有操作结果且没有 issues，才显示 noAlerts */}
            {!operationResult && allIssues.length === 0 ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-center">
                <div className="text-green-800">{t('planStudio.sidebar.noAlerts')}</div>
              </div>
            ) : allIssues.length > 0 ? (
              allIssues.map((issue, index) => {
                const bgColor = 
                  issue.severity === 'HIGH' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                  issue.severity === 'MEDIUM' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  'bg-gray-50 border-gray-200 text-gray-800';
                
                return (
                  <div key={index} className={`p-3 border rounded text-sm ${bgColor}`}>
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-xs mt-1 opacity-80">{issue.description}</div>
                  </div>
                );
              })
            ) : null}
          </CardContent>
        </Card>
      );
    };

    // Neptune 提醒显示
    const renderNeptuneAlerts = () => {
      // 如果有实际的修复建议，显示它们；否则显示提示信息
      const hasSuggestions = neptuneReplacements.length > 0;
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planStudio.sidebar.neptune.fixSuggestions')}</CardTitle>
            <CardDescription>{t('planStudio.sidebar.neptune.fixSuggestionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasSuggestions ? (
              // 显示从 API 获取的实际修复建议
              neptuneReplacements.map((replacement, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                  <div className="font-medium text-green-800">
                    {t('planStudio.sidebar.neptune.replaceSuggestion')}
                  </div>
              <div className="text-xs text-green-600 mt-1">
                    {replacement.explanation || replacement.reason || t('planStudio.sidebar.neptune.replaceSuggestionDesc')}
                  </div>
                  {replacement.validation && (
                    <div className="text-xs text-green-500 mt-1">
                      {t('planStudio.sidebar.neptune.validation')}: {replacement.validation.safetyCheck}
              </div>
                  )}
            </div>
              ))
            ) : (
              // 如果没有建议，显示提示信息
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-center">
                <div className="text-gray-600">
                  {t('planStudio.sidebar.neptune.noSuggestions')}
              </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('planStudio.sidebar.neptune.clickToGenerate')}
            </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    };

    // 使用 Tabs 显示所有人格的提醒
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">人格提醒</CardTitle>
              <CardDescription>查看所有三人格的自动提醒</CardDescription>
            </div>
            <Select value={filterPersona} onValueChange={(value: 'all' | 'ABU' | 'DR_DRE' | 'NEPTUNE') => setFilterPersona(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="ABU">Abu</SelectItem>
                <SelectItem value="DR_DRE">Dr.Dre</SelectItem>
                <SelectItem value="NEPTUNE">Neptune</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="abu" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="abu" className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Abu ({abuAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="dre" className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                Dr.Dre ({drDreAlerts.length})
              </TabsTrigger>
              <TabsTrigger value="neptune" className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                Neptune ({neptuneAlerts.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="abu" className="mt-4">
              {renderAbuAlerts()}
            </TabsContent>
            <TabsContent value="dre" className="mt-4">
              {renderDrDreAlerts()}
            </TabsContent>
            <TabsContent value="neptune" className="mt-4">
              {renderNeptuneAlerts()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // 手动操作按钮已移除 - 三人格现在由系统自动调用
  // 不再需要用户手动触发 validate-safety、adjust-pacing、replace-nodes

  // 准备度汇总卡
  const renderReadinessCard = () => {
    if (!onOpenReadinessDrawer) return null;
    
    const gateStatus = readinessSummary
      ? readinessSummary.totalBlockers > 0
        ? 'BLOCK'
        : readinessSummary.totalMust > 0
        ? 'WARN'
        : 'PASS'
      : null;
    
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenReadinessDrawer()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            {t('planStudio.sidebar.readiness.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReadiness ? (
            <div className="flex items-center justify-center py-4">
              <Spinner className="w-4 h-4" />
            </div>
          ) : readinessSummary ? (
            <div className="space-y-3">
              {/* 状态标签 */}
              {gateStatus && (
                <div className={`p-2 rounded-lg text-center text-sm font-semibold ${
                  gateStatus === 'BLOCK' ? 'bg-red-100 text-red-800 border border-red-200' :
                  gateStatus === 'WARN' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {gateStatus === 'BLOCK' && t('dashboard.readiness.page.drawer.status.block')}
                  {gateStatus === 'WARN' && t('dashboard.readiness.page.drawer.status.warn')}
                  {gateStatus === 'PASS' && t('dashboard.readiness.page.drawer.status.pass')}
                </div>
              )}
              
              {/* 数量统计 */}
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>{t('dashboard.readiness.page.drawer.stats.blockers', { count: readinessSummary.totalBlockers })}</span>
                  <span>{t('dashboard.readiness.page.drawer.stats.must', { count: readinessSummary.totalMust })}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('dashboard.readiness.page.drawer.stats.suggestions', { 
                    count: readinessSummary.totalShould + readinessSummary.totalOptional 
                  })}</span>
                  <span>{t('dashboard.readiness.page.drawer.stats.risks', { count: readinessSummary.risks })}</span>
                </div>
              </div>
              
              <Button variant="outline" className="w-full" size="sm">
                {t('planStudio.sidebar.readiness.viewDetails')}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('planStudio.sidebar.readiness.noData')}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* 策略预览 */}
      {renderStrategyPreview()}

      {/* 准备度汇总卡 */}
      {renderReadinessCard()}

      {/* 提示卡 */}
      {renderAlertsCard()}

      {/* 手动操作按钮已移除 - 三人格由系统自动调用 */}
    </div>
  );
}

