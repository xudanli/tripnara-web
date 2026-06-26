/**
 * Planning Assistant V2 - 主页面组件
 *
 * 整合会话管理和对话面板，推荐/方案 tab 已移除
 */

import { useCallback, useEffect } from 'react';
import { usePlanningSessionV2 } from '@/hooks/usePlanningSessionV2';
import { useChatV2 } from '@/hooks/useChatV2';
import { ChatPanel } from './ChatPanel';
import { WelcomeScreen } from './WelcomeScreen';
import { PlanningAssistantErrorBoundary } from './ErrorBoundary';
import { FullScreenLoading } from './LoadingStates';
import type { TripDetail } from '@/types/trip';

interface PlanningAssistantProps {
  userId?: string;
  tripId?: string | null;
  countryCode?: string | null;
  /** 用户所在国家代码（如 CN），用于住宿搜索语言映射 */
  userCountryCode?: string | null;
  tripInfo?: TripDetail; // 行程详细信息，用于上下文感知
  className?: string;
  onSendMessageReady?: (sendMessage: (message: string) => Promise<void>) => void; // 通知父组件 sendMessage 已准备好
  onClearReady?: (clear: () => void) => void; // 通知父组件清空函数已准备好（供标题栏按钮调用）
  onAddToTripSuccess?: () => void; // 住宿等加入行程成功后的回调（如刷新日程）
}

export function PlanningAssistant({ userId, tripId, countryCode, userCountryCode, tripInfo, className, onSendMessageReady, onClearReady, onAddToTripSuccess }: PlanningAssistantProps) {
  const {
    sessionId,
    sessionState,
    isLoading: sessionLoading,
    createSession,
    resetSession,
  } = usePlanningSessionV2(userId);

  const { messages, sendMessage, clearMessages, isLoading: _chatLoading } = useChatV2(
    sessionId,
    userId,
    tripId || countryCode || userCountryCode
      ? {
          tripId: tripId || undefined,
          countryCode: countryCode || undefined,
          userCountryCode: userCountryCode || undefined,
        }
      : undefined
  );

  // 🆕 通知父组件 sendMessage 已准备好
  useEffect(() => {
    if (onSendMessageReady && sessionId) {
      onSendMessageReady(sendMessage);
    }
  }, [onSendMessageReady, sendMessage, sessionId]);

  // 规划工作台场景：如果有 tripId 或 countryCode，视为规划工作台场景
  const isPlanningWorkbench = !!(tripId || countryCode);

  // 自动创建会话（规划工作台场景总是创建，其他场景也创建）
  useEffect(() => {
    if (!sessionId && !sessionLoading) {
      createSession(userId);
    }
  }, [sessionId, sessionLoading, userId, createSession]);

  const handleClearConversation = useCallback(async () => {
    clearMessages();
    await resetSession();
  }, [clearMessages, resetSession]);

  useEffect(() => {
    onClearReady?.(handleClearConversation);
  }, [onClearReady, handleClearConversation]);

  // 处理欢迎界面的快速开始
  const handleQuickStart = async (prompt: string) => {
    if (!sessionId) {
      const ____newSessionId = await createSession(userId);
      // 等待会话创建完成后再发送消息
      setTimeout(() => {
        sendMessage(prompt);
      }, 100);
    } else {
      await sendMessage(prompt);
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
        {/* 主内容区：仅保留对话，推荐/方案 tab 已移除 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatPanel
            sessionId={sessionId}
            userId={userId}
            clearMessages={clearMessages}
            context={
              tripId || countryCode || userCountryCode
                ? {
                    tripId: tripId || undefined,
                    countryCode: countryCode || undefined,
                    userCountryCode: userCountryCode || undefined,
                  }
                : undefined
            }
            destination={tripInfo?.destination || sessionState?.preferences?.destination}
            tripInfo={tripInfo}
            tripId={tripId || undefined}
            onAddToTripSuccess={onAddToTripSuccess}
          />
        </div>
      </div>
    </PlanningAssistantErrorBoundary>
  );
}
