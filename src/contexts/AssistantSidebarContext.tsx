/**
 * 右侧 AI 助手侧边栏上下文
 * 用于执行页等子页面根据侧边栏展开状态调整布局，并唤起统一 AgentChat。
 */

import { createContext, useContext, useCallback, useRef, type ReactNode } from 'react';

export interface AssistantSidebarContextValue {
  /** 侧边栏是否展开 */
  expanded: boolean;
  /** 侧边栏宽度（px），展开时用于计算快捷操作栏等元素的 right 偏移 */
  width: number;
  /** 展开右侧智能体侧栏 */
  openAssistant: () => void;
  /** 向智能体发送消息（需侧栏内 AgentChat 注册后可用） */
  sendAssistantMessage: (message: string) => void;
  /** 由 AgentChatSidebar 注册 open / send */
  registerAssistantHandlers: (handlers: {
    open?: () => void;
    send?: (message: string) => void | Promise<void>;
  }) => void;
}

const defaultValue: AssistantSidebarContextValue = {
  expanded: false,
  width: 0,
  openAssistant: () => {},
  sendAssistantMessage: () => {},
  registerAssistantHandlers: () => {},
};

const AssistantSidebarContext = createContext<AssistantSidebarContextValue>(defaultValue);

export function AssistantSidebarProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Pick<AssistantSidebarContextValue, 'expanded' | 'width'> & {
    onRequestExpand?: () => void;
  };
}) {
  const handlersRef = useRef<{
    open?: () => void;
    send?: (message: string) => void | Promise<void>;
  }>({});

  const registerAssistantHandlers = useCallback(
    (handlers: { open?: () => void; send?: (message: string) => void | Promise<void> }) => {
      handlersRef.current = handlers;
    },
    []
  );

  const openAssistant = useCallback(() => {
    value.onRequestExpand?.();
    handlersRef.current.open?.();
  }, [value.onRequestExpand]);

  const sendAssistantMessage = useCallback((message: string) => {
    value.onRequestExpand?.();
    handlersRef.current.open?.();
    const send = handlersRef.current.send;
    if (send) void send(message);
  }, [value.onRequestExpand]);

  const merged: AssistantSidebarContextValue = {
    expanded: value.expanded,
    width: value.width,
    openAssistant,
    sendAssistantMessage,
    registerAssistantHandlers,
  };

  return (
    <AssistantSidebarContext.Provider value={merged}>
      {children}
    </AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar() {
  return useContext(AssistantSidebarContext);
}
