/**
 * 自然语言创建行程 - 对话式交互界面
 * 
 * 提供类似聊天的交互体验，让用户通过自然语言描述旅行需求
 * 支持多轮对话、快捷回复、信息确认等功能
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsApi } from '@/api/trips';
import type { 
  ParsedTripParams, 
  ConversationContext,
} from '@/types/trip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Sparkles, 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  Wallet,
  Target,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';

// ==================== 类型定义 ====================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // AI 消息特有
  suggestedQuestions?: string[];
  parsedParams?: ParsedTripParams;
  showConfirmCard?: boolean;
}

interface NLChatInterfaceProps {
  onTripCreated?: (tripId: string) => void;
  className?: string;
}

// ==================== 子组件 ====================

/**
 * 打字机效果 Hook
 * @param text 要显示的完整文本
 * @param enabled 是否启用打字机效果
 * @param speed 打字速度（毫秒/字符）
 */
function useTypewriter(text: string, enabled: boolean, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    // 重置
    setDisplayedText('');
    setIsTyping(true);

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      if (currentIndex < text.length) {
        // 每次添加 1-3 个字符，模拟更自然的打字
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 2) + 1,
          text.length - currentIndex
        );
        setDisplayedText(text.slice(0, currentIndex + charsToAdd));
        currentIndex += charsToAdd;
      } else {
        setIsTyping(false);
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, enabled, speed]);

  return { displayedText, isTyping };
}

/**
 * 打字指示器
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-muted-foreground ml-2">规划师正在思考...</span>
    </div>
  );
}

/**
 * 消息气泡组件
 */
