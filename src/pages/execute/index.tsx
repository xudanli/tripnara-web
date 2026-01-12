import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import { executionApi } from '@/api/execution';
import type { TripDetail, TripState, ScheduleResponse } from '@/types/trip';
import type { Reminder, ExecutionState } from '@/api/execution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  ArrowRight,
  MessageSquare,
  Navigation,
  Wifi,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EmptyExecuteIllustration } from '@/components/illustrations';
import PersonaModeToggle, { type PersonaMode } from '@/components/common/PersonaModeToggle';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SpotlightTour from '@/components/onboarding/SpotlightTour';
import type { TourStep } from '@/components/onboarding/SpotlightTour';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function ExecutePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tripId = searchParams.get('tripId');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [tripState, setTripState] = useState<TripState | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRepairSheet, setShowRepairSheet] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [personaMode, setPersonaMode] = useState<PersonaMode>('abu');
  
  // 执行阶段相关状态
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(false);
  
  const { state: onboardingState, completeTour, completeStep } = useOnboarding();
  const [showExecuteTour, setShowExecuteTour] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadData();
      loadReminders();
      // 每30秒轮询一次状态
      const interval = setInterval(() => {
        if (tripId) {
          loadTripState();
          loadReminders();
        }
      }, 30000);
      
      // 首次进入 Execute，显示引导
      if (!onboardingState.toursCompleted.execute) {
        setTimeout(() => {
          setShowExecuteTour(true);
        }, 1000);
      }
      
      return () => clearInterval(interval);
    }
  }, [tripId, onboardingState.toursCompleted.execute]);

  const loadData = async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const [tripData, state] = await Promise.all([
        tripsApi.getById(tripId),
        tripsApi.getState(tripId),
      ]);
      setTrip(tripData);
      setTripState(state);

      // 加载今天的 Schedule
      if (state.currentDayId) {
        const today = new Date().toISOString().split('T')[0];
        try {
          const schedule = await tripsApi.getSchedule(tripId, today);
          setTodaySchedule(schedule);
        } catch (err) {
          console.error('Failed to load today schedule:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTripState = async () => {
    if (!tripId) return;
    try {
      const state = await tripsApi.getState(tripId);
      setTripState(state);
    } catch (err) {
      console.error('Failed to load trip state:', err);
    }
  };

  const loadReminders = async () => {
    if (!tripId) return;
    try {
      setLoadingReminders(true);
      const result = await executionApi.execute({
        tripId,
        action: 'remind',
        remindParams: {
          reminderTypes: ['departure', 'transport', 'weather', 'check_in', 'check_out'],
          advanceHours: 24,
        },
      });
      setExecutionState(result.executionState);
      setReminders(result.uiOutput.reminders || []);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setReminders([]);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!tripId) return;
    
    try {
      if (action === 'delay-15m' || action === 'delay-30m') {
        // 处理延迟变更
        const delayMinutes = action === 'delay-15m' ? 15 : 30;
        await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'schedule_change',
            changeDetails: {
              reason: `用户请求延迟 ${delayMinutes} 分钟`,
            },
          },
        });
        // 重新加载数据
        await loadData();
        await loadReminders();
        setShowRepairSheet(true);
      } else if (action === 'skip') {
        // 处理跳过变更
        await executionApi.execute({
          tripId,
          action: 'handle_change',
          changeParams: {
            changeType: 'activity_cancelled',
            changeDetails: {
              reason: '用户请求跳过当前活动',
            },
          },
        });
        await loadData();
        await loadReminders();
      } else if (action === 'replace') {
        // 触发修复（Neptune 会提供替换方案）
        await executionApi.execute({
          tripId,
          action: 'fallback',
          fallbackParams: {
            triggerReason: '用户请求替换当前活动',
            originalPlan: tripState,
          },
        });
        setShowRepairSheet(true);
      } else if (action.startsWith('agent:')) {
        // 调用 Agent API
        console.log('Calling Agent:', action);
      } else {
        console.log('Action:', action);
      }
      
      // 完成 execute 步骤
      completeStep('execute');
    } catch (err) {
      console.error('Failed to handle action:', err);
    }
  };

  // Execute 页面引导步骤
  const executeTourSteps: TourStep[] = [
    {
      id: 'next-step',
      target: '[data-tour="next-step"]',
      title: 'Next Step',
      description: 'This is your only focus in the field. 这是您在实地执行时的唯一焦点。',
      position: 'bottom',
    },
    {
      id: 'quick-actions',
      target: '[data-tour="quick-actions"]',
      title: 'Quick Actions',
      description: "Reality changes. These actions keep the plan executable. 现实会变化，这些操作让计划保持可执行。",
      position: 'top',
    },
    {
      id: 'repair-sheet',
      target: '[data-tour="repair-sheet"]',
      title: 'Neptune Repair Sheet',
      description: 'Neptune proposes minimal-change repairs you can preview. Neptune 提供可预览的最小改动修复方案。',
      position: 'top',
      action: () => {
        // 模拟触发修复
        setShowRepairSheet(true);
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!tripId || !trip) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4 opacity-50">
                <EmptyExecuteIllustration size={160} />
              </div>
              <p className="text-sm text-muted-foreground font-medium mb-1">请先选择一个正在执行的行程</p>
              <p className="text-xs text-muted-foreground mb-4">选择一个行程进入执行模式</p>
              <Button onClick={() => navigate('/dashboard/trips')}>
                前往行程库
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 从 tripState 获取下一步信息
  const nextStop = tripState?.nextStop;
  const currentDay = trip?.TripDay?.find(d => d.id === tripState?.currentDayId);
  const status = tripState?.currentItemId ? 'On track' : 'Needs repair';

  // 获取当前日期（已移除未使用的 currentDate 变量）

  return (
    <div className="h-full flex flex-col">
      {/* Execute Tour */}
      <SpotlightTour
        steps={executeTourSteps}
        open={showExecuteTour && !onboardingState.toursCompleted.execute}
        onClose={() => {
          setShowExecuteTour(false);
          completeTour('execute');
        }}
        onComplete={() => {
          setShowExecuteTour(false);
          completeTour('execute');
        }}
      />

      {/* A. 顶部条（12/12） */}
      <div className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">{trip.destination || '执行模式'}</h1>
            <div className="flex items-center gap-2 mt-1">
              {currentDay && (
                <span className="text-sm text-muted-foreground">
                  {format(new Date(currentDay.date), 'yyyy-MM-dd')}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {format(new Date(), 'HH:mm')}
              </span>
            </div>
          </div>
          <Badge variant={status === 'On track' ? 'default' : 'destructive'}>
            {status === 'On track' ? 'On Track' : 'Needs Repair'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="h-4 w-4" />
            <span>在线</span>
          </div>
          <PersonaModeToggle value={personaMode} onChange={setPersonaMode} />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
          {/* B. 主卡片：Next Step（8/12） */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {nextStop ? (
              <Card className="border-primary" data-tour="next-step">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5" />
                    下一步
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">{nextStop.placeName}</h3>
                    </div>
                    {nextStop.startTime && (
                      <div className="flex items-center gap-4 text-sm mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(nextStop.startTime), 'HH:mm')}
                        </span>
                        {nextStop.estimatedArrivalTime && (
                          <>
                            <span className="text-muted-foreground">
                              预计到达: {format(new Date(nextStop.estimatedArrivalTime), 'HH:mm')}
                            </span>
                            <Badge variant="outline">缓冲: 15分钟</Badge>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">为什么是现在：</span>
                      依据时间窗/交通/策略
                    </p>
                  </div>

                  {/* 关键证据（可折叠） */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEvidence(!showEvidence)}
                      className="w-full justify-between"
                    >
                      <span>关键证据</span>
                      {showEvidence ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    {showEvidence && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-sm">
                        <div>
                          <span className="font-medium">营业时间：</span>
                          <span className="text-muted-foreground">09:00-18:00</span>
                        </div>
                        <div>
                          <span className="font-medium">封路信息：</span>
                          <span className="text-muted-foreground">无</span>
                        </div>
                        <div>
                          <span className="font-medium">天气窗口：</span>
                          <span className="text-muted-foreground">晴朗，适合户外活动</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="w-full" variant="outline">
                    <Navigation className="w-4 h-4 mr-2" />
                    开始导航
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mb-4 opacity-50">
                      <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无下一步操作</p>
                    <p className="text-xs text-muted-foreground">所有任务已完成</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* C. 右侧：Today Timeline + Reminders（4/12） */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* 提醒卡片 */}
            {reminders.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    提醒
                  </CardTitle>
                  <CardDescription>重要提醒事项</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reminders.map((reminder) => {
                      const priorityColors = {
                        urgent: 'bg-red-100 border-red-300 text-red-800',
                        high: 'bg-orange-100 border-orange-300 text-orange-800',
                        medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                        low: 'bg-blue-100 border-blue-300 text-blue-800',
                      };
                      return (
                        <div
                          key={reminder.id}
                          className={`p-3 border rounded-lg ${priorityColors[reminder.priority] || priorityColors.medium}`}
                        >
                          <div className="font-medium text-sm mb-1">{reminder.title}</div>
                          <div className="text-xs opacity-90">{reminder.message}</div>
                          {reminder.triggerTime && (
                            <div className="text-xs opacity-70 mt-1">
                              {format(new Date(reminder.triggerTime), 'MM-dd HH:mm')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>今日时间线</CardTitle>
                <CardDescription>只显示今天</CardDescription>
              </CardHeader>
              <CardContent>
                {todaySchedule?.schedule?.items ? (
                  <div className="space-y-2">
                    {todaySchedule.schedule.items.map((item, idx) => {
                      const isCurrent = tripState?.currentItemId === item.placeId.toString();
                      const isNext = nextStop?.itemId === item.placeId.toString();
                      return (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg ${
                            isCurrent ? 'bg-primary/10 border-primary' : isNext ? 'bg-yellow-50 border-yellow-200' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{item.placeName}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.startTime} - {item.endTime}
                              </div>
                            </div>
                            {isCurrent && <Badge className="bg-primary">当前</Badge>}
                            {isNext && <Badge variant="outline">下一站</Badge>}
                            {!isCurrent && !isNext && <Badge variant="outline">待执行</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground font-medium mb-1">暂无今日安排</p>
                    <p className="text-xs text-muted-foreground">今天没有计划的活动</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* D. 固定动作栏（底部/右下浮层） */}
        <div className="fixed bottom-6 right-6 z-50" data-tour="quick-actions">
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('delay-15m')}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  延迟15m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('delay-30m')}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  延迟30m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('skip')}
                  className="flex items-center gap-1"
                >
                  <SkipForward className="h-3 w-3" />
                  Skip
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('replace')}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Replace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('reorder')}
                  className="col-span-2"
                >
                  Reorder today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction('call-agent')}
                  className="col-span-2 flex items-center gap-1"
                >
                  <MessageSquare className="h-3 w-3" />
                  Call Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* E. Neptune Repair Sheet（触发后从底部弹出） */}
      <Sheet open={showRepairSheet} onOpenChange={setShowRepairSheet}>
        <SheetContent side="bottom" className="h-[80vh]" data-tour="repair-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Neptune 修复方案
            </SheetTitle>
            <SheetDescription>
              系统检测到问题，以下是推荐的修复方案
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {/* 问题描述 */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="font-medium text-yellow-800 mb-2">检测到的问题</div>
                <div className="text-sm text-yellow-700">
                  当前行程延误15分钟，可能影响后续安排
                </div>
              </CardContent>
            </Card>

            {/* 3个修复方案 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 方案1：最小改动（推荐） */}
              <Card className="border-primary cursor-pointer hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">最小改动</CardTitle>
                    <Badge className="bg-primary">推荐</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    仅调整后续时间，不删除任何地点
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">到达时间：</span>10:15 (+15分钟)</div>
                    <div><span className="font-medium">缺失点：</span>无</div>
                    <div><span className="font-medium">风险变化：</span>低</div>
                  </div>
                  <Button className="w-full">Preview</Button>
                </CardContent>
              </Card>

              {/* 方案2：体验优先 */}
              <Card className="cursor-pointer hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">体验优先</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    多走一点，保留所有核心体验点
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">到达时间：</span>10:20 (+20分钟)</div>
                    <div><span className="font-medium">缺失点：</span>无</div>
                    <div><span className="font-medium">风险变化：</span>中</div>
                  </div>
                  <Button variant="outline" className="w-full">Preview</Button>
                </CardContent>
              </Card>

              {/* 方案3：安全优先 */}
              <Card className="cursor-pointer hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">安全优先</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    回撤/减少强度，确保时间充足
                  </div>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">到达时间：</span>10:10 (+10分钟)</div>
                    <div><span className="font-medium">缺失点：</span>1个次要地点</div>
                    <div><span className="font-medium">风险变化：</span>低</div>
                  </div>
                  <Button variant="outline" className="w-full">Preview</Button>
                </CardContent>
              </Card>
            </div>

            {/* Apply 按钮 */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowRepairSheet(false)}>
                取消
              </Button>
              <Button onClick={() => {
                // TODO: 应用修复方案
                setShowRepairSheet(false);
              }}>
                Apply Changes
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

