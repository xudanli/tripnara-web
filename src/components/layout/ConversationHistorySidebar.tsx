/**
 * 对话历史侧边栏组件
 * 显示最近会话，支持快速切换
 * 符合 Miller's Law：只显示最近 3-5 个会话
 */

import { useState, useEffect } from 'react';
import { tripsApi } from '@/api/trips';
import type { NLConversation } from '@/types/trip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { 
  MessageSquare, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ConversationHistorySidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  className?: string;
}

export default function ConversationHistorySidebar({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  className,
}: ConversationHistorySidebarProps) {
  const [collapsed, setCollapsed] = useState(true); // 默认折叠
  const [conversations, setConversations] = useState<NLConversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!collapsed) {
      loadConversations();
    }
  }, [collapsed]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getAllNLConversations();
      // 只显示最近 5 个会话（符合 Miller's Law）
      const recentConversations = (response.sessions || []).slice(0, 5);
      setConversations(recentConversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const getSessionTitle = (conversation: NLConversation): string => {
    // 尝试从第一条用户消息生成标题
    const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const content = firstUserMessage.content;
      // 截取前 20 个字符作为标题
      return content.length > 20 ? content.substring(0, 20) + '...' : content;
    }
    return '新会话';
  };

  const getSessionSummary = (conversation: NLConversation): string | null => {
    // 尝试从最后一条 AI 消息中提取行程信息
    const lastAIMessage = [...conversation.messages].reverse().find(msg => msg.role === 'assistant');
    if (lastAIMessage?.metadata?.parsedParams) {
      const params = lastAIMessage.metadata.parsedParams;
      if (params.destination) {
        return params.destination.split(',')[0]?.trim() || null;
      }
    }
    return null;
  };

  // 键盘导航处理
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <aside 
      className={cn('h-full border-r border-gray-200 bg-white transition-all duration-300', className)}
      aria-label="对话历史侧边栏"
    >
      {collapsed ? (
        /* 折叠状态：只显示图标 */
        <div className="flex flex-col items-center py-4 w-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            onKeyDown={(e) => handleKeyDown(e, () => setCollapsed(false))}
            className="mb-4"
            aria-label="展开对话历史"
            aria-expanded="false"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          {conversations.length > 0 && (
            <div className="text-xs text-muted-foreground" aria-label={`${conversations.length} 个历史会话`}>
              {conversations.length}
            </div>
          )}
        </div>
      ) : (
        /* 🆕 Gemini风格：展开状态：显示会话列表 - 参考Gemini的左侧边栏间距 */
        <div className="flex flex-col h-full w-64">
          {/* 🆕 Gemini风格：头部 - 参考Gemini的顶部间距 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold" id="conversation-history-title">对话历史</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              onKeyDown={(e) => handleKeyDown(e, () => setCollapsed(true))}
              className="h-6 w-6"
              aria-label="折叠对话历史"
              aria-expanded="true"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* 🆕 Gemini风格：新建会话按钮 - 参考Gemini的"发起新对话"间距 */}
          <div className="px-5 py-3 border-b border-gray-200">
            <Button
              variant="default"
              size="sm"
              className="w-full bg-black hover:bg-gray-800 text-white"
              onClick={onNewSession}
              aria-label="创建新对话会话"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              新建会话
            </Button>
          </div>

          {/* 🆕 Gemini风格：会话列表 - 参考Gemini的列表间距 */}
          <ScrollArea className="flex-1" aria-labelledby="conversation-history-title">
            {loading ? (
              <div className="flex items-center justify-center py-8" role="status" aria-label="加载对话历史中">
                <Spinner className="w-5 h-5" aria-hidden="true" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-5 text-center" role="status">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">暂无历史会话</p>
              </div>
            ) : (
              <div className="px-5 py-3 space-y-1" role="list" aria-label="对话会话列表">
                {conversations.map((conversation, index) => {
                  const isActive = conversation.sessionId === currentSessionId;
                  const title = getSessionTitle(conversation);
                  const summary = getSessionSummary(conversation);
                  const lastMessage = conversation.messages[conversation.messages.length - 1];
                  const timeAgo = lastMessage
                    ? formatDistanceToNow(new Date(lastMessage.timestamp), {
                        addSuffix: true,
                        locale: zhCN,
                      })
                    : '';

                  return (
                    <button
                      key={conversation.sessionId}
                      onClick={() => onSessionSelect(conversation.sessionId)}
                      onKeyDown={(e) => handleKeyDown(e, () => onSessionSelect(conversation.sessionId))}
                      className={cn(
                        // 🆕 Gemini风格：参考Gemini的列表项间距和样式
                        'w-full text-left px-4 py-3 rounded-lg transition-colors',
                        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2',
                        isActive && 'bg-gray-100 border border-gray-200'
                      )}
                      role="listitem"
                      aria-label={`会话 ${index + 1}: ${title}${summary ? `, 目的地: ${summary}` : ''}${timeAgo ? `, ${timeAgo}` : ''}`}
                      aria-current={isActive ? 'true' : 'false'}
                      tabIndex={0}
                    >
                      {/* 🆕 Gemini风格：参考Gemini的文本样式和间距 */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={cn(
                          'text-sm font-normal truncate flex-1',
                          isActive ? 'text-gray-900 font-medium' : 'text-gray-700'
                        )}>
                          {title}
                        </span>
                      </div>
                      {summary && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          <span className="truncate">{summary}</span>
                        </div>
                      )}
                      {timeAgo && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          <span>{timeAgo}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </aside>
  );
}
