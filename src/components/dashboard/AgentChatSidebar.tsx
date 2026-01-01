import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { agentApi } from '@/api/agent';
import type { RouteAndRunRequest, RouteAndRunResponse, RouteType } from '@/api/agent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, ExternalLink, Brain, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentChatSidebarProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void; // 当 System2 响应时，回调父组件刷新数据（persona-alerts/decision-log）
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'thinking' | 'browsing' | 'verifying' | 'repairing' | 'done' | 'failed';
  routeType?: RouteType;
  decisionLogCount?: number;
  hasPlan?: boolean; // 是否有 plan 或调整结果
}

export default function AgentChatSidebar({ activeTripId, onSystem2Response }: AgentChatSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // 添加思考中的消息
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '正在思考...',
      timestamp: new Date(),
      status: 'thinking',
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: activeTripId || null,
        message: userMessage.content,
        conversation_context: {
          recent_messages: messages.slice(-5).map((m) => m.content),
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);

      // 根据 routeType 处理响应（按照前端路由指南）
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';
      const decisionLogCount = response.explain?.decision_log?.length || 0;

      // 如果是 System2 且有回调，通知父组件刷新数据（persona-alerts/decision-log）
      if (isSystem2 && onSystem2Response) {
        // 延迟一下，确保后端数据已更新
        setTimeout(() => {
          onSystem2Response();
        }, 500);
      }

      // 构建消息内容
      let messageContent = response.result.answer_text || '抱歉，我无法处理这个请求。';
      
      // 对于 System2，如果有决策日志，在消息中提示
      if (isSystem2 && decisionLogCount > 0) {
        messageContent += `\n\n📊 已生成 ${decisionLogCount} 条决策记录，可在决策看板中查看详情。`;
      }

      // 移除思考中的消息，添加实际回复
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: messageContent,
            timestamp: new Date(),
            status: response.route.ui_hint.status,
            routeType,
            decisionLogCount: decisionLogCount > 0 ? decisionLogCount : undefined,
            hasPlan: isSystem2, // System2 通常会有 plan 或调整结果
          },
        ];
      });
    } catch (error: any) {
      console.error('Agent chat error:', error);
      // 移除思考中的消息，添加错误消息
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: error.message || '抱歉，发生了错误。请稍后重试。',
            timestamp: new Date(),
            status: 'failed',
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="sticky top-4 h-[calc(100vh-2rem)] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          智能助手
        </CardTitle>
        <CardDescription>
          你的旅程规划助手
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* 消息区域 */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>有什么可以帮助你的吗？</p>
                <p className="text-xs mt-2">你可以问我关于行程规划的任何问题</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* 根据 routeType 显示额外信息 */}
                    {message.role === 'assistant' && message.routeType && (
                      <div className="mt-2 flex flex-wrap gap-2 items-center">
                        {/* System2 标识 */}
                        {(message.routeType === 'SYSTEM2_REASONING' || message.routeType === 'SYSTEM2_WEBBROWSE') && (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              <Brain className="w-3 h-3 mr-1" />
                              System 2
                            </Badge>
                            {message.decisionLogCount !== undefined && (
                              <Badge variant="outline" className="text-xs">
                                <History className="w-3 h-3 mr-1" />
                                {message.decisionLogCount} 条决策记录
                              </Badge>
                            )}
                            {/* 如果有 tripId，显示查看详情链接 */}
                            {activeTripId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs px-2"
                                onClick={() => navigate(`/trips/${activeTripId}`)}
                              >
                                查看详情 <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                          </>
                        )}
                        {/* System1 标识 */}
                        {(message.routeType === 'SYSTEM1_API' || message.routeType === 'SYSTEM1_RAG') && (
                          <Badge variant="outline" className="text-xs">
                            {message.routeType === 'SYSTEM1_RAG' ? '知识检索' : '数据查询'}
                          </Badge>
                        )}
                      </div>
                    )}

                    {message.status && message.status !== 'done' && message.status !== 'failed' && (
                      <div className="mt-2 text-xs opacity-70">
                        {message.status === 'thinking' && '思考中...'}
                        {message.status === 'browsing' && '浏览中...'}
                        {message.status === 'verifying' && '验证中...'}
                        {message.status === 'repairing' && '修复中...'}
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Spinner className="w-4 h-4" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的问题..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
