import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAgentRouteQueryOptions } from '@/lib/agent-route-query';
import { AgentDebugReplaySheet } from '@/components/agent/AgentDebugReplaySheet';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen, Sparkles, Compass, RefreshCw } from 'lucide-react';
import AgentChat from './AgentChat';
import JourneyAssistantChat from './JourneyAssistantChat';
import Logo from '@/components/common/Logo';
import type { EntryPoint } from '@/api/agent';
import { useAuth } from '@/hooks/useAuth';
import PlanStudioContext from '@/contexts/PlanStudioContext';
import type { SelectedContext } from '@/contexts/PlanStudioContext';
import { buildPlanStudioAssistantQuestion } from '@/lib/plan-studio-assistant-question';
import { syncTripDataAfterAgentMutation } from '@/lib/agent-trip-sync';
import { sanitizeRouteRunTripId } from '@/lib/route-run-trip-id';

// localStorage key for sidebar state
const SIDEBAR_STATE_KEY = 'agent-sidebar-expanded';

interface AgentChatSidebarProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  entryPoint?: EntryPoint;
  className?: string;
  onExpandedChange?: (expanded: boolean) => void;
  /** 移动端 Sheet 模式：强制展开，无折叠按钮 */
  forceExpanded?: boolean;
  /** Sheet 模式下的关闭回调 */
  onClose?: () => void;
  /** 由 ResizablePanel 控制宽度时为 true，侧栏占满父容器 */
  layoutExpanded?: boolean;
}

// 根据入口点获取侧边栏配置
function getSidebarConfig(entryPoint?: EntryPoint, hasTrip?: boolean) {
  switch (entryPoint) {
    case 'planning_workbench':
      return {
        title: hasTrip ? '智能体' : '规划助手',
        subtitle: hasTrip ? '已关联当前行程' : '统一入口 · route_and_run',
        icon: null, // 使用 Logo 组件
        useLogo: true,
        iconBgClass: '',
        iconTextClass: '',
        component: 'planning' as const,
      };
    case 'execute':
      return {
        title: '行程助手',
        subtitle: '旅途中的智能伙伴',
        icon: Compass,
        iconBgClass: 'bg-gradient-to-br from-teal-500 to-cyan-600',
        iconTextClass: 'text-white',
        component: 'journey' as const,
      };
    default:
      return {
        title: 'Nara',
        subtitle: '智能旅行副驾驶',
        icon: null, // 使用 Logo 组件
        useLogo: true,
        iconBgClass: '',
        iconTextClass: 'text-primary',
        component: 'legacy' as const,
      };
  }
}

