/**
 * 行程助手聊天组件
 * 
 * 使用新的行程助手 API，提供旅途中的实时帮助
 * 适用页面: /dashboard/execute, /dashboard/trails/on-trail/:id
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJourneyAssistant, type JourneyMessage } from '@/hooks/useJourneyAssistant';
import type { 
  JourneyState,
  ScheduleItem,
  Reminder,
  SearchResults,
  SuggestedAction,
  JourneyPhase,
  NarrativeSection,
  ExpertCitation,
  DegradationInfo,
} from '@/api/assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  User, 
  MapPin, 
  Calendar, 
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Navigation,
  Utensils,
  Coffee,
  ShoppingBag,
  Hospital,
  Shield,
  Bell,
  Plane,
  Home,
  Activity,
  Car,
  AlertCircle,
  Star,
  Compass,
  MessageCircle,
  Sparkles,
  Info,
  FileText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface JourneyAssistantChatProps {
  tripId: string;
  userId: string;
  onScheduleChange?: () => void;
  className?: string;
  compact?: boolean; // 紧凑模式，用于侧边栏
}

/**
 * 阶段配置
 */
const PHASE_CONFIG: Record<JourneyPhase, { label: string; color: string; icon: React.ElementType }> = {
  PRE_TRIP: { label: '出发准备', color: 'bg-blue-500', icon: Calendar },
  DEPARTURE_DAY: { label: '出发日', color: 'bg-amber-500', icon: Plane },
  ON_TRIP: { label: '旅途中', color: 'bg-green-500', icon: Compass },
  RETURN_DAY: { label: '返程日', color: 'bg-purple-500', icon: Home },
  POST_TRIP: { label: '旅行结束', color: 'bg-gray-500', icon: CheckCircle2 },
};

/**
 * 提醒优先级样式
 */
const PRIORITY_STYLES = {
  urgent: 'bg-red-100 border-red-300 text-red-800',
  high: 'bg-orange-100 border-orange-300 text-orange-800',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  low: 'bg-blue-100 border-blue-300 text-blue-800',
};

/**
 * 提醒类型图标
 */
const REMINDER_ICONS: Record<string, React.ElementType> = {
  FLIGHT: Plane,
  HOTEL: Home,
  ACTIVITY: Activity,
  TRANSPORT: Car,
  WEATHER: AlertTriangle,
  SAFETY: Shield,
  DOCUMENT: Calendar,
  PACKING: ShoppingBag,
  BUDGET: Star,
};

/**
 * 状态概览卡片
 */
