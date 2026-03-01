import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TripDetail, ItineraryItem, TripMetricsResponse } from '@/types/trip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Brain, TrendingUp, Clock, Activity, Lock, RefreshCw, BarChart3, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import type { DrDreViewData } from '@/utils/trip-data-extractors';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/utils/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DrDreViewProps {
  trip: TripDetail;
  drDreData: DrDreViewData | null;
  tripMetrics: TripMetricsResponse | null;
  tripMetricsLoading?: boolean; // 🆕 添加loading状态
  onItemClick?: (item: ItineraryItem) => void;
  onScheduleChanged?: () => void; // 🆕 行程变更后的回调（用于刷新数据）
}

interface Candidate {
  id: string;
  deltaSummary: string;
  metrics: any;
  patchPreview: any;
  regenerateResult?: any; // 保存重新排程的完整结果
}

export default function DrDreView({ trip, drDreData, tripMetrics, tripMetricsLoading = false, onScheduleChanged }: DrDreViewProps) {
  const { t } = useTranslation();
  
  // 🐛 调试：记录组件接收到的 props 变化
  useEffect(() => {
    console.log('[DrDreView] Props 更新:', {
      tripId: trip?.id,
      hasDrDreData: !!drDreData,
      drDreMetrics: drDreData?.metrics,
      drDreDataRef: drDreData, // 完整对象引用，用于检查是否变化
      hasTripMetrics: !!tripMetrics,
      tripMetricsSummary: tripMetrics?.summary,
      tripMetricsRef: tripMetrics, // 完整对象引用
      tripMetricsLoading,
      timestamp: new Date().toISOString(), // 时间戳，确认 useEffect 是否触发
    });
  }, [trip?.id, drDreData, tripMetrics, tripMetricsLoading]);
  
  // 🐛 调试：记录组件每次渲染
  console.log('[DrDreView] 组件渲染:', {
    tripId: trip?.id,
    hasDrDreData: !!drDreData,
    renderTime: new Date().toISOString(),
  });
  
  const [currency, setCurrency] = useState<string>('CNY'); // 🆕 货币状态
  
  // 🆕 加载货币信息：优先使用预算约束中的货币，其次使用目的地货币
  useEffect(() => {
    const loadCurrency = async () => {
      if (!trip.id) return;
      try {
        // 优先从预算约束获取货币
        const constraint = await tripsApi.getBudgetConstraint(trip.id);
        if (constraint.budgetConstraint.currency) {
          setCurrency(constraint.budgetConstraint.currency);
          return;
        }
      } catch {
        // 如果获取预算约束失败，尝试从目的地获取
      }
      
      // 其次从目的地获取货币策略
      if (trip.destination) {
        try {
          const { countriesApi } = await import('@/api/countries');
          const currencyStrategy = await countriesApi.getCurrencyStrategy(trip.destination);
          if (currencyStrategy?.currencyCode) {
            setCurrency(currencyStrategy.currencyCode);
            return;
          }
        } catch {
          // 如果获取失败，保持默认值 CNY
        }
      }
      
      // 默认使用 CNY
      setCurrency('CNY');
    };
    
    loadCurrency();
  }, [trip.id, trip.destination]);
  
  const [priorities, setPriorities] = useState({
    time: 50,
    comfort: 50,
    cost: 50,
    experience: 50,
  });
  
  // 参数预设
  type PriorityPreset = 'balanced' | 'time-first' | 'comfort-first' | 'cost-first' | 'experience-first' | 'custom';
  const [priorityPreset, setPriorityPreset] = useState<PriorityPreset>('balanced');
  
  // 应用预设
  const applyPreset = (preset: PriorityPreset) => {
    switch (preset) {
      case 'balanced':
        setPriorities({ time: 25, comfort: 25, cost: 25, experience: 25 });
        break;
      case 'time-first':
        setPriorities({ time: 70, comfort: 10, cost: 10, experience: 10 });
        break;
      case 'comfort-first':
        setPriorities({ time: 10, comfort: 70, cost: 10, experience: 10 });
        break;
      case 'cost-first':
        setPriorities({ time: 10, comfort: 10, cost: 70, experience: 10 });
        break;
      case 'experience-first':
        setPriorities({ time: 10, comfort: 10, cost: 10, experience: 70 });
        break;
      case 'custom':
        // 保持当前值
        break;
    }
    setPriorityPreset(preset);
  };
  
  // 检测当前是否为预设值
  useEffect(() => {
    const current = priorities;
    if (current.time === 25 && current.comfort === 25 && current.cost === 25 && current.experience === 25) {
      setPriorityPreset('balanced');
    } else if (current.time === 70 && current.comfort === 10 && current.cost === 10 && current.experience === 10) {
      setPriorityPreset('time-first');
    } else if (current.time === 10 && current.comfort === 70 && current.cost === 10 && current.experience === 10) {
      setPriorityPreset('comfort-first');
    } else if (current.time === 10 && current.comfort === 10 && current.cost === 70 && current.experience === 10) {
      setPriorityPreset('cost-first');
    } else if (current.time === 10 && current.comfort === 10 && current.cost === 10 && current.experience === 70) {
      setPriorityPreset('experience-first');
    } else {
      setPriorityPreset('custom');
    }
  }, [priorities]);
  const [constraints, setConstraints] = useState({
    latestEndTime: false,
    latestEndTimeValue: '22:00', // 默认最晚结束时间 22:00
    fixedLunch: false,
    fixedLunchTime: '12:00', // 默认午餐时间 12:00
    maxDailySteps: false,
    maxDailyStepsValue: 10000, // 默认最大步数 10000
    avoidNightRoute: false,
    avoidNightRouteAfter: '20:00', // 默认晚上8点后避开夜路
  });
  const [lockedItems, setLockedItems] = useState<Set<string>>(new Set());
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [whatIfExpanded, setWhatIfExpanded] = useState(true); // 🆕 What-if面板默认展开

  // 如果数据未加载完成，显示加载状态
  if (!drDreData) {
    console.log('[DrDreView] drDreData 为 null，显示加载状态');
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <LogoLoading size={40} />
        <span>加载节奏数据...</span>
      </div>
    );
  }
  
  console.log('[DrDreView] drDreData 存在，继续渲染:', {
    metrics: drDreData.metrics,
    adjustmentsCount: drDreData.adjustments?.length || 0,
    logsCount: drDreData.logs?.length || 0,
  });

  // 使用真实数据
  const metrics = drDreData.metrics || {
    totalFatigue: 0,
    avgBuffer: 0,
    totalWalk: 0,
    totalDrive: 0,
    maxDailyFatigue: 0,
  };
  
  console.log('[DrDreView] 使用的指标数据:', {
    metrics,
    metricsTotalFatigue: metrics.totalFatigue,
    metricsAvgBuffer: metrics.avgBuffer,
    metricsTotalWalk: metrics.totalWalk,
    metricsTotalDrive: metrics.totalDrive,
    drDreDataMetrics: drDreData.metrics,
    drDreDataMetricsTotalFatigue: drDreData.metrics?.totalFatigue,
    tripMetrics,
    hasTripMetrics: !!tripMetrics,
    tripMetricsSummary: tripMetrics?.summary,
    tripMetricsSummaryTotalFatigue: tripMetrics?.summary?.totalFatigue,
    tripMetricsSummaryTotalBuffer: tripMetrics?.summary?.totalBuffer,
    tripMetricsSummaryTotalWalk: tripMetrics?.summary?.totalWalk,
    tripMetricsSummaryTotalDrive: tripMetrics?.summary?.totalDrive,
    // 🐛 检查数据是否真的更新了
    dataUpdateTime: new Date().toISOString(),
  });

  const metricsByItem = drDreData.metricsByItem || {};

  // 🆕 提取有问题的行程项ID集合和问题详情
  const problematicItemIds = new Set<string>();
  const itemProblems = new Map<string, Array<{
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    source: 'conflict' | 'log' | 'metric';
  }>>();
  
  // 1. 从tripMetrics的conflicts中提取（只提取节奏相关的冲突）
  if (tripMetrics?.days) {
    tripMetrics.days.forEach(day => {
      day.conflicts?.forEach(conflict => {
        // 🆕 只提取节奏相关的冲突类型，且只提取HIGH严重程度的冲突
        const rhythmRelatedTypes = [
          'TIME_CONFLICT',
          'PACING_ISSUE',
          'FATIGUE_WARNING',
          'BUFFER_INSUFFICIENT',
        ];
        
        const isRhythmRelated = rhythmRelatedTypes.includes(conflict.type);
        const isHighSeverity = conflict.severity === 'HIGH';
        
        if (isRhythmRelated && isHighSeverity) {
          conflict.affectedItemIds?.forEach(itemId => {
            if (itemId) {
              problematicItemIds.add(itemId);
              if (!itemProblems.has(itemId)) {
                itemProblems.set(itemId, []);
              }
              itemProblems.get(itemId)!.push({
                type: conflict.type,
                severity: conflict.severity,
                description: conflict.description || conflict.title,
                source: 'conflict',
              });
            }
          });
        }
      });
    });
  }
  
  // 2. 从drDreData.logs中提取有问题的项（ADJUST或PACING_ADJUSTMENT操作）
  drDreData.logs?.forEach(log => {
    if (log.action === 'ADJUST' || log.action === 'PACING_ADJUSTMENT') {
      const itemId = log.metadata?.itemId || log.metadata?.target;
      if (itemId) {
        problematicItemIds.add(itemId);
        if (!itemProblems.has(itemId)) {
          itemProblems.set(itemId, []);
        }
        itemProblems.get(itemId)!.push({
          type: log.action,
          severity: 'MEDIUM',
          description: log.description || '需要节奏调整',
          source: 'log',
        });
      }
    }
  });
  
  // 3. 基于指标阈值判断（如果有metricsByItem数据）
  Object.keys(metricsByItem).forEach(itemId => {
    const itemMetrics = metricsByItem[itemId];
    const problems: string[] = [];
    
    // 疲劳度超过阈值
    if (itemMetrics.fatigue && itemMetrics.fatigue > 70) {
      problematicItemIds.add(itemId);
      problems.push('疲劳度过高');
    }
    // 缓冲时间不足（< 15分钟）
    if (itemMetrics.buffer !== undefined && itemMetrics.buffer < 15) {
      problematicItemIds.add(itemId);
      problems.push('缓冲时间不足');
    }
    
    if (problems.length > 0) {
      if (!itemProblems.has(itemId)) {
        itemProblems.set(itemId, []);
      }
      problems.forEach(problem => {
        itemProblems.get(itemId)!.push({
          type: problem,
          severity: 'MEDIUM',
          description: problem,
          source: 'metric',
        });
      });
    }
  });
  
  // 🆕 获取项的问题信息
  const getItemProblems = (itemId: string) => {
    return itemProblems.get(itemId) || [];
  };
  
  // 🆕 获取问题类型的中文标签
  const getProblemLabel = (type: string) => {
    const labels: Record<string, string> = {
      'TIME_CONFLICT': '时间冲突',
      'PACING_ISSUE': '节奏问题',
      'FATIGUE_WARNING': '疲劳警告',
      'BUFFER_INSUFFICIENT': '缓冲不足',
      'TRANSPORT_INSUFFICIENT': '交通不足',
      'DUPLICATE_ITEM': '行程项重复',
      'ADJUST': '需要调整',
      'PACING_ADJUSTMENT': '节奏调整',
      '疲劳度过高': '疲劳度过高',
      '缓冲时间不足': '缓冲不足',
    };
    return labels[type] || type;
  };
  
  // 🆕 调试：输出problematicItemIds的内容
  console.log('[DrDreView] 有问题的项ID:', {
    problematicItemIds: Array.from(problematicItemIds),
    problematicItemIdsSize: problematicItemIds.size,
    totalItems: trip.TripDay.reduce((sum, day) => sum + day.ItineraryItem.length, 0),
    conflictsCount: tripMetrics?.days?.reduce((sum, day) => sum + (day.conflicts?.length || 0), 0) || 0,
    adjustmentsCount: drDreData.adjustments?.length || 0,
    logsCount: drDreData.logs?.length || 0,
  });

  // 🆕 判断是否确实没有问题（仅在tripMetrics存在且没有conflicts且没有adjustments时）
  const hasNoProblems = tripMetrics && problematicItemIds.size === 0 && (!drDreData.adjustments || drDreData.adjustments.length === 0);
  
  // 🆕 判断tripMetrics是否加载失败（仅在loading完成且tripMetrics为null时才算失败）
  const tripMetricsLoadFailed = !tripMetricsLoading && !tripMetrics;

  const handleLockItem = (itemId: string) => {
    const newLocked = new Set(lockedItems);
    if (newLocked.has(itemId)) {
      newLocked.delete(itemId);
    } else {
      newLocked.add(itemId);
    }
    setLockedItems(newLocked);
  };

  const handleRegenerate = async () => {
    try {
      console.log('[DrDreView] 开始重新排程:', {
        tripId: trip.id,
        lockedItems: Array.from(lockedItems),
        priorities,
        constraints,
      });
      
      setRegenerating(true);
      
      // 调用真实的重新排程API
      // TODO: 根据API类型定义调整constraints结构
      const result = await tripsApi.regenerate(trip.id, {
        lockedItemIds: Array.from(lockedItems),
        newPreferences: {
          // 可以根据priorities和constraints设置偏好
          // constraints字段需要根据API类型定义调整
        },
      });
      
      console.log('[DrDreView] 重新排程API响应:', result);
      
      // 🆕 regenerate API 可能已经直接应用了更改（返回 updatedDraft）
      // 如果返回了 updatedDraft，说明已经应用，需要刷新数据
      if (result.updatedDraft) {
        // 已直接应用，刷新数据
        toast.success('重新排程成功', {
          description: `已调整 ${result.changes.length} 个行程项`,
          duration: 3000,
        });
        
        // 🆕 通知父组件刷新数据（包括冲突数据）
        onScheduleChanged?.();
        
        // 清空候选方案（因为已经应用）
        setCandidates([]);
        setShowCandidates(false);
      } else {
        // 未直接应用，生成候选方案供用户选择
        const newCandidates = [
          {
            id: 'regenerated-1',
            deltaSummary: '重新排程方案',
            metrics: { ...metrics },
            patchPreview: {
              adjustment: `已调整 ${result.changes.length} 个行程项`,
              reasonCodes: result.changes.map(c => c.type),
            },
            regenerateResult: result, // 保存完整结果，用于后续应用
          },
        ];
        
        setCandidates(newCandidates);
        setShowCandidates(true);
        
        toast.success('重新排程成功', {
          description: `已生成新的排程方案，包含 ${result.changes.length} 项调整`,
          duration: 3000,
        });
        
        console.log('[DrDreView] 重新排程完成，生成候选方案:', newCandidates.length);
      }
    } catch (error: any) {
      console.error('[DrDreView] 重新排程失败:', {
        error,
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
      });
      
      toast.error('重新排程失败', {
        description: error.response?.data?.message || error.message || '请稍后重试',
        duration: 5000,
      });
    } finally {
      setRegenerating(false);
    }
  };

  const getItemMetrics = (itemId: string) => {
    const itemMetrics = metricsByItem[itemId];
    if (!itemMetrics) {
      return {
      duration: 0,
      buffer: 0,
      effort: 0,
      cost: 0,
      };
    }
    // 适配数据结构
    return {
      duration: 0, // 从 item 的 startTime 和 endTime 计算
      buffer: itemMetrics.buffer || 0,
      effort: itemMetrics.fatigue || 0,
      cost: 0, // 需要从其他地方获取
      walk: itemMetrics.walk,
      drive: itemMetrics.drive,
    };
  };

  const isOverThreshold = (value: number, threshold: number) => {
    return value > threshold;
  };

  return (
    <div className="space-y-4">
      {/* 顶部：当日/全程指标条（KPI strip） */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-orange-600" />
            全程指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1.5">总疲劳度</div>
              <div className="text-base font-bold">{metrics.totalFatigue.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">点</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1.5">平均缓冲</div>
              <div className="text-base font-bold">{Math.round(metrics.avgBuffer)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">分钟</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1.5">总步行</div>
              <div className="text-base font-bold">{(metrics.totalWalk / 1000).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">km</div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="text-xs text-muted-foreground mb-1.5">总车程</div>
              <div className="text-base font-bold">{Math.round(metrics.totalDrive)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">分钟</div>
            </div>
            {metrics.maxDailyFatigue !== undefined && (
            <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1.5">最大日疲劳</div>
                <div className="text-base font-bold">{metrics.maxDailyFatigue.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">点</div>
            </div>
            )}
            {trip.totalBudget && (
            <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1.5">总预算</div>
                <div className="text-base font-bold">{formatCurrency(trip.totalBudget, currency)}</div>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 🆕 What-if 调参面板（顶部，可折叠） */}
      <Collapsible open={whatIfExpanded} onOpenChange={setWhatIfExpanded}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-orange-600" />
                  <CardTitle className="text-base">节奏优化</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          调整优先级和约束参数，优化现有方案的节奏。适用于已创建行程后，发现节奏问题时进行微调优化。
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <CardDescription className="text-xs m-0">调整优先级和约束参数，优化现有方案的节奏</CardDescription>
                  {whatIfExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* 参数预设选择 */}
              <div className="flex items-center justify-between pb-3 border-b">
                <Label className="text-sm font-medium">快速预设</Label>
                <Select value={priorityPreset} onValueChange={(v) => applyPreset(v as PriorityPreset)}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">均衡模式</SelectItem>
                    <SelectItem value="time-first">时间优先</SelectItem>
                    <SelectItem value="comfort-first">舒适优先</SelectItem>
                    <SelectItem value="cost-first">成本优先</SelectItem>
                    <SelectItem value="experience-first">体验优先</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* 优先级滑杆 - 桌面端一行显示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
                <div>
                  <Label className="flex items-center justify-between mb-1.5 text-sm">
                    <span>时间优先</span>
                    <span className="text-xs text-muted-foreground">{priorities.time}%</span>
                  </Label>
                  <Slider
                    value={[priorities.time]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, time: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-1.5 text-sm">
                    <span>舒适优先</span>
                    <span className="text-xs text-muted-foreground">{priorities.comfort}%</span>
                  </Label>
                  <Slider
                    value={[priorities.comfort]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, comfort: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-1.5 text-sm">
                    <span>成本优先</span>
                    <span className="text-xs text-muted-foreground">{priorities.cost}%</span>
                  </Label>
                  <Slider
                    value={[priorities.cost]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, cost: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
                <div>
                  <Label className="flex items-center justify-between mb-1.5 text-sm">
                    <span>体验密度</span>
                    <span className="text-xs text-muted-foreground">{priorities.experience}%</span>
                  </Label>
                  <Slider
                    value={[priorities.experience]}
                    onValueChange={([value]) =>
                      setPriorities({ ...priorities, experience: value })
                    }
                    max={100}
                    step={5}
                  />
                </div>
              </div>

              {/* 约束开关 - 桌面端一行显示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-3 border-t">
                {/* 最晚结束时间 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="latest-end-time" className="text-sm">最晚结束时间</Label>
                    <Switch
                      id="latest-end-time"
                      checked={constraints.latestEndTime}
                      onCheckedChange={(checked) =>
                        setConstraints({ ...constraints, latestEndTime: checked })
                      }
                    />
                  </div>
                  {constraints.latestEndTime && (
                    <Input
                      type="time"
                      value={constraints.latestEndTimeValue}
                      onChange={(e) =>
                        setConstraints({ ...constraints, latestEndTimeValue: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                {/* 午餐固定 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fixed-lunch" className="text-sm">午餐固定</Label>
                    <Switch
                      id="fixed-lunch"
                      checked={constraints.fixedLunch}
                      onCheckedChange={(checked) =>
                        setConstraints({ ...constraints, fixedLunch: checked })
                      }
                    />
                  </div>
                  {constraints.fixedLunch && (
                    <Input
                      type="time"
                      value={constraints.fixedLunchTime}
                      onChange={(e) =>
                        setConstraints({ ...constraints, fixedLunchTime: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                {/* 每天最大步数 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-daily-steps" className="text-sm">每天最大步数</Label>
                    <Switch
                      id="max-daily-steps"
                      checked={constraints.maxDailySteps}
                      onCheckedChange={(checked) =>
                        setConstraints({ ...constraints, maxDailySteps: checked })
                      }
                    />
                  </div>
                  {constraints.maxDailySteps && (
                    <Input
                      type="number"
                      value={constraints.maxDailyStepsValue}
                      onChange={(e) =>
                        setConstraints({
                          ...constraints,
                          maxDailyStepsValue: parseInt(e.target.value) || 0,
                        })
                      }
                      min={1000}
                      max={50000}
                      step={1000}
                      placeholder="例如：10000"
                      className="h-9 text-sm"
                    />
                  )}
                </div>

                {/* 避开夜路 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="avoid-night-route" className="text-sm">避开夜路</Label>
                    <Switch
                      id="avoid-night-route"
                      checked={constraints.avoidNightRoute}
                      onCheckedChange={(checked) =>
                        setConstraints({ ...constraints, avoidNightRoute: checked })
                      }
                    />
                  </div>
                  {constraints.avoidNightRoute && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">晚上几点后避开</Label>
                      <Input
                        type="time"
                        value={constraints.avoidNightRouteAfter}
                        onChange={(e) =>
                          setConstraints({ ...constraints, avoidNightRouteAfter: e.target.value })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-3 border-t">
                <Button 
                  className="flex-1" 
                  size="sm" 
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", regenerating && "animate-spin")} />
                  {regenerating ? '正在生成方案...' : '一键重新排程'}
                </Button>
                <Button variant="outline" className="flex-1" size="sm" onClick={() => setShowCandidates(true)}>
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  生成对比方案
                </Button>
              </div>

              {/* 锁定项提示 */}
              {lockedItems.size > 0 && (
                <div className="pt-3 border-t">
                  <div className="text-sm p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium mb-1">已锁定 {lockedItems.size} 项</div>
                    <div className="text-xs text-muted-foreground">
                      重新排程时将保持这些项不变，其他项围绕它们调整
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 🆕 如果没有有问题的项，显示友好提示（仅在确实没有问题且tripMetrics存在时） */}
      {hasNoProblems && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <div className="text-sm font-medium text-gray-900 mb-1">所有行程项节奏良好</div>
            <div className="text-xs text-muted-foreground">无需调整，行程安排合理 ✨</div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 如果tripMetrics加载失败，显示失败提示 */}
      {tripMetricsLoadFailed && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-red-600" />
            <div className="text-sm font-medium text-gray-900 mb-1">节奏数据加载失败</div>
            <div className="text-xs text-muted-foreground">无法获取节奏分析数据，请检查网络连接或稍后重试</div>
          </CardContent>
        </Card>
      )}

      {/* 🆕 显示时间轴：仅在存在有问题的项时 */}
      {!tripMetricsLoadFailed && problematicItemIds.size > 0 && (
        <div className="space-y-4">
          {/* 时间轴（全宽）- 只显示有问题的项 */}
            {trip.TripDay.map((day) => {
              // 🆕 只显示有问题的项
              const allDayItemIds = day.ItineraryItem.map(item => item.id);
              const itemsToShow = day.ItineraryItem.filter(item => {
                const isProblematic = problematicItemIds.has(item.id);
                if (!isProblematic) {
                  console.log('[DrDreView] 项被过滤掉:', {
                    itemId: item.id,
                    itemName: item.Place?.nameCN || item.Place?.nameEN || item.type,
                    inProblematicSet: problematicItemIds.has(item.id),
                    problematicItemIds: Array.from(problematicItemIds),
                  });
                }
                return isProblematic;
              });
              
              // 🆕 调试：输出过滤结果
              console.log('[DrDreView] 日期过滤结果:', {
                date: day.date,
                totalItems: day.ItineraryItem.length,
                problematicItems: itemsToShow.length,
                problematicItemIdsSize: problematicItemIds.size,
                dayItemIds: allDayItemIds,
                itemsToShowIds: itemsToShow.map(item => item.id),
                allItemsInProblematicSet: allDayItemIds.every(id => problematicItemIds.has(id)),
              });

              // 🆕 如果这一天没有要显示的项，不显示这一天
              if (itemsToShow.length === 0) {
                return null;
              }

              return (
                <Card key={day.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {format(new Date(day.date), 'yyyy年MM月dd日')} ({day.date})
                    </CardTitle>
                    {/* ✅ 显示当天主题（如果存在） */}
                    {day.theme && (
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        {day.theme}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {itemsToShow.map((item) => {
                        const itemMetrics = getItemMetrics(item.id);
                        const isLocked = lockedItems.has(item.id);
                      
                      // 🔍 诊断：检查Place信息是否存在
                      if (item.placeId && !item.Place) {
                        console.warn('⚠️ [DrDreView] 行程项缺少Place信息:', {
                          itemId: item.id,
                          placeId: item.placeId,
                          type: item.type,
                          note: item.note,
                          day: day.date,
                        });
                      }
                      
                      const itemProblemsList = getItemProblems(item.id);
                      const hasHighSeverity = itemProblemsList.some(p => p.severity === 'HIGH');
                      
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors",
                            hasHighSeverity && "border-red-200 bg-red-50/30"
                          )}
                        >
                          <div className="flex-shrink-0 pt-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleLockItem(item.id)}
                            >
                              <Lock className={`w-3.5 h-3.5 ${isLocked ? 'fill-current text-orange-600' : ''}`} />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium truncate">{item.Place?.nameCN || item.Place?.nameEN || (item.placeId ? `POI ${item.placeId}` : item.type)}</span>
                              {/* ✅ 显示必游标记（如果存在） */}
                              {(item.isRequired || item.note?.includes('[必游]')) && (
                                <Badge variant="default" className="text-xs">
                                  必游
                                </Badge>
                              )}
                              {/* 🆕 显示问题标记 */}
                              {itemProblemsList.map((problem, idx) => (
                                <Badge
                                  key={idx}
                                  variant={problem.severity === 'HIGH' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {getProblemLabel(problem.type)}
                                </Badge>
                              ))}
                            </div>
                            {item.note && (
                              <div className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{item.note}</div>
                            )}
                            {/* 🆕 显示问题描述 */}
                            {itemProblemsList.length > 0 && (
                              <div className="mb-1.5 space-y-1">
                                {itemProblemsList.map((problem, idx) => (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "text-xs px-2 py-0.5 rounded",
                                      problem.severity === 'HIGH' 
                                        ? "bg-red-100 text-red-700 border border-red-200" 
                                        : "bg-orange-50 text-orange-700 border border-orange-200"
                                    )}
                                  >
                                    {problem.description}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* 次要信息：指标 */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {item.startTime && item.endTime && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {format(new Date(item.startTime), 'HH:mm')} - {format(new Date(item.endTime), 'HH:mm')}
                                    {itemMetrics.buffer > 0 && (
                                      <span className="ml-1">
                                        (+{itemMetrics.buffer}缓冲)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {itemMetrics.effort !== undefined && itemMetrics.effort > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Activity className="w-3 h-3 text-muted-foreground" />
                                  <span className={isOverThreshold(itemMetrics.effort, 70) ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                                    疲劳{itemMetrics.effort.toFixed(1)}
                                  </span>
                                </div>
                              )}
                              {itemMetrics.walk !== undefined && itemMetrics.walk > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  步行{(itemMetrics.walk / 1000).toFixed(1)}km
                                </div>
                              )}
                              {itemMetrics.drive !== undefined && itemMetrics.drive > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  车程{Math.round(itemMetrics.drive)}分钟
                                </div>
                              )}
                              {itemMetrics.effort !== undefined && isOverThreshold(itemMetrics.effort, 70) && (
                                <Badge variant="destructive" className="text-xs">
                                  超负荷
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* 候选方案对比（弹窗或展开区域） */}
      {showCandidates && candidates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>对比方案</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowCandidates(false)}>
                关闭
              </Button>
            </div>
            <CardDescription>{t('tripViews.dre.candidates.selectBest')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="cursor-pointer hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{candidate.deltaSummary}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div>调整说明: {candidate.deltaSummary}</div>
                      {candidate.patchPreview?.adjustment && (
                        <div className="text-muted-foreground">调整: {candidate.patchPreview.adjustment}</div>
                      )}
                      {candidate.patchPreview?.reasonCodes && candidate.patchPreview.reasonCodes.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {candidate.patchPreview.reasonCodes.map((code: string) => (
                            <Badge key={code} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // 预览方案
                        console.log(t('tripViews.dre.candidates.preview'), candidate.id);
                      }}
                    >
                      预览
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCandidates(false)}>
                取消
              </Button>
              <Button
                onClick={async () => {
                  // 🆕 应用选中的方案
                  if (candidates.length === 0) {
                    toast.warning('没有可应用的方案');
                    return;
                  }
                  
                  // 获取第一个候选方案（通常只有一个）
                  const candidate = candidates[0];
                  
                  // 如果候选方案包含 regenerateResult，说明需要应用重新排程结果
                  if (candidate.regenerateResult?.updatedDraft) {
                    try {
                      // 🆕 regenerate API 已经应用了更改，只需要刷新数据
                      toast.success('方案已应用');
                      setShowCandidates(false);
                      
                      // 🆕 通知父组件刷新数据（包括冲突数据）
                      onScheduleChanged?.();
                    } catch (error: any) {
                      console.error('[DrDreView] 应用方案失败:', error);
                      toast.error('应用方案失败：' + (error.message || '未知错误'));
                    }
                  } else {
                    // 如果没有 regenerateResult，说明方案已经应用，只需要刷新
                    toast.success('方案已应用');
                    setShowCandidates(false);
                    onScheduleChanged?.();
                  }
                }}
              >
                {t('tripViews.dre.candidates.apply')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

