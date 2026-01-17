import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import IntentTab from './IntentTab';
import ScheduleTab from './ScheduleTab';
import OptimizeTab from './OptimizeTab';
import WhatIfTab from './WhatIfTab';
import BookingsTab from './BookingsTab';
// PersonaModeToggle 已移除 - 三人格现在是系统内部工具，不再允许用户切换视图
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';
// PlanStudioSidebar 已移除 - 策略概览功能已整合到 AI 助手侧边栏
import { Compass } from '@/components/illustrations/SimpleIllustrations';
import { Button } from '@/components/ui/button';
import WelcomeModal from '@/components/onboarding/WelcomeModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
// Icons are now imported from pipeline-status.ts
import {
  getPipelineStatusIcon,
  getPipelineStatusLabel,
  getPipelineStatusClasses,
  getPipelineProgressColor,
  type PipelineStageStatus,
} from '@/lib/pipeline-status';
import { cn } from '@/lib/utils';
import { tripsApi } from '@/api/trips';
import { Spinner } from '@/components/ui/spinner';
import ReadinessDrawer from '@/components/readiness/ReadinessDrawer';
import type { PipelineStatus, PipelineStage, TripListItem, TripDetail } from '@/types/trip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countriesApi } from '@/api/countries';
import type { Country } from '@/types/country';
import { Settings2, Zap, Footprints, Wallet } from 'lucide-react';
import { PlanStudioProvider } from '@/contexts/PlanStudioContext';

