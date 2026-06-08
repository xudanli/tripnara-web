/**
 * NL 建行程会话（trips `nl-conversation` API + NLConversationContextService）
 *
 * 与 `POST /api/agent/route_and_run` 的 AgentChat 会话模型分离：
 * - NL：`nl_conversation_session`、服务端持久化 messages
 * - Agent：内存/localStorage 气泡 + `conversation_context.recent_messages` 短窗
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface NLConversationContextValue {
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

const NLConversationContext = createContext<NLConversationContextValue | undefined>(undefined);

export function useNLConversation() {
  const context = useContext(NLConversationContext);
  if (!context) {
    throw new Error('useNLConversation must be used within NLConversationProvider');
  }
  return context;
}

interface NLConversationProviderProps {
  children: ReactNode;
}

export function NLConversationProvider({ children }: NLConversationProviderProps) {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    // 从 localStorage 恢复当前会话ID
    return localStorage.getItem('nl_conversation_session');
  });

  // 监听会话ID更新事件（从 NLChatInterface）
  useEffect(() => {
    const handleSessionUpdated = (event: CustomEvent<{ sessionId: string }>) => {
      setCurrentSessionId(event.detail.sessionId);
    };

    window.addEventListener('nl-conversation-session-updated', handleSessionUpdated as EventListener);
    return () => {
      window.removeEventListener('nl-conversation-session-updated', handleSessionUpdated as EventListener);
    };
  }, []);

  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    localStorage.setItem('nl_conversation_session', sessionId);
    // 触发自定义事件，通知 NLChatInterface 切换会话
    window.dispatchEvent(new CustomEvent('nl-conversation-switch', { detail: { sessionId } }));
  }, []);

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    localStorage.removeItem('nl_conversation_session');
    // 触发自定义事件，通知 NLChatInterface 创建新会话
    window.dispatchEvent(new CustomEvent('nl-conversation-new'));
  }, []);

  return (
    <NLConversationContext.Provider
      value={{
        currentSessionId,
        setCurrentSessionId,
        onSessionSelect: handleSessionSelect,
        onNewSession: handleNewSession,
      }}
    >
      {children}
    </NLConversationContext.Provider>
  );
}