function MessageBubble({ 
  message, 
  onQuickReply,
  onConfirm,
  onEdit,
  isLatest,
  isNewMessage,
}: { 
  message: ChatMessage;
  onQuickReply?: (text: string) => void;
  onConfirm?: () => void;
  onEdit?: () => void;
  isLatest?: boolean;
  isNewMessage?: boolean;  // 是否是刚收到的新消息（用于打字机效果）
}) {
  const isUser = message.role === 'user';
  
  // AI 消息使用打字机效果（仅新消息）
  const enableTypewriter = !isUser && isNewMessage === true;
  const { displayedText, isTyping } = useTypewriter(
    message.content, 
    enableTypewriter,
    25  // 打字速度：25ms/字符
  );
  
  // 显示的文本内容
  const textToShow = enableTypewriter ? displayedText : message.content;
  
  return (
    <div className={cn(
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-slate-200" 
          : "bg-gradient-to-br from-violet-500 to-purple-600"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-slate-600" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* 消息内容 */}
      <div className={cn(
        "flex flex-col max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* 角色标签 */}
        <span className="text-xs text-muted-foreground mb-1">
          {isUser ? '我' : '🧳 旅行规划师'}
        </span>

        {/* 消息气泡 */}
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-slate-100 text-slate-800 rounded-tl-sm"
        )}>
          <p className="whitespace-pre-wrap">
            {textToShow}
            {/* 打字光标 */}
            {isTyping && (
              <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse" />
            )}
          </p>
        </div>

        {/* 快捷回复选项 - 仅 AI 消息且是最新消息且打字完成时显示 */}
        {!isUser && message.suggestedQuestions && message.suggestedQuestions.length > 0 && isLatest && !isTyping && (
          <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in duration-300">
            {message.suggestedQuestions.map((question, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full text-xs h-8 px-3 hover:bg-primary/10 hover:border-primary",
                  "animate-in fade-in slide-in-from-bottom-1 duration-300"
                )}
                style={{ animationDelay: `${idx * 80}ms` }}
                onClick={() => onQuickReply?.(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

        {/* 信息确认卡片 - 打字完成后显示 */}
        {!isUser && message.showConfirmCard && message.parsedParams && isLatest && !isTyping && (
          <TripSummaryCard
            params={message.parsedParams}
            onConfirm={onConfirm}
            onEdit={onEdit}
            className="mt-4"
          />
        )}

        {/* 时间戳 */}
        <span className="text-xs text-muted-foreground mt-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

/**
 * 行程信息确认卡片
 */
function TripSummaryCard({
  params,
  onConfirm,
  onEdit,
  className,
}: {
  params: ParsedTripParams;
  onConfirm?: () => void;
  onEdit?: () => void;
  className?: string;
}) {
  const hasInferredFields = params.inferredFields && params.inferredFields.length > 0;
  
  // 计算天数
  const getDays = () => {
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff;
    }
    return null;
  };
  
  const days = getDays();

  return (
    <Card className={cn(
      "w-full max-w-md border-2 animate-in fade-in zoom-in-95 duration-300",
      hasInferredFields ? "border-amber-200 bg-amber-50/30" : "border-green-200 bg-green-50/30",
      className
    )}>
      <CardContent className="p-4 space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          {hasInferredFields ? (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">请确认以下信息</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">已理解您的需求</span>
            </>
          )}
        </div>

        {/* 信息网格 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* 目的地 */}
          {params.destination && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{params.destination}</span>
            </div>
          )}

          {/* 日期 */}
          {params.startDate && params.endDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {new Date(params.startDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                {' - '}
                {new Date(params.endDate).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                {days && <span className="text-muted-foreground"> ({days}天)</span>}
              </span>
            </div>
          )}

          {/* 同行人 */}
          {(params.hasChildren || params.hasElderly) && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>
                {params.hasChildren && '有儿童'}
                {params.hasChildren && params.hasElderly && '、'}
                {params.hasElderly && '有老人'}
              </span>
            </div>
          )}

          {/* 预算 */}
          {params.totalBudget && (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span>
                {formatCurrency(params.totalBudget, 'CNY')}
                {params.inferredFields?.includes('totalBudget') && (
                  <Badge variant="outline" className="ml-1 text-xs text-amber-600 border-amber-300">
                    推断
                  </Badge>
                )}
              </span>
            </div>
          )}
        </div>

        {/* 旅行风格标签 */}
        {params.preferences?.style && (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {params.preferences.style}
              </Badge>
            </div>
          </div>
        )}

        {/* 推断字段提示 */}
        {hasInferredFields && (
          <p className="text-xs text-amber-600 bg-amber-100 rounded px-2 py-1">
            ⚠️ 标记为"推断"的信息是 AI 根据您的描述推测的，请确认或修改
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit3 className="w-4 h-4 mr-1" />
            修改信息
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            确认创建
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== 主组件 ====================

export default function NLChatInterface({
  onTripCreated,
  className,
}: NLChatInterfaceProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [conversationContext, setConversationContext] = useState<ConversationContext | null>(null);  // 保留用于多轮对话上下文
  const [latestParams, setLatestParams] = useState<ParsedTripParams | null>(null);
  const [newMessageId, setNewMessageId] = useState<string | null>(null);  // 用于打字机效果

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // 初始欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是你的旅行规划助手 ✨\n\n告诉我你的旅行想法，比如想去哪里、什么时候、和谁一起，我来帮你规划完美行程！',
        timestamp: new Date(),
        suggestedQuestions: [
          '想带家人去日本看樱花',
          '计划蜜月旅行',
          '想去冰岛看极光',
          '带孩子去东京迪士尼',
        ],
      };
      setMessages([welcomeMessage]);
      setNewMessageId('welcome');  // 触发打字机效果
    }
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await tripsApi.createFromNL({ text: text.trim() });
      
      // 处理响应
      if (response.needsClarification) {
        // 需要澄清 - 显示规划师回复
        const messageId = `ai-${Date.now()}`;
        const aiMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: response.plannerReply || '让我更了解一下您的需求...',
          timestamp: new Date(),
          suggestedQuestions: response.suggestedQuestions || response.clarificationQuestions,
          parsedParams: response.partialParams,
        };
        setMessages(prev => [...prev, aiMessage]);
        setNewMessageId(messageId);  // 触发打字机效果
        
        if (response.conversationContext) {
          setConversationContext(response.conversationContext);
        }
        if (response.partialParams) {
          setLatestParams(response.partialParams);
        }
      } else if (response.trip) {
        // 行程创建成功
        const messageId = `ai-${Date.now()}`;
        const successMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: response.message || '太棒了！我已经为您创建好行程了 🎉',
          timestamp: new Date(),
          parsedParams: response.parsedParams,
          showConfirmCard: false, // 直接创建成功，不需要确认卡片
        };
        setMessages(prev => [...prev, successMessage]);
        setNewMessageId(messageId);  // 触发打字机效果
        
        // 通知父组件
        if (onTripCreated) {
          onTripCreated(response.trip.id);
        }
        
        // 延迟跳转
        setTimeout(() => {
          navigate(`/dashboard/plan-studio?tripId=${response.trip!.id}`);
        }, 1500);
      } else if (response.parsedParams && !response.parsedParams.needsClarification) {
        // 信息完整，显示确认卡片
        const messageId = `ai-${Date.now()}`;
        const confirmMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: '我已经理解了您的需求！请确认以下信息是否正确：',
          timestamp: new Date(),
          parsedParams: response.parsedParams,
          showConfirmCard: true,
        };
        setMessages(prev => [...prev, confirmMessage]);
        setNewMessageId(messageId);  // 触发打字机效果
        setLatestParams(response.parsedParams);
      }
    } catch (err: any) {
      setError(err.message || '发送失败，请重试');
      console.error('NL Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, navigate, onTripCreated]);

  // 快捷回复
  const handleQuickReply = useCallback((text: string) => {
    sendMessage(text);
  }, [sendMessage]);

  // 确认创建行程
  const handleConfirmCreate = useCallback(async () => {
    if (!latestParams || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      // 构建确认消息，包含所有已解析的参数
      const confirmText = `确认创建行程：
目的地：${latestParams.destination}
日期：${latestParams.startDate} 至 ${latestParams.endDate}
预算：${latestParams.totalBudget}
${latestParams.hasChildren ? '有儿童同行' : ''}
${latestParams.hasElderly ? '有老人同行' : ''}`.trim();

      const response = await tripsApi.createFromNL({ text: confirmText });

      if (response.trip) {
        const messageId = `ai-${Date.now()}`;
        const successMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: '🎉 行程创建成功！正在为您跳转到规划工作台...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
        setNewMessageId(messageId);  // 触发打字机效果

        if (onTripCreated) {
          onTripCreated(response.trip.id);
        }

        setTimeout(() => {
          navigate(`/dashboard/plan-studio?tripId=${response.trip!.id}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || '创建失败，请重试');
    } finally {
      setIsCreating(false);
    }
  }, [latestParams, isCreating, navigate, onTripCreated]);

  // 编辑信息（切换到表单模式）
  const handleEdit = useCallback(() => {
    // 可以触发回调让父组件切换到表单 Tab
    // 或者在这里显示内联编辑界面
    const messageId = `ai-${Date.now()}`;
    const editMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '好的，请告诉我您想修改哪些信息？或者您可以直接输入完整的新需求。',
      timestamp: new Date(),
      suggestedQuestions: [
        '修改日期',
        '修改预算',
        '修改人数',
        '重新描述需求',
      ],
    };
    setMessages(prev => [...prev, editMessage]);
    setNewMessageId(messageId);  // 触发打字机效果
  }, []);

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className={cn("flex flex-col h-[600px] bg-white rounded-xl border", className)}>
      {/* 头部 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">智能行程规划</h3>
          <p className="text-xs text-muted-foreground">用自然语言描述，AI 帮你规划</p>
        </div>
      </div>

      {/* 消息区域 */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onQuickReply={handleQuickReply}
              onConfirm={handleConfirmCreate}
              onEdit={handleEdit}
              isLatest={idx === messages.length - 1}
              isNewMessage={msg.id === newMessageId}
            />
          ))}
          
          {/* 加载状态 */}
          {isLoading && <TypingIndicator />}
          
          {/* 创建中状态 */}
          {isCreating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在创建行程...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 输入区域 */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-slate-50/50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="描述您的旅行想法..."
            disabled={isLoading || isCreating}
            className="flex-1 bg-white"
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading || isCreating}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
