import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';
import { AGENT_SIDEBAR_WIDTH } from '@/lib/agent-sidebar-layout';

/** 桌面分栏且智能体侧栏已展开时，对话/卡片应占满侧栏宽度（不再套 44rem 上限） */
export function useAgentSidebarContentFullWidth(): boolean {
  const { expanded, width } = useAssistantSidebar();
  return expanded && width >= AGENT_SIDEBAR_WIDTH.MIN;
}

export function agentStructuredContentMaxClass(fullWidth: boolean): string {
  return fullWidth
    ? 'w-full min-w-0 max-w-full'
    : 'w-full min-w-0 max-w-[min(100%,44rem)]';
}
