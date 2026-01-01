import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IntentTab from './IntentTab';
import PlacesTab from './PlacesTab';
import ScheduleTab from './ScheduleTab';
import OptimizeTab from './OptimizeTab';
import WhatIfTab from './WhatIfTab';
import BookingsTab from './BookingsTab';
import PersonaModeToggle, { type PersonaMode } from '@/components/common/PersonaModeToggle';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';
import PlanStudioSidebar from '@/components/plan-studio/PlanStudioSidebar';
import { Compass } from '@/components/illustrations/SimpleIllustrations';
import { Button } from '@/components/ui/button';

export default function PlanStudioPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const defaultTab = searchParams.get('tab') || 'intent';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [personaMode, setPersonaMode] = useState<PersonaMode>('abu');
  
  const { state: onboardingState, completeTour, completeStep } = useOnboarding();
  const [showTour, setShowTour] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', value);
    setSearchParams(newParams);
    
    // 完成对应步骤
    if (value === 'intent') completeStep('style');
    if (value === 'places') completeStep('places');
    if (value === 'schedule') completeStep('schedule');
    if (value === 'optimize') completeStep('optimize');
    
    // 默认视图切换策略：点击 optimize Tab 自动切到 Dr.Dre
    if (value === 'optimize' && personaMode !== 'dre') {
      setPersonaMode('dre');
    }
  };

  // 根据当前 Tab 显示对应的 Tour
  useEffect(() => {
    if (!onboardingState.toursCompleted.planStudio && tripId) {
      // 首次进入 Plan Studio，延迟显示 Tour
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tripId, onboardingState.toursCompleted.planStudio]);

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

  // Places Tab Tour
  const placesTourSteps: TourStep[] = [
    {
      id: 'search',
      target: '[data-tour="places-search"]',
      title: 'Search Places',
      description: 'Search places with real metadata (hours, location, booking). 搜索带有真实元数据的地点。',
      position: 'bottom',
    },
    {
      id: 'evidence',
      target: '[data-tour="places-evidence"]',
      title: 'Evidence Tags',
      description: "If it has no evidence, it can't be scheduled reliably. 没有证据的地点无法可靠地排入日程。",
      position: 'right',
    },
    {
      id: 'day-basket',
      target: '[data-tour="day-basket"]',
      title: 'Day Basket',
      description: "Drag places here. We'll schedule later. 将地点拖到这里，稍后我们会安排时间。",
      position: 'left',
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
      case 'places':
        return placesTourSteps;
      case 'schedule':
        return scheduleTourSteps;
      case 'optimize':
        return optimizeTourSteps;
      default:
        return [];
    }
  };

  if (!tripId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 opacity-50">
                <Compass size={120} color="#9CA3AF" />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">{t('planStudio.noTrip')}</p>
              <p className="text-xs text-muted-foreground mb-4">选择一个行程开始规划</p>
              <Button onClick={() => navigate('/dashboard/trips')}>
                {t('planStudio.goToTrips')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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

      {/* 顶部：标题 + 模式切换 */}
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('planStudio.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('planStudio.subtitle')}
          </p>
        </div>
        <PersonaModeToggle value={personaMode} onChange={setPersonaMode} />
      </div>

      {/* 主内容区：Tab导航 + 内容 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
          <div className="border-b bg-white px-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="intent">{t('planStudio.tabs.intent')}</TabsTrigger>
              <TabsTrigger value="places">{t('planStudio.tabs.places')}</TabsTrigger>
              <TabsTrigger value="schedule">{t('planStudio.tabs.schedule')}</TabsTrigger>
              <TabsTrigger value="optimize">{t('planStudio.tabs.optimize')}</TabsTrigger>
              <TabsTrigger value="what-if">{t('planStudio.tabs.whatIf')}</TabsTrigger>
              <TabsTrigger value="bookings">{t('planStudio.tabs.bookings')}</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-12 gap-6">
              {/* 主内容区（8/12） */}
              <div className="col-span-12 lg:col-span-8">
                <TabsContent value="intent" className="mt-0">
                  <IntentTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
                <TabsContent value="places" className="mt-0">
                  <PlacesTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
                <TabsContent value="schedule" className="mt-0">
                  <ScheduleTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
                <TabsContent value="optimize" className="mt-0">
                  <OptimizeTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
                <TabsContent value="what-if" className="mt-0">
                  <WhatIfTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
                <TabsContent value="bookings" className="mt-0">
                  <BookingsTab tripId={tripId} personaMode={personaMode} />
                </TabsContent>
              </div>

              {/* 右侧栏（4/12） */}
              <div className="col-span-12 lg:col-span-4">
                <PlanStudioSidebar personaMode={personaMode} />
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