function PlanStudioPageContent() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const defaultTab = searchParams.get('tab') || 'schedule';
  const [activeTab, setActiveTab] = useState(defaultTab === 'intent' || defaultTab === 'places' ? 'schedule' : defaultTab);
  
  // 意图与约束弹窗
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  // personaMode 已移除 - 三人格由系统自动调用，不再需要用户切换视图
  
  const { state: onboardingState, completeTour, completeStep, completeWelcome } = useOnboarding();
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTrips, setHasTrips] = useState(false);
  const [tripExists, setTripExists] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [refreshKey] = useState(0); // 用于触发子组件刷新
  const [readinessDrawerOpen, setReadinessDrawerOpen] = useState(false);
  const [highlightFindingId, setHighlightFindingId] = useState<string | undefined>(undefined);
  
  // 行程状态相关
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  
  // 行程切换相关
  const [allTrips, setAllTrips] = useState<TripListItem[]>([]);
  const [countryMap, setCountryMap] = useState<Map<string, Country>>(new Map());
  const [loadingTrips, setLoadingTrips] = useState(false);
  
  // 当前行程详情（用于摘要条显示）
  const [currentTrip, setCurrentTrip] = useState<TripDetail | null>(null);

  // 根据国家代码获取国家名称
  const getCountryName = (countryCode: string): string => {
    const country = countryMap.get(countryCode);
    if (country) {
      return country.nameCN;
    }
    // 如果找不到，返回代码本身
    return countryCode;
  };

  // 处理行程切换
  const handleTripChange = (newTripId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tripId', newTripId);
    // 保持当前tab
    if (activeTab) {
      newParams.set('tab', activeTab);
    }
    setSearchParams(newParams);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams);
    
    // 完成对应步骤
    if (value === 'intent') completeStep('style');
    if (value === 'schedule') completeStep('schedule');
    if (value === 'optimize') completeStep('optimize');
    
    // 不再需要切换 personaMode，三人格由系统自动调用
  };

  // 加载国家信息
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const response = await countriesApi.getAll();
        const countries = response.countries || [];
        const map = new Map<string, Country>();
        countries.forEach((country) => {
          map.set(country.isoCode, country);
        });
        setCountryMap(map);
      } catch (err: any) {
        console.error('Failed to load countries:', err);
      }
    };
    loadCountries();
  }, []);

  // 检查行程数据和验证tripId是否有效
  useEffect(() => {
    const checkTripsAndTripId = async () => {
      try {
        setLoading(true);
        setLoadingTrips(true);
        
        // 1. 检查是否有任何行程（只显示规划中的行程）
        const allTripsData = await tripsApi.getAll();
        const allTripsList = Array.isArray(allTripsData) ? allTripsData : [];
        // ✅ 只显示规划中状态的行程
        const planningTrips = allTripsList.filter(trip => trip.status === 'PLANNING');
        setAllTrips(planningTrips);
        setHasTrips(planningTrips.length > 0);
        
        // 2. 如果有tripId，验证行程是否存在且为规划中状态
        if (tripId) {
          try {
            const trip = await tripsApi.getById(tripId);
            // ✅ 检查行程状态是否为规划中
            if (trip.status === 'PLANNING') {
              setTripExists(true);
              setCurrentTrip(trip); // 保存当前行程详情
            } else {
              // 行程不是规划中状态，清除tripId参数
              console.warn('Trip is not in PLANNING status:', tripId, trip.status);
              setTripExists(false);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('tripId');
              setSearchParams(newParams);
            }
          } catch (err: any) {
            // 行程不存在（可能已被删除）
            console.warn('Trip not found or deleted:', tripId);
            setTripExists(false);
            // 清除无效的tripId参数
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('tripId');
            setSearchParams(newParams);
          }
        } else {
          setTripExists(false);
        }
        
        // 3. 如果没有行程数据，显示引导状态
        if (allTripsList.length === 0) {
          setShowWelcomeModal(true);
        }
      } catch (err) {
        console.error('Failed to check trips:', err);
        setHasTrips(false);
        setTripExists(false);
        // 出错时也显示引导状态
        setShowWelcomeModal(true);
      } finally {
        setLoading(false);
        setLoadingTrips(false);
      }
    };
    
    checkTripsAndTripId();
  }, [tripId, searchParams, setSearchParams]);

  // 获取行程 Pipeline 状态
  const loadPipelineStatus = async () => {
    if (!tripId) return;
    
    try {
      setLoadingStatus(true);
      setStatusError(null);
      const status = await tripsApi.getPipelineStatus(tripId);
      setPipelineStatus(status);
    } catch (err: any) {
      console.error('[PlanStudio] Failed to load pipeline status:', err);
      setStatusError(err.message || '获取状态失败');
      // 如果获取失败，尝试从 trip 详情中获取
      try {
        const trip = await tripsApi.getById(tripId);
        if (trip.pipelineStatus) {
          setPipelineStatus(trip.pipelineStatus);
        }
      } catch (tripErr) {
        // 忽略错误，保持 statusError
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  // 当 tripId 变化时，加载 Pipeline 状态
  useEffect(() => {
    if (tripId && tripExists) {
      loadPipelineStatus();
    } else {
      setPipelineStatus(null);
      setStatusError(null);
    }
  }, [tripId, tripExists]);

  // 定期刷新状态（每30秒）
  useEffect(() => {
    if (!tripId || !tripExists) return;

    const interval = setInterval(() => {
      loadPipelineStatus();
    }, 30000); // 30秒

    return () => clearInterval(interval);
  }, [tripId, tripExists]);
  
  // 根据当前 Tab 显示对应的 Tour
  useEffect(() => {
    if (!onboardingState.toursCompleted.planStudio && tripId && tripExists) {
      // 首次进入 Plan Studio，延迟显示 Tour
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tripId, tripExists, onboardingState.toursCompleted.planStudio]);

  // Intent Tab Tour
  const intentTourSteps: TourStep[] = [
    {
      id: 'trip-dna',
      target: '[data-tour="trip-dna"]',
      title: 'Trip DNA',
      description: "Pick a pace. We'll enforce it everywhere. 选择节奏，系统会在所有规划中强制执行。",
      position: 'bottom',
    },
    {
      id: 'hard-constraints',
      target: '[data-tour="hard-constraints"]',
      title: 'Hard Constraints',
      description: "Hard constraints are non-negotiable. They power Abu's gate. 硬约束不可协商，它们驱动 Abu 的安全门控。",
      position: 'bottom',
    },
  ];

  // Schedule Tab Tour
  const scheduleTourSteps: TourStep[] = [
    {
      id: 'timeline',
      target: '[data-tour="schedule-timeline"]',
      title: 'Day Timeline',
      description: 'Drag to reorder. Time windows update live. 拖拽重新排序，时间窗实时更新。',
      position: 'bottom',
    },
    {
      id: 'conflicts',
      target: '[data-tour="schedule-conflicts"]',
      title: 'Conflict List',
      description: "Conflicts are actionable. Click 'Fix' to auto-locate. 冲突是可操作的，点击 Fix 自动定位。",
      position: 'left',
    },
    {
      id: 'optimize-btn',
      target: '[data-tour="schedule-optimize"]',
      title: 'Run Optimize',
      description: 'One click to turn a draft into an executable plan. 一键将草稿变为可执行计划。',
      position: 'top',
    },
  ];

  // Optimize Tab Tour
  const optimizeTourSteps: TourStep[] = [
    {
      id: 'before-after',
      target: '[data-tour="optimize-comparison"]',
      title: 'Before/After',
      description: "What changed, and why it's now executable. 查看变化，了解为什么现在可执行。",
      position: 'bottom',
    },
    {
      id: 'reason-codes',
      target: '[data-tour="optimize-reasons"]',
      title: 'Reason Codes',
      description: 'Every move has a reason code and evidence. 每个变更都有原因码和证据。',
      position: 'right',
    },
  ];

  const getCurrentTourSteps = () => {
    switch (activeTab) {
      case 'intent':
        return intentTourSteps;
      case 'schedule':
        return scheduleTourSteps;
      case 'optimize':
        return optimizeTourSteps;
      default:
        return [];
    }
  };

  const handleWelcomeComplete = (experienceType: 'steady' | 'balanced' | 'exploratory') => {
    completeWelcome(experienceType);
    setShowWelcomeModal(false);
    navigate('/dashboard/trips/new?experience=' + experienceType);
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  // 没有行程数据或tripId无效时，显示引导状态
  if (!hasTrips || (tripId && !tripExists) || !tripId) {
    return (
      <>
        <WelcomeModal
          open={showWelcomeModal}
          onClose={() => {
            // 如果用户关闭模态框但还没有行程，引导到行程列表
            if (!hasTrips) {
              navigate('/dashboard/trips');
            } else {
              setShowWelcomeModal(false);
            }
          }}
          onComplete={handleWelcomeComplete}
        />
        
        {/* 如果用户已经完成了欢迎流程但还没有行程，显示空状态 */}
        {!showWelcomeModal && (
          <div className="p-6">
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 opacity-50">
                    <Compass size={120} color="#9CA3AF" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mb-1">{t('planStudio.noTrip')}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {hasTrips ? t('planStudio.selectTripToStart') : t('planStudio.createFirstTrip')}
                  </p>
                  <Button onClick={() => navigate('/dashboard/trips')}>
                    {hasTrips ? t('planStudio.goToTrips') : t('planStudio.createTrip')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Plan Studio Tour */}
      <SpotlightTour
        steps={getCurrentTourSteps()}
        open={showTour && !onboardingState.toursCompleted.planStudio}
        onClose={() => {
          setShowTour(false);
          completeTour('planStudio');
        }}
        onComplete={() => {
          setShowTour(false);
          completeTour('planStudio');
        }}
      />

      {/* 顶部：标题 + 行程切换 + 状态 */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{t('planStudio.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('planStudio.subtitle')}
            </p>
          </div>
          
          {/* 行程切换下拉菜单 */}
          {hasTrips && allTrips.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-64">
                <Select
                  value={tripId || ''}
                  onValueChange={handleTripChange}
                  disabled={loadingTrips}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择行程">
                      {tripId && allTrips.find(t => t.id === tripId) ? (
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {getCountryName(allTrips.find(t => t.id === tripId)!.destination)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({allTrips.find(t => t.id === tripId)!.destination})
                          </span>
                        </span>
                      ) : (
                        '选择行程'
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {allTrips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {getCountryName(trip.destination)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {trip.destination} • {trip.days?.length || 0} 天
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Pipeline 状态指示器 */}
          {tripId && tripExists && (
            <div className="flex items-center gap-2">
              {loadingStatus ? (
                <Spinner className="w-4 h-4" />
              ) : pipelineStatus ? (
                <button
                  onClick={() => setShowStatusDialog(true)}
                  className="hover:opacity-80 transition-opacity"
                  title="点击查看详细状态"
                >
                  <PipelineStatusIndicator status={pipelineStatus} />
                </button>
              ) : statusError ? (
                <div className="text-xs text-muted-foreground">
                  状态加载失败
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 摘要条 - 显示当前行程核心设置 */}
      {tripId && tripExists && currentTrip && (
        <TripSummaryBar 
          trip={currentTrip} 
          countryName={getCountryName(currentTrip.destination)}
          onOpenSettings={() => setShowIntentDialog(true)}
        />
      )}

      {/* 主内容区：Tab导航 + 内容 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 主内容区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
            <div className="border-b bg-white px-6">
              <TabsList className="justify-start">
                <TabsTrigger value="schedule">{t('planStudio.tabs.schedule')}</TabsTrigger>
                <TabsTrigger value="optimize">{t('planStudio.tabs.optimize')}</TabsTrigger>
                <TabsTrigger value="what-if">{t('planStudio.tabs.whatIf')}</TabsTrigger>
                <TabsTrigger value="bookings">{t('planStudio.tabs.bookings')}</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* 主内容区 */}
              <div className="max-w-5xl mx-auto">
                <TabsContent value="schedule" className="mt-0">
                  <ScheduleTab 
                    tripId={tripId} 
                    refreshKey={refreshKey}
                  />
                </TabsContent>
                <TabsContent value="optimize" className="mt-0">
                  <OptimizeTab tripId={tripId} />
                </TabsContent>
                <TabsContent value="what-if" className="mt-0">
                  <WhatIfTab tripId={tripId} />
                </TabsContent>
                <TabsContent value="bookings" className="mt-0">
                  <BookingsTab tripId={tripId} />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      {/* 准备度抽屉 */}
      <ReadinessDrawer
        open={readinessDrawerOpen}
        onClose={() => {
          setReadinessDrawerOpen(false);
          setHighlightFindingId(undefined);
        }}
        tripId={tripId}
        highlightFindingId={highlightFindingId}
      />

      {/* Pipeline 状态详情对话框 */}
      {pipelineStatus && (
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>行程规划状态</DialogTitle>
              <DialogDescription>
                查看行程规划的各个阶段完成情况
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {pipelineStatus.stages.map((stage) => (
                <PipelineStageCard key={stage.id} stage={stage} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 意图与约束弹窗 */}
      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              调整约束
            </DialogTitle>
            <DialogDescription>
              设置行程的意图、偏好和约束条件
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <IntentTab tripId={tripId} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 行程摘要条组件
function TripSummaryBar({ 
  trip, 
  countryName,
  onOpenSettings 
}: { 
  trip: TripDetail; 
  countryName: string;
  onOpenSettings: () => void;
}) {
  // 从 pacingConfig 获取节奏信息
  const getPaceLabel = () => {
    const level = trip.pacingConfig?.level;
    const maxActivities = trip.pacingConfig?.maxDailyActivities;
    
    if (level === 'relaxed' || (maxActivities && maxActivities <= 3)) {
      return { label: '悠闲', emoji: '🌿', desc: '每天2-3个点' };
    } else if (level === 'tight' || (maxActivities && maxActivities > 5)) {
      return { label: '紧凑', emoji: '🚀', desc: '每天6+个点' };
    }
    return { label: '标准', emoji: '⚖️', desc: '每天4-5个点' };
  };

  const pace = getPaceLabel();
  const budget = trip.totalBudget || trip.budgetConfig?.totalBudget;
  const days = trip.days?.length || 0;
  const startDate = trip.startDate ? new Date(trip.startDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
  const endDate = trip.endDate ? new Date(trip.endDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b px-6 py-3">
      <div className="flex items-center justify-between">
        {/* 左侧：核心信息 */}
        <div className="flex items-center gap-6 text-sm">
          {/* 目的地和日期 */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{countryName}</span>
            {startDate && endDate && (
              <span className="text-slate-500">
                {startDate} - {endDate} ({days}天)
              </span>
            )}
          </div>
          
          {/* 分隔线 */}
          <div className="h-4 w-px bg-slate-300" />
          
          {/* 节奏 */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-slate-600">{pace.emoji} {pace.label}</span>
          </div>
          
          {/* 预算 */}
          {budget && budget > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">¥{budget.toLocaleString()}</span>
              </div>
            </>
          )}
          
          {/* 旅行者数量 */}
          {trip.travelers && trip.travelers.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Footprints className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">{trip.travelers.length}人</span>
              </div>
            </>
          )}
        </div>
        
        {/* 右侧：调整按钮 */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenSettings}
          className="text-slate-600 hover:text-slate-800"
        >
          <Settings2 className="w-4 h-4 mr-1.5" />
          调整约束
        </Button>
      </div>
    </div>
  );
}

// Pipeline 状态指示器组件
function PipelineStatusIndicator({ status }: { status: PipelineStatus }) {
  // 计算当前进度
  const totalStages = status.stages.length;
  const completedStages = status.stages.filter(s => s.status === 'completed').length;
  const riskStages = status.stages.filter(s => s.status === 'risk').length;
  const inProgressStages = status.stages.filter(s => s.status === 'in-progress').length;
  
  // 获取当前阶段
  const currentStage = status.stages.find(s => s.status === 'in-progress' || s.status === 'risk');
  
  // 计算进度百分比
  const progressPercentage = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
  
  // 获取进度条颜色
  const progressColorClass = riskStages > 0 
    ? getPipelineProgressColor('risk')
    : inProgressStages > 0
    ? getPipelineProgressColor('in-progress')
    : getPipelineProgressColor('completed');
  
  return (
    <div className="flex items-center gap-3 text-xs">
      {/* 进度条 */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn('h-full transition-all', progressColorClass)}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-muted-foreground min-w-[3rem]">
          {completedStages}/{totalStages}
        </span>
      </div>
      
      {/* 当前阶段 */}
      {currentStage && (
        <div className="flex items-center gap-1">
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            getPipelineProgressColor(currentStage.status as PipelineStageStatus)
          )} />
          <span className="text-muted-foreground">
            {currentStage.name}
          </span>
        </div>
      )}
      
      {/* 风险提示 */}
      {riskStages > 0 && (
        <div className={cn('flex items-center gap-1', getPipelineStatusClasses('risk'))}>
          <span>⚠️</span>
          <span>{riskStages} 个风险项</span>
        </div>
      )}
    </div>
  );
}

// Pipeline 阶段卡片组件
function PipelineStageCard({ stage }: { stage: PipelineStage }) {
  const stageStatus = stage.status as PipelineStageStatus;
  const StatusIcon = getPipelineStatusIcon(stageStatus);
  const statusClasses = getPipelineStatusClasses(stageStatus);
  
  // 对于 in-progress 状态，添加动画
  const iconClasses = cn(
    'w-5 h-5',
    statusClasses.split(' ').find(cls => cls.startsWith('text-')) || 'text-muted-foreground',
    stageStatus === 'in-progress' && 'animate-spin'
  );

  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        <StatusIcon className={iconClasses} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{stage.name}</h4>
          <Badge 
            variant="outline" 
            className={cn('border', statusClasses)}
          >
            {getPipelineStatusLabel(stageStatus)}
          </Badge>
        </div>
        {stage.summary && (
          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line">
            {stage.summary}
          </p>
        )}
        {stage.completedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            完成时间: {new Date(stage.completedAt).toLocaleString('zh-CN')}
          </p>
        )}
      </div>
    </div>
  );
}

// 导出包裹了 Provider 的页面组件
export default function PlanStudioPage() {
  return (
    <PlanStudioProvider>
      <PlanStudioPageContent />
    </PlanStudioProvider>
  );
}