/**
 * Planning Assistant V2 - 主页面组件
 * 
 * 整合所有功能的主页面，包括：
 * - 会话管理
 * - 对话面板
 * - 推荐展示
 * - 方案展示和对比
 */

import { useState, useEffect } from 'react';
import { usePlanningSessionV2 } from '@/hooks/usePlanningSessionV2';
import { useChatV2 } from '@/hooks/useChatV2';
import { usePlansV2 } from '@/hooks/usePlansV2';
import { useAsyncTaskV2 } from '@/hooks/useAsyncTaskV2';
import { ChatPanel } from './ChatPanel';
import { WelcomeScreen } from './WelcomeScreen';
import { RecommendationGrid } from './RecommendationGrid';
import { PlanCard } from './PlanCard';
import { PlanComparison } from './PlanComparison';
import { PlanningAssistantErrorBoundary } from './ErrorBoundary';
import { ProgressLoading, FullScreenLoading } from './LoadingStates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { RecommendationParams } from '@/api/planning-assistant-v2';
import type { TripDetail } from '@/types/trip';

interface PlanningAssistantProps {
  userId?: string;
  tripId?: string | null;
  countryCode?: string | null;
  tripInfo?: TripDetail; // 行程详细信息，用于上下文感知
  className?: string;
  onSendMessageReady?: (sendMessage: (message: string) => Promise<void>) => void; // 🆕 通知父组件 sendMessage 已准备好
}

