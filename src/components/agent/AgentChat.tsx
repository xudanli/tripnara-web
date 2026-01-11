import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { agentApi } from '@/api/agent';
import type { RouteAndRunRequest, RouteAndRunResponse, RouteType, UIStatus, LLMProvider } from '@/api/agent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, Bot, User, ChevronRight, Settings, CheckCircle2, XCircle, Loader2, Trash2, HelpCircle, Zap, Infinity, MapPin, Utensils, Search, Calendar, RotateCw, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { toast } from 'sonner';
import { needsApproval, extractApprovalId } from '@/utils/approval';

interface AgentChatProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: UIStatus;
  routeType?: RouteType;
  routeInfo?: {
    confidence: number;
    latency_ms: number;
    tokens_est?: number;
    cost_est_usd?: number;
  };
  decisionLog?: Array<{
    step: number;
    chosen_action: string;
    reason_code?: string;
    confidence?: number;
  }>;
  mode?: 'fast' | 'slow';
}

/**
 * 状态指示器组件
 */
function StatusIndicator({ status }: { status: UIStatus }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'thinking':
        return {
          icon: (
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="absolute inset-1 rounded-full bg-blue-300"></div>
            </div>
          ),
          text: '让我思考一下…',
          color: 'text-blue-600',
        };
      case 'browsing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '正在浏览全球数据中…',
          color: 'text-orange-600',
        };
      case 'verifying':
        return {
          icon: (
            <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse"></div>
          ),
          text: '双重确认中，确保你拿到的是最准的建议！',
          color: 'text-yellow-600',
        };
      case 'repairing':
        return {
          icon: <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />,
          text: '咦，好像哪里有点问题，我来修一下 🛠️',
          color: 'text-orange-600',
        };
      case 'awaiting_consent':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500"></div>,
          text: '我需要你的授权才能继续操作 👇',
          color: 'text-red-600',
        };
      case 'awaiting_confirmation':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-red-500"></div>,
          text: '需要你确认一下，再继续行动～',
          color: 'text-red-600',
        };
      case 'done':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          text: '完成啦 🎉 安排行程成功！',
          color: 'text-green-600',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          text: '出了一点小状况，要不再试一次？',
          color: 'text-red-600',
        };
      default:
        return {
          icon: null,
          text: '',
          color: '',
        };
    }
  };

  const config = getStatusConfig();

  if (!config.icon) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', config.color)}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
}

/**
 * 路由信息卡片
 */
