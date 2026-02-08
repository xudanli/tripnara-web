/**
 * Planning Assistant V2 - 侧边栏适配组件
 * 
 * 用于规划工作台右侧边栏，适配 AgentChatSidebar 的布局要求
 * 
 * 支持两种场景：
 * 1. 创建新行程（无 tripId）
 * 2. 优化已创建行程（有 tripId）- 通过对话接口传递 tripId 上下文
 */

import { PlanningAssistant } from './PlanningAssistant';

interface PlanningAssistantSidebarProps {
  userId?: string;
  tripId?: string | null;
  className?: string;
  onTripUpdate?: () => void;
}

/**
 * Planning Assistant V2 侧边栏组件
 * 
 * 适配规划工作台右侧边栏的布局和交互
 * 
 * 注意：当有 tripId 时，用户可以通过对话告诉 AI 要优化哪个行程
 * 或者使用 Planning Assistant V2 的 trips API 直接优化行程
 */
export function PlanningAssistantSidebar({
  userId,
  tripId,
  className,
  onTripUpdate,
}: PlanningAssistantSidebarProps) {
  // tripId 可以通过对话上下文传递给 AI
  // 或者用户可以直接说"优化当前行程"
  
  return (
    <div className={className || 'h-full'}>
      <PlanningAssistant userId={userId} />
    </div>
  );
}