function StatusOverview({ state }: { state: JourneyState }) {
  const phaseConfig = PHASE_CONFIG[state.phase];
  const PhaseIcon = phaseConfig.icon;

  return (
    <Card className="border-none shadow-none bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", phaseConfig.color)}>
              <PhaseIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium">{phaseConfig.label}</div>
              <div className="text-xs text-muted-foreground">
                第 {state.currentDay} 天 / 共 {state.totalDays} 天
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(state.currentDate), 'M月d日', { locale: zhCN })}
          </Badge>
        </div>

        {/* 进度条 */}
        <Progress 
          value={(state.stats.completedActivities / state.stats.totalActivities) * 100} 
          className="h-1.5 mb-2"
        />
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            已完成 {state.stats.completedActivities}/{state.stats.totalActivities}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Star className="w-3 h-3 text-amber-500" />
            预算 ¥{state.stats.spentBudget.toLocaleString()}/¥{state.stats.totalBudget.toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 今日日程组件
 */
function TodaySchedule({ items }: { items: ScheduleItem[] }) {
  const statusColors = {
    upcoming: 'border-l-gray-300',
    in_progress: 'border-l-green-500 bg-green-50',
    completed: 'border-l-gray-300 opacity-60',
    cancelled: 'border-l-red-300 line-through opacity-50',
    modified: 'border-l-amber-500 bg-amber-50',
  };

  const typeIcons = {
    flight: Plane,
    hotel: Home,
    activity: Activity,
    transport: Car,
    meal: Utensils,
    rest: Coffee,
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        今天暂无安排
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = typeIcons[item.type] || Activity;
        return (
          <div
            key={item.id}
            className={cn(
              "p-3 rounded-lg border-l-4 bg-card",
              statusColors[item.status]
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">{item.titleCN || item.title}</span>
              </div>
              {item.status === 'in_progress' && (
                <Badge className="bg-green-500 text-xs">进行中</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(item.startTime), 'HH:mm')}
                {item.endTime && ` - ${format(new Date(item.endTime), 'HH:mm')}`}
              </span>
              {item.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.location.nameCN || item.location.name}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 提醒列表组件
 */
function RemindersList({ 
  reminders, 
  onAction 
}: { 
  reminders: Reminder[];
  onAction: (action: SuggestedAction) => void;
}) {
  if (reminders.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
        暂无提醒
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder) => {
        const Icon = REMINDER_ICONS[reminder.type] || Bell;
        return (
          <div
            key={reminder.id}
            className={cn(
              "p-3 rounded-lg border",
              PRIORITY_STYLES[reminder.priority]
            )}
          >
            <div className="flex items-start gap-2">
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{reminder.titleCN || reminder.title}</div>
                <div className="text-xs mt-0.5 opacity-90">
                  {reminder.messageCN || reminder.message}
                </div>
                {reminder.scheduledAt && (
                  <div className="text-xs mt-1 opacity-70">
                    {format(new Date(reminder.scheduledAt), 'M月d日 HH:mm', { locale: zhCN })}
                  </div>
                )}
                {reminder.actions && reminder.actions.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {reminder.actions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="secondary"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => onAction(action)}
                      >
                        {action.labelCN || action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * V2.1: 专家引用组件
 * 展示三人格（Abu/Dr.Dre/Neptune）的专家意见
 */
function ExpertCitationsPanel({ citations }: { citations: ExpertCitation[] }) {
  const personaConfig: Record<string, { emoji: string; color: string; bgColor: string }> = {
    'Abu': { emoji: '🐻‍❄️', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    'Dr.Dre': { emoji: '🐕', color: 'text-amber-700', bgColor: 'bg-amber-50' },
    'Neptune': { emoji: '🦦', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  };

  return (
    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Sparkles className="w-3 h-3" />
        <span>专家意见</span>
      </div>
      {citations.map((citation, idx) => {
        const config = personaConfig[citation.personaName] || { emoji: '🤖', color: 'text-gray-700', bgColor: 'bg-gray-50' };
        return (
          <div 
            key={idx} 
            className={cn(
              "rounded-lg p-2.5 text-sm",
              config.bgColor
            )}
          >
            <div className={cn("font-medium mb-0.5 flex items-center gap-1.5 text-xs", config.color)}>
              <span>{config.emoji}</span>
              <span>{citation.personaName} 说：</span>
            </div>
            <p className={cn("text-xs", config.color.replace('700', '600'))}>
              {citation.quoteCN || citation.quote}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * V2.1: 分段内容组件
 * 展示结构化的消息分段
 */
function NarrativeSectionsPanel({ sections }: { sections: NarrativeSection[] }) {
  const sectionConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    summary: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    details: { icon: Info, color: 'text-gray-600', bgColor: 'bg-gray-50' },
    warnings: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50' },
    actions: { icon: Zap, color: 'text-green-600', bgColor: 'bg-green-50' },
  };

  return (
    <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {sections.map((section, idx) => {
        const config = sectionConfig[section.type] || sectionConfig.details;
        const Icon = config.icon;
        return (
          <div 
            key={idx} 
            className={cn("rounded-lg p-2.5", config.bgColor)}
          >
            <div className={cn("font-medium text-xs mb-1 flex items-center gap-1.5", config.color)}>
              <Icon className="w-3.5 h-3.5" />
              <span>{section.titleCN || section.title}</span>
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap">
              {section.contentCN || section.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * V2.1: 降级提示组件
 */
function DegradationBanner({ degradation }: { degradation: DegradationInfo }) {
  if (!degradation.degraded) return null;

  const severityConfig = {
    info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    error: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  };

  const config = severityConfig[degradation.severity || 'info'];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-lg p-2.5 border flex items-start gap-2 animate-in fade-in duration-300 mt-3",
      config.bgColor,
      config.borderColor
    )}>
      <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", config.color)} />
      <p className={cn("text-xs", config.color)}>
        {degradation.reasonCN || degradation.reason || '部分功能受限'}
      </p>
    </div>
  );
}

/**
 * 搜索结果组件
 */
function SearchResultsPanel({ 
  results, 
  onNavigate 
}: { 
  results: SearchResults;
  onNavigate: (item: SearchResults['items'][0]) => void;
}) {
  return (
    <div className="space-y-2 mt-3">
      {results.items.map((item, idx) => (
        <Card 
          key={idx} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate(item)}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{item.nameCN || item.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  {item.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.distance}
                    </span>
                  )}
                  {item.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {item.rating}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8">
                <Navigation className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 快捷操作按钮
 */
function QuickActions({ 
  onAction 
}: { 
  onAction: (prompt: string) => void;
}) {
  const actions = [
    { icon: Utensils, label: '附近美食', prompt: '附近有什么好吃的' },
    { icon: Coffee, label: '找咖啡', prompt: '附近有咖啡厅吗' },
    { icon: ShoppingBag, label: '购物', prompt: '附近有什么购物的地方' },
    { icon: Hospital, label: '找药店', prompt: '最近的药店在哪里' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon: Icon, label, prompt }) => (
        <Button
          key={label}
          variant="outline"
          size="sm"
          className="h-auto py-2 flex-col gap-1"
          onClick={() => onAction(prompt)}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}

/**
 * 消息气泡组件
 */
function MessageBubble({ 
  message,
  onNavigate,
  onAction,
}: { 
  message: JourneyMessage;
  onNavigate: (item: SearchResults['items'][0]) => void;
  onAction: (action: SuggestedAction) => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Compass className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[85%]",
        isUser ? "text-right" : "text-left"
      )}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-2.5 text-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted rounded-tl-sm"
        )}>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* 搜索结果 */}
        {!isUser && message.searchResults && (
          <SearchResultsPanel 
            results={message.searchResults}
            onNavigate={onNavigate}
          />
        )}

        {/* V2.1: 分段内容 */}
        {!isUser && message.sections && message.sections.length > 0 && (
          <NarrativeSectionsPanel sections={message.sections} />
        )}

        {/* V2.1: 专家引用 */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <ExpertCitationsPanel citations={message.citations} />
        )}

        {/* V2.1: 降级提示 */}
        {!isUser && message.degradation && message.degradation.degraded && (
          <DegradationBanner degradation={message.degradation} />
        )}

        {/* 建议操作 */}
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.suggestedActions.map((action, idx) => (
              <Button
                key={idx}
                variant={action.primary ? "default" : "outline"}
                size="sm"
                onClick={() => onAction(action)}
                className="h-7 text-xs"
              >
                {action.labelCN || action.label}
              </Button>
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <div className={cn(
          "text-xs text-muted-foreground mt-1",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

/**
 * 行程助手聊天组件
 */
export default function JourneyAssistantChat({
  tripId,
  userId,
  onScheduleChange,
  className,
  compact = false,
}: JourneyAssistantChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'schedule' | 'reminders'>('chat');

  const {
    messages,
    journeyState,
    reminders,
    loading,
    error,
    sendMessage,
    emergency,
    executeAction,
    nearbySearch,
  } = useJourneyAssistant({ tripId, userId });

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || loading) return;
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
    inputRef.current?.focus();
  }, [inputValue, loading, sendMessage]);

  // 处理键盘事件
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 处理导航
  const handleNavigate = useCallback((item: SearchResults['items'][0]) => {
    if (item.location) {
      // 打开地图导航
      const url = `https://www.google.com/maps/dir/?api=1&destination=${item.location.lat},${item.location.lng}`;
      window.open(url, '_blank');
    }
  }, []);

  // 处理快捷操作
  const handleQuickAction = useCallback(async (prompt: string) => {
    await nearbySearch(prompt);
  }, [nearbySearch]);

  // 处理紧急求助
  const handleEmergency = useCallback(async () => {
    await emergency();
  }, [emergency]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* 状态概览（仅在有状态时显示） */}
      {journeyState && !compact && (
        <div className="p-3 border-b">
          <StatusOverview state={journeyState} />
        </div>
      )}

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-3 mt-2">
          <TabsTrigger value="chat" className="text-xs">
            <MessageCircle className="w-3 h-3 mr-1" />
            对话
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            今日
          </TabsTrigger>
          <TabsTrigger value="reminders" className="text-xs">
            <Bell className="w-3 h-3 mr-1" />
            提醒
            {reminders.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                {reminders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 对话内容 */}
        <TabsContent value="chat" className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden">
          {/* 消息区域 */}
          <ScrollArea ref={scrollRef} className="flex-1 p-3">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Compass className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    我是你的旅途助手 🧭<br />
                    有任何问题随时问我
                  </p>
                  <QuickActions onAction={handleQuickAction} />
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      onNavigate={handleNavigate}
                      onAction={executeAction}
                    />
                  ))}
                </>
              )}

              {/* 加载指示器 */}
              {loading && (
                <div className="flex gap-3 animate-in fade-in duration-200">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">查找中...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 快捷操作（有消息时） */}
          {messages.length > 0 && (
            <div className="px-3 py-2 border-t">
              <QuickActions onAction={handleQuickAction} />
            </div>
          )}
        </TabsContent>

        {/* 今日日程 */}
        <TabsContent value="schedule" className="flex-1 mt-0 p-3 overflow-auto data-[state=inactive]:hidden">
          <TodaySchedule items={journeyState?.todaySchedule || []} />
        </TabsContent>

        {/* 提醒列表 */}
        <TabsContent value="reminders" className="flex-1 mt-0 p-3 overflow-auto data-[state=inactive]:hidden">
          <RemindersList reminders={reminders} onAction={executeAction} />
        </TabsContent>
      </Tabs>

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* 紧急求助按钮 */}
      <div className="px-3 py-2 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleEmergency}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          紧急求助
        </Button>
      </div>

      {/* 输入区域 */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="问我任何问题..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!inputValue.trim() || loading}
            size="icon"
          >
            {loading ? (
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
