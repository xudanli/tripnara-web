import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen, Sparkles, Compass, Bot } from 'lucide-react';
import AgentChat from './AgentChat';
import PlanningAssistantChat from './PlanningAssistantChat';
import JourneyAssistantChat from './JourneyAssistantChat';
import { NaraAgentChatting } from '@/components/illustrations/AgentIllustrations';
import type { EntryPoint } from '@/api/agent';
import { useAuth } from '@/hooks/useAuth';

// localStorage key for sidebar state
const SIDEBAR_STATE_KEY = 'agent-sidebar-expanded';

interface AgentChatSidebarProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  entryPoint?: EntryPoint;
  className?: string;
}

// 根据入口点获取侧边栏配置
function getSidebarConfig(entryPoint?: EntryPoint) {
  switch (entryPoint) {
    case 'planning_workbench':
      return {
        title: '规划助手',
        subtitle: '智能行程规划专家',
        icon: Sparkles,
        iconBgClass: 'bg-gradient-to-br from-violet-500 to-purple-600',
        iconTextClass: 'text-white',
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
        icon: null, // 使用 NaraAgentChatting
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
}: AgentChatSidebarProps) {
  const { user } = useAuth();
  
  // Initialize from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved !== null ? saved === 'true' : true; // Default to expanded
  });

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isExpanded));
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const config = getSidebarConfig(entryPoint);
  const IconComponent = config.icon;

  // 渲染对应的智能体组件
  const renderAssistant = () => {
    switch (config.component) {
      case 'planning':
        return (
          <PlanningAssistantChat
            userId={user?.id}
            className="h-full"
          />
        );
      case 'journey':
        if (!activeTripId || !user) {
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
            tripId={activeTripId}
            userId={user.id}
            className="h-full"
          />
        );
      default:
        return (
          <AgentChat
            activeTripId={activeTripId}
            onSystem2Response={onSystem2Response}
            entryPoint={entryPoint}
            className="h-full"
          />
        );
    }
  };

  return (
    <aside
      className={cn(
        'bg-white border-l border-gray-200 flex flex-col h-full transition-all duration-300 ease-in-out',
        isExpanded ? 'w-[380px]' : 'w-14',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'h-16 border-b border-gray-200 flex items-center px-3',
          isExpanded ? 'justify-between' : 'justify-center'
        )}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                {IconComponent ? (
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center', config.iconBgClass)}>
                    <IconComponent className={cn('w-4 h-4', config.iconTextClass)} />
                  </div>
                ) : (
                  <NaraAgentChatting
                    size={28}
                    color="currentColor"
                    highlightColor="currentColor"
                    className="text-primary"
                  />
                )}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleExpanded}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              title="收起侧边栏"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpanded}
            className={cn(
              'h-10 w-10',
              IconComponent ? config.iconBgClass : 'text-primary hover:bg-primary/10'
            )}
            title="展开 AI 助手"
          >
            {IconComponent ? (
              <IconComponent className={cn('w-5 h-5', config.iconTextClass)} />
            ) : (
              <NaraAgentChatting
                size={24}
                color="currentColor"
                highlightColor="currentColor"
              />
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {isExpanded ? (
        <div className="flex-1 overflow-hidden">
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
