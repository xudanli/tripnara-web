/**
 * 右侧 AI 助手侧边栏上下文
 * 用于执行页等子页面根据侧边栏展开状态调整布局（如快捷操作栏位置）
 */

import { createContext, useContext, ReactNode } from 'react';

export interface AssistantSidebarContextValue {
  /** 侧边栏是否展开 */
  expanded: boolean;
  /** 侧边栏宽度（px），展开时用于计算快捷操作栏等元素的 right 偏移 */
  width: number;
}

const defaultValue: AssistantSidebarContextValue = {
  expanded: false,
  width: 0,
};

const AssistantSidebarContext = createContext<AssistantSidebarContextValue>(defaultValue);

export function AssistantSidebarProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AssistantSidebarContextValue;
}) {
  return (
    <AssistantSidebarContext.Provider value={value}>
      {children}
    </AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar() {
  return useContext(AssistantSidebarContext);
}