export default function AgentChatSidebar({
  activeTripId,
  onSystem2Response,
  entryPoint,
  className,
  onExpandedChange,
  forceExpanded = false,
  onClose,
  layoutExpanded = false,
}: AgentChatSidebarProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentRouteOpts = useAgentRouteQueryOptions();
  const isPlanStudioAgent = entryPoint === 'planning_workbench';
  const [clearMessagesFn, setClearMessagesFn] = useState<(() => void) | null>(null);

  // 规划工作台场景：若父级未传 activeTripId，从 URL ?tripId= 读取作为 fallback
  const effectiveTripId =
    entryPoint === 'planning_workbench' && !activeTripId
      ? searchParams.get('tripId')
      : activeTripId;
  
  // 获取 PlanStudio context（可能不在 Provider 内，所以直接用 useContext）
  const planStudioContext = useContext(PlanStudioContext);
  
  // Initialize from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved !== null ? saved === 'true' : false; // Default to collapsed (不默认打开)
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isExpanded));
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  // 注册打开助手抽屉的回调
  const openAssistant = useCallback(() => {
    setIsExpanded(true);
  }, []);
  
  useEffect(() => {
    if (planStudioContext?.setOnOpenAssistant) {
      planStudioContext.setOnOpenAssistant(openAssistant);
    }
  }, [planStudioContext, openAssistant]);

  /** 自 /dashboard/agent 重定向时自动展开侧栏 */
  useEffect(() => {
    if (!isPlanStudioAgent || !agentRouteOpts.shouldOpenAgentPanel) return;
    setIsExpanded(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('agentOpen');
        return next;
      },
      { replace: true }
    );
  }, [isPlanStudioAgent, agentRouteOpts.shouldOpenAgentPanel, setSearchParams]);

  const toggleAgentDebugMode = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get('mode')?.toLowerCase() === 'debug') {
          next.delete('mode');
        } else {
          next.set('mode', 'debug');
        }
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const sendMessageRef = useRef<((message: string) => void | Promise<void>) | null>(null);

  useEffect(() => {
    if (entryPoint !== 'planning_workbench' || !planStudioContext?.setOnAskAssistant) return;

    planStudioContext.setOnAskAssistant((question: string, context: SelectedContext) => {
      const fullQuestion = buildPlanStudioAssistantQuestion(question, context);
      if (sendMessageRef.current) {
        void sendMessageRef.current(fullQuestion);
      } else {
        console.warn('[AgentChatSidebar] 智能体 sendMessage 尚未就绪');
      }
    });
  }, [entryPoint, planStudioContext]);

  const handlePlanStudioSystem2Response = useCallback(async () => {
    onSystem2Response?.();
    const tid = sanitizeRouteRunTripId(effectiveTripId);
    try {
      await syncTripDataAfterAgentMutation(queryClient, tid ?? undefined, 'plan-studio-agent');
    } catch (e) {
      console.error('[AgentChatSidebar] sync after System2 failed', e);
      toast.error('行程数据刷新失败，请稍后手动刷新页面');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan-studio:schedule-refresh'));
    }
  }, [onSystem2Response, queryClient, effectiveTripId]);

  const config = getSidebarConfig(entryPoint, !!effectiveTripId);
  const IconComponent = config.icon;
  const useLogo = 'useLogo' in config && config.useLogo;

  // 渲染对应的智能体组件
  const renderAssistant = () => {
    switch (config.component) {
      case 'planning':
        // 原 /dashboard/agent 全量能力：行程副驾驶 + URL 调试/传感器参数
        return (
          <AgentChat
            activeTripId={effectiveTripId}
            entryPoint={entryPoint}
            attachActiveTripSummaryContext={Boolean(
              effectiveTripId && !agentRouteOpts.routeContextType?.trim()
            )}
            pageMode={isPlanStudioAgent ? agentRouteOpts.pageMode : 'user'}
            routeContextType={isPlanStudioAgent ? agentRouteOpts.routeContextType : undefined}
            enableLiveTools={isPlanStudioAgent ? agentRouteOpts.enableLiveTools : undefined}
            intentFlags={isPlanStudioAgent ? agentRouteOpts.intentFlags : undefined}
            onSystem2Response={handlePlanStudioSystem2Response}
            className="h-full"
            onSendMessageReady={(send) => {
              sendMessageRef.current = send;
            }}
            onClearReady={(fn) => setClearMessagesFn(() => fn)}
          />
        );
      case 'journey':
        if (!effectiveTripId || !user) {
          return (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Compass className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  需要选择一个行程才能使用行程助手
                </p>
              </div>
            </div>
          );
        }
        return (
          <JourneyAssistantChat
            tripId={effectiveTripId}
            userId={user.id}
            className="h-full"
            hideScheduleAndRemindersTabs
          />
        );
      default:
        return (
          <AgentChat
            activeTripId={effectiveTripId}
            onSystem2Response={onSystem2Response}
            entryPoint={entryPoint}
            attachActiveTripSummaryContext={Boolean(
              effectiveTripId && entryPoint === 'trip_detail_page'
            )}
            className="h-full"
          />
        );
    }
  };

  const expanded = forceExpanded || isExpanded;

  return (
    <aside
      className={cn(
        'relative z-30 bg-white border-l border-gray-200 flex flex-col h-full flex-shrink-0',
        layoutExpanded
          ? 'w-full min-w-0'
          : expanded
            ? 'w-[440px] min-w-[300px] max-w-[800px]'
            : 'w-14 min-w-[3.5rem]',
        !layoutExpanded && 'transition-[width] duration-300 ease-in-out',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'h-16 border-b border-gray-200 flex items-center px-3',
          expanded ? 'justify-between' : 'justify-center'
        )}
      >
        {expanded ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <button
                  onClick={toggleExpanded}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="点击收起/展开助手"
                >
                  {useLogo ? (
                    <Logo variant="icon" size={28} color="currentColor" className="text-slate-800" />
                  ) : IconComponent ? (
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', config.iconBgClass)}>
                      <IconComponent className={cn('w-4 h-4', config.iconTextClass)} />
                    </div>
                  ) : (
                    <Logo variant="icon" size={28} />
                  )}
                </button>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold text-gray-900">{config.title}</span>
                  {config.component === 'legacy' && (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{config.subtitle}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {config.component === 'planning' && isPlanStudioAgent && agentRouteOpts.pageMode === 'debug' ? (
                <AgentDebugReplaySheet tripIdRaw={effectiveTripId} />
              ) : null}
              {config.component === 'planning' && isPlanStudioAgent ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] text-gray-500"
                  onClick={toggleAgentDebugMode}
                  title={agentRouteOpts.pageMode === 'debug' ? '退出调试模式' : '调试模式'}
                >
                  {agentRouteOpts.pageMode === 'debug' ? '调试中' : '调试'}
                </Button>
              ) : null}
              {/* 清空按钮 - 规划模式下显示，点击清空对话 */}
              {config.component === 'planning' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearMessagesFn?.()}
                  disabled={!clearMessagesFn}
                  className="h-8 w-8 text-gray-500 hover:text-gray-700"
                  title="清空对话并重置服务端会话（DELETE v2 session）"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {!forceExpanded ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleExpanded}
                  className="h-8 w-8 text-gray-500 hover:text-gray-700"
                  title="收起侧边栏"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              ) : (
                onClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-gray-500 hover:text-gray-700"
                    title="关闭"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                )
              )}
            </div>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={forceExpanded ? undefined : toggleExpanded}
            className={cn(
              'h-10 w-10',
              useLogo ? 'text-slate-800 hover:bg-slate-100' : IconComponent ? config.iconBgClass : 'text-primary hover:bg-primary/10'
            )}
            title="展开 AI 助手"
          >
            {useLogo ? (
              <Logo variant="icon" size={24} color="currentColor" />
            ) : IconComponent ? (
              <IconComponent className={cn('w-5 h-5', config.iconTextClass)} />
            ) : (
              <Logo variant="icon" size={24} />
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {expanded ? (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {renderAssistant()}
        </div>
      ) : (
        // Collapsed state - show vertical text and expand hint
        <div className="flex-1 flex flex-col items-center py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            className="h-10 w-10 mb-4 text-gray-400 hover:text-primary hover:bg-primary/10"
            title="展开 AI 助手"
          >
            <PanelRightOpen className="h-5 w-5" />
          </Button>
          
          {/* Vertical text */}
          <div className="writing-vertical-rl text-xs text-gray-400 tracking-wider select-none">
            点击展开 {config.title}
          </div>
        </div>
      )}
    </aside>
  );
}