function RouteInfoCard({ routeInfo, routeType }: { routeInfo: Message['routeInfo']; routeType?: RouteType }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!routeInfo || !routeType) return null;

  const getRouteTypeLabel = () => {
    switch (routeType) {
      case 'SYSTEM1_API':
        return '系统 API';
      case 'SYSTEM1_RAG':
        return '知识检索';
      case 'SYSTEM2_REASONING':
        return '深度推理';
      case 'SYSTEM2_WEBBROWSE':
        return '网页浏览';
      default:
        return routeType;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <ChevronRight className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
            <span>路由信息</span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">路由类型：</span>
            <Badge variant="outline" className="text-xs">
              {getRouteTypeLabel()}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">置信度：</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full', getConfidenceColor(routeInfo.confidence))}
                  style={{ width: `${routeInfo.confidence * 100}%` }}
                />
              </div>
              <span className="font-medium">{(routeInfo.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">耗时：</span>
            <span className="font-medium">{routeInfo.latency_ms}ms</span>
          </div>
          {routeInfo.tokens_est !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Token 消耗：</span>
              <span className="font-medium">{routeInfo.tokens_est.toLocaleString()}</span>
            </div>
          )}
          {routeInfo.cost_est_usd !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">成本估算：</span>
              <span className="font-medium">${routeInfo.cost_est_usd.toFixed(4)}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * 决策日志卡片
 */
function DecisionLogCard({ decisionLog }: { decisionLog: Message['decisionLog'] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!decisionLog || decisionLog.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <ChevronRight className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')} />
            <span>决策日志 ({decisionLog.length} 条)</span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          {decisionLog.map((log, idx) => (
            <div key={idx} className="border-l-2 border-primary/30 pl-2.5 pb-2 last:pb-0">
              <div className="font-medium mb-0.5">
                步骤 {log.step}：{log.chosen_action}
              </div>
              {log.reason_code && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  原因：{log.reason_code}
                </div>
              )}
              {log.confidence !== undefined && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  置信度：{(log.confidence * 100).toFixed(0)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * 消息气泡组件
 */
function MessageBubble({ message, mode, onRetry }: { message: Message; mode?: 'fast' | 'slow'; onRetry?: () => void }) {
  const isUser = message.role === 'user';
  const isFastMode = mode === 'fast' || message.mode === 'fast';
  const isError = message.status === 'failed';
  const isTimeout = message.content.includes('超时') || message.content.includes('TIMEOUT');

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : cn(
                'bg-background border',
                isError ? 'border-red-200 bg-red-50/50' : isFastMode ? 'border-blue-200' : 'border-orange-200'
              )
        )}
      >
        {!isUser && message.status && message.status !== 'failed' && (
          <div className="mb-2">
            <StatusIndicator status={message.status} />
          </div>
        )}
        
        {/* 错误消息特殊处理 */}
        {isError && (
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <XCircle className="w-3 h-3 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                {isTimeout ? '⚠️ 哎呀，请求超时了...' : '⚠️ 出了一点小状况'}
              </p>
              <p className="text-xs text-red-700 mb-3">
                {isTimeout 
                  ? '可能是网络问题或服务繁忙。要不要再试一次？'
                  : (message.content === 'TIMEOUT' || message.content === 'FAILED' 
                      ? '可能是网络问题或服务繁忙。要不要再试一次？'
                      : message.content.replace('出了一点小状况，要不再试一次？', '').trim() || '可能是网络问题或服务繁忙。要不要再试一次？')
                }
              </p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-full border-red-200 text-red-700 hover:bg-red-50"
                  onClick={onRetry}
                >
                  <RotateCw className="w-3 h-3 mr-1.5" />
                  重新尝试
                </Button>
              )}
            </div>
          </div>
        )}
        
        {!isError && (
          <p className={cn('text-sm whitespace-pre-wrap', isUser ? 'text-primary-foreground' : 'text-foreground')}>
            {message.content}
          </p>
        )}
        
        {!isUser && !isError && (
          <>
            <RouteInfoCard routeInfo={message.routeInfo} routeType={message.routeType} />
            <DecisionLogCard decisionLog={message.decisionLog} />
          </>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
      )}
    </div>
  );
}

export default function AgentChat({ activeTripId, onSystem2Response, className }: AgentChatProps) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'fast' | 'slow'>('fast');
  const [selectedLLMProvider, setSelectedLLMProvider] = useState<LLMProvider>('auto');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 审批相关状态
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  // 浏览器授权相关状态
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [pendingConsentRequest, setPendingConsentRequest] = useState<RouteAndRunRequest | null>(null);
  
  // 检查是否处于等待确认/授权状态
  const isAwaitingConfirmation = messages.some(
    (m) => m.status === 'awaiting_confirmation' || m.status === 'awaiting_consent'
  );

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
    const userInput = input.trim();
    setInput('');
    setLoading(true);

    // 添加思考中的消息
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      role: 'assistant',
      content: '让我思考一下…',
      timestamp: new Date(),
      status: 'thinking',
      mode: currentMode,
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      // 获取用户语言环境和时区
      const locale = i18n.language || 'zh-CN';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // 构建对话上下文（最近的消息）
      const recentMessages = messages
        .slice(-10)  // 保留最近10条消息
        .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`);

      const request: RouteAndRunRequest = {
        request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: user.id,
        trip_id: activeTripId || null,
        message: userInput,
        conversation_context: {
          recent_messages: recentMessages.length > 0 ? recentMessages : undefined,
          locale: locale,
          timezone: timezone,
        },
        options: {
          llm_provider: selectedLLMProvider,
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);

      // 处理 NEED_CONSENT 状态（需要浏览器授权）
      if (response.result.status === 'NEED_CONSENT') {
        // 移除思考中的消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: '这个操作需要获取网页内容，是否授权我继续？',
              timestamp: new Date(),
              status: 'awaiting_consent',
              routeType: response.route.route,
              mode: response.route.ui_hint.mode,
            },
          ];
        });
        
        // 保存请求以便授权后重试
        setPendingConsentRequest(request);
        setConsentDialogOpen(true);
        setLoading(false);
        return;
      }

      // 检查是否需要审批（NEED_CONFIRMATION）
      if (needsApproval(response)) {
        const approvalId = extractApprovalId(response);
        if (!approvalId) {
          console.error('审批 ID 不存在，但需要审批');
          return;
        }

        // 移除思考中的消息，添加等待审批的消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
          return [
            ...filtered,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: '我需要你的授权才能继续操作 👇 请查看下方的审批请求。',
              timestamp: new Date(),
              status: 'awaiting_confirmation',
              routeType: response.route.route,
              mode: response.route.ui_hint.mode,
            },
          ];
        });

        // 显示审批对话框
        setPendingApprovalId(approvalId);
        setApprovalDialogOpen(true);
        return;
      }

      // 根据 routeType 处理响应
      const routeType = response.route.route;
      const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';
      const decisionLog = response.explain?.decision_log || [];
      const mode = response.route.ui_hint.mode;

      // 更新当前模式
      setCurrentMode(mode);

      // 如果是 System2 且有回调，通知父组件刷新数据
      if (isSystem2 && onSystem2Response) {
        setTimeout(() => {
          onSystem2Response();
        }, 500);
      }

      // 处理不同的结果状态
      let messageContent = response.result.answer_text || '这个嘛…也许我不是全知的神，但我会努力查查！';
      
      // 如果是 NEED_MORE_INFO，answer_text 已经包含了引导性提示
      if (response.result.status === 'NEED_MORE_INFO') {
        // answer_text 已经包含了引导信息，直接使用
      } else if (response.result.status === 'TIMEOUT') {
        messageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
      } else if (response.result.status === 'FAILED') {
        messageContent = response.result.answer_text || 'FAILED'; // 特殊标记，用于显示优化的错误UI
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
            status: (response.route.ui_hint.status || 'done') as UIStatus,
            routeType,
            routeInfo: {
              confidence: response.route.confidence,
              latency_ms: response.observability.latency_ms,
              tokens_est: response.observability.tokens_est,
              cost_est_usd: response.observability.cost_est_usd,
            },
            decisionLog: decisionLog.length > 0 ? decisionLog : undefined,
            mode,
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
            content: error.message || '出了一点小状况，要不再试一次？',
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

  // 处理快捷命令
  const handleInputChange = (value: string) => {
    if (value.startsWith('/')) {
      if (value === '/深度模式' || value === '/deep') {
        setCurrentMode('slow');
        setInput('');
        return;
      } else if (value === '/快速模式' || value === '/fast') {
        setCurrentMode('fast');
        setInput('');
        return;
      }
    }
    setInput(value);
  };

  // 清除对话历史
  const handleClearHistory = () => {
    if (confirm('确定要清除所有对话记录吗？')) {
      setMessages([]);
      toast.success('对话记录已清除');
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* 模式指示器和切换（仅在弹窗模式显示，页面模式在顶部栏） */}
      <div
        className={cn(
          'flex-shrink-0 border-b px-4 py-2.5 flex items-center justify-center gap-3 text-sm bg-muted/30',
          currentMode === 'fast' ? 'border-blue-200/50' : 'border-orange-200/50'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">当前模式：</span>
          {/* 模式选择 */}
          <Select
            value={currentMode}
            onValueChange={(value) => setCurrentMode(value as 'fast' | 'slow')}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs rounded-full border-0 bg-background shadow-sm" onClick={(e) => e.stopPropagation()}>
              {currentMode === 'slow' ? (
                <Infinity className="w-3 h-3 mr-1.5" />
              ) : (
                <Zap className="w-3 h-3 mr-1.5" />
              )}
              <SelectValue>
                {currentMode === 'fast' ? '⚡ 快速模式' : '🧠 深度思考'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="fast">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  <span>⚡ 快速模式</span>
                </div>
              </SelectItem>
              <SelectItem value="slow">
                <div className="flex items-center gap-2">
                  <Infinity className="w-3 h-3" />
                  <span>🧠 深度思考</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* 模型选择 */}
          <Select
            value={selectedLLMProvider}
            onValueChange={(value) => setSelectedLLMProvider(value as LLMProvider)}
          >
            <SelectTrigger className="w-[110px] h-7 text-xs rounded-full border-0 bg-background shadow-sm" onClick={(e) => e.stopPropagation()}>
              <SelectValue>
                {selectedLLMProvider === 'auto' ? 'Auto' : 
                 selectedLLMProvider === 'openai' ? 'OpenAI' :
                 selectedLLMProvider === 'deepseek' ? 'DeepSeek' :
                 selectedLLMProvider === 'gemini' ? 'Gemini' :
                 selectedLLMProvider === 'anthropic' ? 'Anthropic' : 'Auto'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[110]">
              <SelectItem value="auto">自动选择</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="deepseek">DeepSeek</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {messages.length > 0 && messages[messages.length - 1]?.status && (
          <div className="ml-auto">
            <StatusIndicator status={messages[messages.length - 1].status as UIStatus} />
          </div>
        )}
      </div>

      {/* 消息区域 */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 ? (
            <div className="py-8 px-4">
              <div className="text-center mb-6">
                <Bot className="w-14 h-14 mx-auto mb-4 text-primary/60" />
                <p className="text-base font-semibold mb-2 text-foreground">🎯 我能帮你做这些：</p>
              </div>
              
              {/* 常用操作按钮 */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-8 px-3"
                  onClick={() => setInput('帮我规划冰岛7日行程')}
                >
                  <MapPin className="w-3 h-3 mr-1.5" />
                  规划行程
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-8 px-3"
                  onClick={() => setInput('新宿有哪些拉面店？')}
                >
                  <Utensils className="w-3 h-3 mr-1.5" />
                  地点推荐
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-8 px-3"
                  onClick={() => setInput('查找浅草寺')}
                >
                  <Search className="w-3 h-3 mr-1.5" />
                  景点搜索
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs h-8 px-3"
                  onClick={() => setInput('告诉我目的地、日期和偏好，我来为您规划')}
                >
                  <Calendar className="w-3 h-3 mr-1.5" />
                  创建日程
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-1">如：<span className="text-primary font-medium">"帮我规划冰岛7日行程"</span></p>
                <p className="text-xs">想开始什么任务呢？👇</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              // 为错误消息提供重试功能
              const handleRetry = message.status === 'failed' && index === messages.length - 1
                ? () => {
                    // 重新发送最后一条用户消息
                    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMessage) {
                      // 移除错误消息
                      setMessages((prev) => prev.filter((m) => m.id !== message.id));
                      // 设置输入并触发发送
                      setInput(lastUserMessage.content);
                      // 使用 setTimeout 确保状态更新后再发送
                      setTimeout(() => {
                        handleSend();
                      }, 100);
                    }
                  }
                : undefined;
              
              return (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  mode={currentMode}
                  onRetry={handleRetry}
                />
              );
            })
          )}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <StatusIndicator status="thinking" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 输入区域 */}
      <div className="flex-shrink-0 border-t p-4">
        {isAwaitingConfirmation && (
          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-xs text-yellow-800">
            ⚠️ 需要你确认一下，再继续行动～
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="试试：规划东京3日自由行 ✈️"
            disabled={loading || isAwaitingConfirmation}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={loading || !input.trim() || isAwaitingConfirmation} 
            size="default"
            className="px-4"
            data-send-button
          >
            <Send className="w-4 h-4 mr-2" />
            <span className="text-sm">发送</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                title="设置" 
                disabled={isAwaitingConfirmation}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>设置</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearHistory} disabled={messages.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>清除对话记录</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>帮助</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 浏览器授权对话框 */}
      <AlertDialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>需要您的授权</AlertDialogTitle>
            <AlertDialogDescription>
              这个操作需要获取网页内容，是否授权我继续？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setConsentDialogOpen(false);
              setPendingConsentRequest(null);
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.status === 'awaiting_consent') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: '明白啦，我们保持现状 ✋',
                      status: 'done',
                    },
                  ];
                }
                return prev;
              });
            }}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!pendingConsentRequest) return;
              
              setConsentDialogOpen(false);
              
              // 用户授权后，重新请求并设置 allow_webbrowse = true
              const retryRequest: RouteAndRunRequest = {
                ...pendingConsentRequest,
                options: {
                  ...pendingConsentRequest.options,
                  allow_webbrowse: true,
                },
              };
              
              setPendingConsentRequest(null);
              
              // 更新消息状态
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.status === 'awaiting_consent') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: '已授权，正在重新执行…',
                      status: 'thinking',
                    },
                  ];
                }
                return prev;
              });
              
              setLoading(true);
              
              // 重新发送请求
              try {
                const retryResponse = await agentApi.routeAndRun(retryRequest);
                
                // 处理重试响应（复用相同的处理逻辑）
                const routeType = retryResponse.route.route;
                const isSystem2 = routeType === 'SYSTEM2_REASONING' || routeType === 'SYSTEM2_WEBBROWSE';
                const decisionLog = retryResponse.explain?.decision_log || [];
                const mode = retryResponse.route.ui_hint.mode;
                
                setCurrentMode(mode);
                
                if (isSystem2 && onSystem2Response) {
                  setTimeout(() => {
                    onSystem2Response();
                  }, 500);
                }
                
                let retryMessageContent = retryResponse.result.answer_text || '操作完成';
                
                if (retryResponse.result.status === 'NEED_MORE_INFO') {
                  // answer_text 已经包含了引导信息
                } else if (retryResponse.result.status === 'TIMEOUT') {
                  retryMessageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
                } else if (retryResponse.result.status === 'FAILED') {
                  retryMessageContent = retryResponse.result.answer_text || 'FAILED'; // 特殊标记，用于显示优化的错误UI
                }
                
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.status !== 'awaiting_consent' && m.status !== 'thinking');
                  return [
                    ...filtered,
                    {
                      id: `assistant-${Date.now()}`,
                      role: 'assistant',
                      content: retryMessageContent,
                      timestamp: new Date(),
                      status: (retryResponse.route.ui_hint.status || 'done') as UIStatus,
                      routeType,
                      routeInfo: {
                        confidence: retryResponse.route.confidence,
                        latency_ms: retryResponse.observability.latency_ms,
                        tokens_est: retryResponse.observability.tokens_est,
                        cost_est_usd: retryResponse.observability.cost_est_usd,
                      },
                      decisionLog: decisionLog.length > 0 ? decisionLog : undefined,
                      mode,
                    },
                  ];
                });
              } catch (retryError: any) {
                console.error('Retry request failed:', retryError);
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.status !== 'awaiting_consent' && m.status !== 'thinking');
                  return [
                    ...filtered,
                    {
                      id: `error-${Date.now()}`,
                      role: 'assistant',
                      content: retryError.message || '出了一点小状况，要不再试一次？',
                      timestamp: new Date(),
                      status: 'failed',
                    },
                  ];
                });
              } finally {
                setLoading(false);
              }
            }}>
              授权
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 审批对话框 */}
      {pendingApprovalId && (
        <ApprovalDialog
          approvalId={pendingApprovalId}
          open={approvalDialogOpen}
          onOpenChange={(open) => {
            setApprovalDialogOpen(open);
            if (!open) {
              setPendingApprovalId(null);
            }
          }}
          onDecision={async (approved) => {
            if (approved) {
              toast.success('审批已批准，Nara 正在继续执行...');
              setMessages((prev) => [
                ...prev,
                {
                  id: `approval-approved-${Date.now()}`,
                  role: 'assistant',
                  content: '好的，收到！正在继续执行操作…',
                  timestamp: new Date(),
                  status: 'thinking',
                },
              ]);
            } else {
              toast.info('审批已拒绝，Nara 将调整策略');
              setMessages((prev) => [
                ...prev,
                {
                  id: `approval-rejected-${Date.now()}`,
                  role: 'assistant',
                  content: '明白啦，我们保持现状 ✋ 我会为你寻找替代方案…',
                  timestamp: new Date(),
                  status: 'thinking',
                },
              ]);
            }
            setApprovalDialogOpen(false);
            setPendingApprovalId(null);
          }}
        />
      )}
    </div>
  );
}