export function PlanningAssistant({ userId, tripId, countryCode, tripInfo, className, onSendMessageReady }: PlanningAssistantProps) {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // 🆕 获取货币：优先从 tripInfo 的 budgetConfig 获取，其次从目的地获取，默认 CNY
  const currency = tripInfo?.budgetConfig?.currency || 'CNY';
  const [recommendationParams, setRecommendationParams] = useState<RecommendationParams | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  // 🆕 从消息中提取的推荐数据
  const [recommendationsFromMessages, setRecommendationsFromMessages] = useState<any[]>([]);
  // 🆕 从消息中提取的方案数据
  const [plansFromMessages, setPlansFromMessages] = useState<any[]>([]);

  const {
    sessionId,
    sessionState,
    isLoading: sessionLoading,
    createSession,
    deleteSession,
  } = usePlanningSessionV2(userId);

  const { messages, sendMessage, isLoading: chatLoading } = useChatV2(
    sessionId,
    userId,
    tripId || countryCode
      ? {
          tripId: tripId || undefined,
          countryCode: countryCode || undefined,
        }
      : undefined
  );

  // 🆕 通知父组件 sendMessage 已准备好
  useEffect(() => {
    if (onSendMessageReady && sessionId) {
      onSendMessageReady(sendMessage);
    }
  }, [onSendMessageReady, sendMessage, sessionId]);

  // 🆕 从消息中提取推荐和方案数据
  useEffect(() => {
    // 从最新的 AI 消息中提取推荐数据
    const latestMessage = messages
      .filter(m => m.role === 'assistant')
      .slice(-1)[0];
    
    console.log('[PlanningAssistant] 检查最新消息:', {
      hasMessage: !!latestMessage,
      hasRecommendations: !!latestMessage?.recommendations,
      recommendationsCount: latestMessage?.recommendations?.length || 0,
      recommendations: latestMessage?.recommendations,
      hasPlans: !!latestMessage?.plans,
      plansCount: latestMessage?.plans?.length || 0,
    });
    
    if (latestMessage?.recommendations && latestMessage.recommendations.length > 0) {
      console.log('[PlanningAssistant] 设置推荐数据:', latestMessage.recommendations);
      setRecommendationsFromMessages(latestMessage.recommendations);
    } else {
      // 如果没有推荐数据，清空之前的数据
      setRecommendationsFromMessages([]);
    }
    
    if (latestMessage?.plans && latestMessage.plans.length > 0) {
      console.log('[PlanningAssistant] 设置方案数据:', latestMessage.plans);
      setPlansFromMessages(latestMessage.plans);
    } else {
      // 如果没有方案数据，清空之前的数据
      setPlansFromMessages([]);
    }
  }, [messages]);
  
  const {
    generatePlanAsync,
    isGeneratingAsync,
    comparePlans,
    isComparing,
    comparisonResult,
    confirmPlan,
    isConfirming,
    error: plansError,
  } = usePlansV2();

  const {
    taskStatus,
    isCompleted,
    isFailed,
    progress,
  } = useAsyncTaskV2(taskId);

  // 规划工作台场景：如果有 tripId 或 countryCode，视为规划工作台场景
  const isPlanningWorkbench = !!(tripId || countryCode);

  // 自动创建会话（规划工作台场景总是创建，其他场景也创建）
  useEffect(() => {
    if (!sessionId && !sessionLoading) {
      createSession(userId);
    }
  }, [sessionId, sessionLoading, userId, createSession]);

  // 处理欢迎界面的快速开始
  const handleQuickStart = async (prompt: string) => {
    if (!sessionId) {
      const newSessionId = await createSession(userId);
      // 等待会话创建完成后再发送消息
      setTimeout(() => {
        sendMessage(prompt);
      }, 100);
    } else {
      await sendMessage(prompt);
    }
  };

  // 处理推荐选择
  const handleSelectRecommendation = async (recommendationId: string) => {
    // 可以发送消息选择推荐
    await sendMessage(`我想选择推荐 ${recommendationId}`);
  };

  // 处理方案选择
  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
  };

  // 处理方案对比
  const handleComparePlans = async () => {
    if (!sessionState?.planCandidates || sessionState.planCandidates.length < 2) {
      toast.error('至少需要2个方案才能对比');
      return;
    }

    const planIds = sessionState.planCandidates
      .slice(0, 3)
      .map((p) => p.id)
      .join(',');

    await comparePlans({
      planIds,
      sessionId: sessionId!,
      language: 'zh',
    });
    setShowComparison(true);
  };

  // 处理确认方案
  const handleConfirmPlan = async () => {
    if (!selectedPlanId || !sessionId) {
      toast.error('请先选择一个方案');
      return;
    }

    try {
      const tripId = await confirmPlan(selectedPlanId, {
        sessionId,
        userId,
      });
      
      toast.success('行程创建成功！');
      
      // 跳转到规划工作台
      setTimeout(() => {
        navigate(`/dashboard/plan-studio?tripId=${tripId}`);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || '确认方案失败');
    }
  };

  // 显示加载状态
  if (sessionLoading && !sessionId) {
    return <FullScreenLoading message="正在初始化..." />;
  }

  // 显示欢迎界面（仅在非规划工作台场景且没有会话或消息时）
  // 规划工作台场景：即使没有消息，也直接显示对话界面（不显示欢迎界面）
  if (!isPlanningWorkbench && (!sessionId || messages.length === 0)) {
    return (
      <PlanningAssistantErrorBoundary>
        <div className={`h-full ${className || ''}`}>
          <WelcomeScreen onStart={handleQuickStart} />
        </div>
      </PlanningAssistantErrorBoundary>
    );
  }

  return (
    <PlanningAssistantErrorBoundary>
      <div className={`flex flex-col h-full bg-background ${className || ''}`}>
        {/* 主内容区 */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="chat">对话</TabsTrigger>
              <TabsTrigger value="recommendations">推荐</TabsTrigger>
              <TabsTrigger value="plans">方案</TabsTrigger>
              {showComparison && <TabsTrigger value="compare">对比</TabsTrigger>}
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
              <ChatPanel
                sessionId={sessionId}
                userId={userId}
                context={
                  tripId || countryCode
                    ? {
                        tripId: tripId || undefined,
                        countryCode: countryCode || undefined,
                        // 后端可以通过 tripId 自动获取完整行程信息
                        // 这里只传递必要的标识信息
                      }
                    : undefined
                }
                destination={tripInfo?.destination || sessionState?.preferences?.destination}
                tripInfo={tripInfo}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="flex-1 overflow-auto p-4 min-h-0">
              {/* 🆕 优先使用从消息响应中获取的推荐数据 */}
              {(() => {
                console.log('[PlanningAssistant] 推荐标签页渲染:', {
                  recommendationsFromMessagesCount: recommendationsFromMessages.length,
                  sessionStateRecommendationsCount: sessionState?.recommendations?.length || 0,
                  hasRecommendationParams: !!recommendationParams,
                  phase: sessionState?.phase,
                  messagePhase: messages.find(m => m.phase)?.phase,
                });
                
                if (recommendationsFromMessages.length > 0) {
                  console.log('[PlanningAssistant] 使用消息中的推荐数据:', recommendationsFromMessages);
                  return (
                    <RecommendationGrid
                      recommendations={recommendationsFromMessages}
                      onSelect={handleSelectRecommendation}
                    />
                  );
                }
                
                if (sessionState?.recommendations && sessionState.recommendations.length > 0) {
                  console.log('[PlanningAssistant] 使用会话状态中的推荐数据:', sessionState.recommendations);
                  return (
                    <RecommendationGrid
                      recommendations={sessionState.recommendations}
                      onSelect={handleSelectRecommendation}
                    />
                  );
                }
                
                if (recommendationParams) {
                  console.log('[PlanningAssistant] 使用推荐参数获取数据:', recommendationParams);
                  return (
                    <RecommendationGrid
                      params={recommendationParams}
                      onSelect={handleSelectRecommendation}
                    />
                  );
                }
                
                return (
                  <div className="text-center text-muted-foreground py-12">
                    {sessionState?.phase === 'RECOMMENDING' || messages.some(m => m.phase === 'RECOMMENDING') ? (
                      <div>
                        <p className="text-sm mb-2">正在生成推荐...</p>
                        <p className="text-xs">请稍候，推荐结果将在此显示</p>
                        <p className="text-xs mt-2 text-gray-400">
                          调试信息: messages={messages.length}, 
                          recommendationsFromMessages={recommendationsFromMessages.length}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm mb-2">暂无推荐</p>
                        <p className="text-xs">请在对话中描述您的旅行需求，AI 将为您推荐合适的目的地</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="plans" className="flex-1 overflow-auto p-4">
              {/* 异步任务进度 */}
              {taskId && !isCompleted && !isFailed && (
                <div className="mb-4">
                  <ProgressLoading
                    progress={progress}
                    label="正在生成方案..."
                  />
                </div>
              )}

              {/* 方案列表 */}
              {/* 🆕 优先使用从消息响应中获取的方案数据 */}
              {plansFromMessages.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">方案列表</h3>
                    {plansFromMessages.length >= 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleComparePlans}
                        disabled={isComparing}
                      >
                        对比方案
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {plansFromMessages.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isSelected={selectedPlanId === plan.id}
                        onSelect={handleSelectPlan}
                        currency={currency}
                      />
                    ))}
                  </div>
                </div>
              ) : sessionState?.planCandidates && sessionState.planCandidates.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">方案列表</h3>
                    {sessionState.planCandidates.length >= 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleComparePlans}
                        disabled={isComparing}
                      >
                        对比方案
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    {sessionState.planCandidates.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isSelected={selectedPlanId === plan.id}
                        onSelect={handleSelectPlan}
                        currency={currency}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  暂无方案，请在对话中生成方案
                </div>
              )}

              {/* 错误提示 */}
              {plansError && (
                <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                  {plansError.message}
                </div>
              )}
            </TabsContent>

            {showComparison && comparisonResult && (
              <TabsContent value="compare" className="flex-1 overflow-auto p-4">
                <PlanComparison
                  comparison={comparisonResult}
                  onSelectPlan={handleSelectPlan}
                  selectedPlanId={selectedPlanId}
                  currency={currency}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </PlanningAssistantErrorBoundary>
  );
}
