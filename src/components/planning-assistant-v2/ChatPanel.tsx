/**
 * Planning Assistant V2 - 对话面板组件
 */

import { useState, useRef, useEffect } from 'react';
import { useChatV2 } from '@/hooks/useChatV2';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Sparkles, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TripDetail } from '@/types/trip';

interface ChatPanelProps {
  sessionId: string | null;
  userId?: string;
  context?: {
    tripId?: string;
    countryCode?: string;
    currentLocation?: { lat: number; lng: number };
    timezone?: string;
  };
  destination?: string; // 当前选定的目的地，用于快捷操作
  tripInfo?: TripDetail; // 行程详细信息，用于上下文感知和显示
  className?: string;
}

export function ChatPanel({ sessionId, userId, context, destination, tripInfo, className }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isLoading, error } = useChatV2(sessionId, userId, context);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !sessionId) return;
    await sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请先创建会话
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-background ${className || ''}`}>
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* 当前行程信息提示（规划工作台场景） */}
          {tripInfo && messages.length === 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      我已了解您的当前行程
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {tripInfo.destination && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{tripInfo.destination}</span>
                        </div>
                      )}
                      {tripInfo.startDate && tripInfo.endDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(tripInfo.startDate).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                            {' - '}
                            {new Date(tripInfo.endDate).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {tripInfo.totalBudget && tripInfo.totalBudget > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>预算 ¥{tripInfo.totalBudget.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      我可以根据您的行程信息提供更精准的建议，比如推荐酒店、餐厅、天气查询等。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {messages.length === 0 && !tripInfo && (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
              <div>
                <p className="text-lg font-medium mb-2">开始对话</p>
                <p className="text-sm">告诉我你的旅行想法，我会帮你规划完美的行程</p>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {/* 快捷操作按钮（仅在消息为空时显示） */}
          {messages.length === 0 && (
            <div className="px-2 pb-4">
              <QuickActions
                onAction={sendMessage}
                destination={destination}
                disabled={isLoading || !sessionId}
              />
            </div>
          )}
          
          {isLoading && (
            <div className="flex gap-3 animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">AI正在思考...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {error.message || '发送消息失败，请重试'}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入框 */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
