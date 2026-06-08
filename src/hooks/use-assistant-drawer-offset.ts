import { useAssistantSidebar } from '@/contexts/AssistantSidebarContext';

/**
 * 规划工作台 / 执行页右侧智能体宽度（px）。
 * 证据抽屉、准备度抽屉应贴在其左侧，避免 `fixed right-0` 盖住智能体栏。
 */
export function useAssistantDrawerRightOffset(): number {
  const { width } = useAssistantSidebar();
  return width > 0 ? width : 0;
}
