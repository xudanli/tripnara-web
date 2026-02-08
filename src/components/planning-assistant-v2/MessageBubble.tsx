/**
 * Planning Assistant V2 - 消息气泡组件
 */

import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useChatV2';
import { MCPDataDisplay } from './MCPDataDisplay';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser ? 'text-right' : 'text-left'
        )}
      >
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted rounded-tl-sm'
          )}
        >
          <div className="whitespace-pre-wrap">
            {message.content || '(空消息)'}
          </div>
        </div>

        {/* MCP 服务数据展示（推荐、酒店、餐厅、天气等） */}
        {!isUser && <MCPDataDisplay message={message} />}

        {/* 建议操作 */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="text-xs px-3 py-1.5 bg-background border border-input rounded-md hover:bg-accent transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <div
          className={cn(
            'text-xs text-muted-foreground mt-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {message.timestamp.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
