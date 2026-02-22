import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '@/api/agent';
import { tripsApi } from '@/api/trips';
import type { RouteAndRunRequest, RouteAndRunResponse, RouteType, UIStatus, LLMProvider, EntryPoint, DecisionLogEntry, OrchestrationUiState, OrchestrationResult } from '@/api/agent';
import type { TripInsightResponse, TripInsightFinding } from '@/api/trips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Send, Bot, User, ChevronRight, CheckCircle2, XCircle, Loader2, Zap, Infinity, MapPin, Utensils, Search, Calendar, RotateCw, Brain, Compass, Target, Lightbulb, ClipboardCheck, Clock, Route, AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import ApprovalDialog from '@/components/trips/ApprovalDialog';
import { OrchestrationProgressCard } from '@/components/planning-assistant-v2/OrchestrationProgressCard';
import { toast } from 'sonner';
import { needsApproval, extractApprovalId } from '@/utils/approval';
import { normalizeToNewFormat } from '@/utils/decision-log-migrator';
import { getErrorHandlingStrategy } from '@/utils/agent-error-types';

interface AgentChatProps {
  activeTripId?: string | null;
  onSystem2Response?: () => void;
  className?: string;
  entryPoint?: EntryPoint;  // 入口来源标识
  readonlyMode?: boolean;    // 只读模式
}

/**
 * 开场白配置接口
 */
interface WelcomeConfig {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  greeting: string | React.ReactNode;
  quickIntents: Array<{
    icon: LucideIcon;
    label: string;
    prompt: string;
  }>;
  example?: string;
}

/**
 * 获取 finding 图标
 */
const getFindingIcon = (iconName: string): LucideIcon => {
  switch (iconName) {
    case 'clock': return Clock;
    case 'route': return Route;
    case 'check': return CheckCircle2;
    case 'alert': return AlertTriangle;
    default: return Lightbulb;
  }
};

/**
 * 获取 finding 样式
 */
const getFindingStyles = (type: TripInsightFinding['type']) => {
  switch (type) {
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        text: 'text-amber-900',
      };
    case 'suggestion':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        text: 'text-blue-900',
      };
    case 'positive':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        text: 'text-green-900',
      };
  }
};

/**
 * 根据入口点获取开场白配置
 */
const getWelcomeConfig = (entryPoint?: EntryPoint, tripInsight?: TripInsightResponse | null): WelcomeConfig => {
  switch (entryPoint) {
    case 'planning_workbench':
      // 如果有行程洞察信息，展示上下文感知的开场白
      if (tripInsight && tripInsight.tripSummary.days > 0) {
        const { tripSummary, findings } = tripInsight;
        
        // 根据 findings 生成动态快捷按钮
        const dynamicIntents: WelcomeConfig['quickIntents'] = [];
        
        // 优先添加有 actionPrompt 的 findings
        findings.forEach((finding) => {
          if (finding.actionLabel && finding.actionPrompt && dynamicIntents.length < 3) {
            dynamicIntents.push({
              icon: getFindingIcon(finding.icon),
              label: finding.actionLabel,
              prompt: finding.actionPrompt,
            });
          }
        });
        
        // 补充默认按钮
        if (dynamicIntents.length < 4) {
          dynamicIntents.push({ icon: Search, label: '全面分析', prompt: '帮我全面分析当前行程，看看还有什么问题或可以优化的地方' });
        }
        if (dynamicIntents.length < 4) {
          dynamicIntents.push({ icon: Target, label: '推荐景点', prompt: '根据我的行程，推荐一些适合加入的景点' });
        }
        
        return {
          icon: Compass,
          title: '规划助手 Nara 🧭',
          subtitle: '专注让行程变得「可执行」',
          greeting: (
            <div className="space-y-3">
              {/* 行程摘要卡片 */}
              <div className="bg-primary/5 rounded-lg p-3 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{tripSummary.destination}</span>
                  <span className="text-xs text-muted-foreground">· {tripSummary.days} 天</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  已安排 {tripSummary.placesCount} 个地点
                </div>
              </div>
              
              {/* AI 发现 */}
              {findings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">💡 我注意到：</p>
                  <div className="space-y-1.5">
                    {findings.slice(0, 3).map((finding, idx) => {
                      const styles = getFindingStyles(finding.type);
                      const FindingIcon = getFindingIcon(finding.icon);
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            'rounded-md px-2.5 py-2 text-left border',
                            styles.bg,
                            styles.border
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <FindingIcon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', styles.icon)} />
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-xs font-medium', styles.text)}>{finding.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{finding.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 如果没有发现，显示正面信息 */}
              {findings.length === 0 && (
                <div className="text-sm text-green-700 bg-green-50 rounded-md p-2.5 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>行程看起来安排得不错！有什么需要我帮忙的吗？</span>
                  </div>
                </div>
              )}
            </div>
          ),
          quickIntents: dynamicIntents,
          example: undefined,
        };
      }
      
      // 没有行程信息时的默认开场白
      return {
        icon: Compass,
        title: '规划助手 Nara 🧭',
        subtitle: '专注让行程变得「可执行」',
        greeting: (
          <>
            我可以帮你：
            <ul className="mt-2 space-y-1 text-left list-disc list-inside">
              <li>优化景点顺序，减少绕路</li>
              <li>检查行程风险和准备度</li>
              <li>推荐符合你风格的新地点</li>
            </ul>
          </>
        ),
        quickIntents: [
          { icon: MapPin, label: '优化路线', prompt: '帮我优化当前行程的路线顺序，减少绕路' },
          { icon: ClipboardCheck, label: '检查准备度', prompt: '检查当前行程的准备度，有哪些风险或待办事项？' },
          { icon: Target, label: '推荐景点', prompt: '根据我的偏好，推荐一些适合加入行程的景点' },
          { icon: Lightbulb, label: '分析可行性', prompt: '分析当前行程的整体可行性，有什么需要改进的吗？' },
        ],
        example: '帮我把第二天的行程优化一下，感觉有点赶',
      };

    case 'trip_detail_page':
      return {
        icon: Bot,
        title: '嗨，我是 Nara 👋',
        subtitle: '这趟旅行的专属助手',
        greeting: '我可以帮你完善这个行程，有什么想调整的吗？',
        quickIntents: [
          { icon: MapPin, label: '调整行程安排', prompt: '帮我调整一下行程安排' },
          { icon: Search, label: '推荐附近景点', prompt: '推荐一些这个目的地附近值得去的景点' },
          { icon: Calendar, label: '优化时间分配', prompt: '帮我优化一下每天的时间分配' },
          { icon: Utensils, label: '美食推荐', prompt: '推荐一些当地特色美食和餐厅' },
        ],
        example: '帮我在第三天加一个下午茶的安排',
      };

    case 'trip_list_page':
      return {
        icon: Bot,
        title: '嗨，我是 Nara 👋',
        subtitle: '你的智能旅行助手',
        greeting: '想规划新旅行，还是找找灵感？',
        quickIntents: [
          { icon: MapPin, label: '规划新旅行', prompt: '帮我规划一次新的旅行' },
          { icon: Search, label: '找旅行灵感', prompt: '给我一些旅行目的地的灵感和建议' },
          { icon: Calendar, label: '查看我的行程', prompt: '帮我整理一下现有的行程' },
          { icon: Target, label: '热门推荐', prompt: '推荐一些当季热门的旅行目的地' },
        ],
        example: '我想去冰岛玩一周，你来帮我安排吧 ✈️',
      };

    // 默认开场白
    default:
      return {
        icon: Bot,
        title: '嗨，我是 Nara 👋',
        subtitle: '你的智能旅行副驾驶',
        greeting: (
          <>
            你可以直接告诉我你的旅行想法，<br />
            剩下的交给我来一起想。
          </>
        ),
        quickIntents: [
          { icon: MapPin, label: '帮我规划一次旅行', prompt: '帮我规划一次旅行' },
          { icon: Utensils, label: '推荐一些好吃的地方', prompt: '推荐一些好吃的地方' },
          { icon: Search, label: '找几个值得去的景点', prompt: '找几个值得去的景点' },
          { icon: Calendar, label: '帮我安排一个行程', prompt: '帮我安排一个行程' },
        ],
        example: '我想去冰岛玩一周，你来帮我安排吧 ✈️',
      };
  }
};

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
  decisionLog?: DecisionLogEntry[];  // 使用新的决策日志格式
  mode?: 'fast' | 'slow';
  /** 编排 UI 状态（phase、progress、message 等） */
  ui_state?: OrchestrationUiState;
  /** 编排结果（state、gate_result、decision_log、decisionState） */
  orchestrationResult?: OrchestrationResult;
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
      case 'awaiting_user_input':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-yellow-500"></div>,
          text: '需要更多信息，请查看下方提示',
          color: 'text-yellow-600',
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
                {log.step} - {log.actor}：{log.outputs_summary}
              </div>
              {log.inputs_summary && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  输入：{log.inputs_summary}
                </div>
              )}
              {log.evidence_refs && log.evidence_refs.length > 0 && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  证据引用：{log.evidence_refs.join(', ')}
                </div>
              )}
              {log.metadata?.guardian && (
                <div className="text-muted-foreground text-[11px] mt-0.5">
                  三人格：{log.metadata.guardian}
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
  // 确保 content 是字符串
  const messageContent = typeof message.content === 'string' ? message.content : String(message.content || '');
  const isTimeout = messageContent.includes('超时') || messageContent.includes('TIMEOUT');

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
            {messageContent}
          </p>
        )}
        
        {!isUser && !isError && (
          <>
            <OrchestrationProgressCard
              ui_state={message.ui_state}
              orchestrationResult={message.orchestrationResult}
            />
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

export default function AgentChat({ activeTripId, onSystem2Response, className, entryPoint, readonlyMode }: AgentChatProps) {
  const navigate = useNavigate();
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
  
  // 行程洞察状态（用于上下文感知开场白）
  const [tripInsight, setTripInsight] = useState<TripInsightResponse | null>(null);
  const [tripInsightLoading, setTripInsightLoading] = useState(false);
  
  // 检查是否处于等待确认/授权状态
  const isAwaitingConfirmation = messages.some(
    (m) => m.status === 'awaiting_confirmation' || m.status === 'awaiting_consent'
  );

  // 加载行程洞察（规划工作台场景）
  useEffect(() => {
    const loadTripInsight = async () => {
      if (entryPoint === 'planning_workbench' && activeTripId) {
        setTripInsightLoading(true);
        try {
          const insight = await tripsApi.getInsight(activeTripId);
          setTripInsight(insight);
        } catch (err) {
          console.error('Failed to load trip insight:', err);
          setTripInsight(null);
        } finally {
          setTripInsightLoading(false);
        }
      } else {
        setTripInsight(null);
      }
    };
    loadTripInsight();
  }, [activeTripId, entryPoint]);

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
          entry_point: entryPoint,
          readonly_mode: readonlyMode,
        },
      };

      const response: RouteAndRunResponse = await agentApi.routeAndRun(request);

      // 处理重定向（REDIRECT_REQUIRED）
      if (response.result.status === 'REDIRECT_REQUIRED') {
        const redirectInfo = response.result.payload?.redirectInfo;
        if (redirectInfo) {
          // 显示重定向提示
          toast.info(redirectInfo.redirect_reason, {
            duration: 3000,
          });

          // 移除思考中的消息
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
            return [
              ...filtered,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: `需要跳转到其他页面继续操作：${redirectInfo.redirect_reason}`,
                timestamp: new Date(),
                status: 'done',
              },
            ];
          });

          // 延迟执行重定向，让用户看到提示
          setTimeout(() => {
            if (redirectInfo.redirect_to.startsWith('http')) {
              window.location.href = redirectInfo.redirect_to;
            } else {
              navigate(redirectInfo.redirect_to);
            }
          }, 1000);

          setLoading(false);
          return;
        }
      }

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
      
      // 规范化决策日志格式（支持新旧格式）
      // 优先使用 orchestrationResult.decision_log，其次 explain.decision_log
      const rawDecisionLog = response.result.payload?.orchestrationResult?.decision_log
        ?? response.explain?.decision_log
        ?? [];
      const decisionLog: DecisionLogEntry[] = rawDecisionLog.map((entry: any) =>
        normalizeToNewFormat(entry, response.request_id)
      );
      
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
      // 确保 answer_text 是字符串类型
      const answerText = response.result.answer_text != null 
        ? String(response.result.answer_text) 
        : '这个嘛…也许我不是全知的神，但我会努力查查！';
      let messageContent = answerText;
      
      // 确定 UI 状态
      let uiStatus: UIStatus = (response.route.ui_hint.status || 'done') as UIStatus;
      
      // 如果是 NEED_MORE_INFO，需要特殊处理
      if (response.result.status === 'NEED_MORE_INFO') {
        // answer_text 已经包含了引导信息，直接使用
        // 如果 ui_hint.status 是 AWAITING_CONFIRMATION 或类似，使用 awaiting_user_input
        if (response.route.ui_hint.status === 'awaiting_confirmation' || 
            response.route.ui_hint.status === 'awaiting_user_input') {
          uiStatus = 'awaiting_user_input';
        } else {
          // 默认使用 awaiting_user_input 状态
          uiStatus = 'awaiting_user_input';
        }
        
        // 优先使用新的 clarificationMessage 字段（统一在 payload 中）
        const clarificationMessage = response.result.payload?.clarificationMessage;
        const clarificationInfo = response.result.payload?.clarificationInfo; // 向后兼容
        
        if (clarificationMessage) {
          // 使用新的澄清消息（Markdown 格式）
          messageContent = clarificationMessage;
        } else if (clarificationInfo) {
          // 向后兼容：使用旧的 clarificationInfo 字段
          let clarificationText = answerText;
          
          if (clarificationInfo.missingServices && clarificationInfo.missingServices.length > 0) {
            clarificationText += `\n\n**缺失的服务：**\n${clarificationInfo.missingServices.map(s => `- ${s}`).join('\n')}`;
          }
          
          if (clarificationInfo.impact) {
            clarificationText += `\n\n**影响：**\n${clarificationInfo.impact}`;
          }
          
          if (clarificationInfo.solutions && clarificationInfo.solutions.length > 0) {
            clarificationText += `\n\n**解决方案：**\n${clarificationInfo.solutions.map(s => `- ${s}`).join('\n')}`;
          }
          
          messageContent = clarificationText;
        }
        
        // 如果有错误类型，可以记录用于监控
        const errorType = response.result.payload?.errorType;
        if (errorType) {
          const strategy = getErrorHandlingStrategy(errorType);
          console.log('[Agent Chat] 错误处理策略:', {
            errorType,
            strategy,
          });
        }
      } else if (response.result.status === 'TIMEOUT') {
        messageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
        uiStatus = 'failed';
      } else if (response.result.status === 'FAILED') {
        messageContent = answerText || 'FAILED'; // 特殊标记，用于显示优化的错误UI
        uiStatus = 'failed';
      } else if (response.result.status === 'OK') {
        // 成功状态，使用 ui_hint 中的状态，如果没有则使用 'done'
        uiStatus = (response.route.ui_hint.status || 'done') as UIStatus;
      }

      // 优先使用 ui_state 中的 ui_status（编排进度），其次 route.ui_hint
      const finalUiStatus = response.ui_state?.ui_status ?? uiStatus;

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
            status: finalUiStatus,
            routeType,
            routeInfo: {
              confidence: response.route.confidence,
              latency_ms: response.observability.latency_ms,
              tokens_est: response.observability.tokens_est,
              cost_est_usd: response.observability.cost_est_usd,
            },
            decisionLog: decisionLog.length > 0 ? decisionLog : undefined,
            mode,
            ui_state: response.ui_state,
            orchestrationResult: response.result.payload?.orchestrationResult,
          },
        ];
      });
    } catch (error: any) {
      console.error('Agent chat error:', error);
      // 移除思考中的消息，添加错误消息
      // 确保错误消息是字符串类型
      const errorMessage = error?.message != null 
        ? String(error.message) 
        : '出了一点小状况，要不再试一次？';
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMessage.id);
        return [
          ...filtered,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
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
            (() => {
              // 规划工作台场景：加载中显示骨架屏
              if (entryPoint === 'planning_workbench' && tripInsightLoading) {
                return (
                  <div className="py-8 px-4">
                    <div className="text-center mb-6">
                      <Compass className="w-14 h-14 mx-auto mb-4 text-primary/60" />
                      <p className="text-lg font-semibold mb-3 text-foreground">规划助手 Nara 🧭</p>
                      <p className="text-xs text-muted-foreground mb-4">正在分析你的行程...</p>
                      <div className="flex justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    </div>
                  </div>
                );
              }
              
              const welcomeConfig = getWelcomeConfig(entryPoint, tripInsight);
              const WelcomeIcon = welcomeConfig.icon;
              return (
                <div className="py-6 px-4">
                  <div className="text-center mb-5">
                    <WelcomeIcon className="w-12 h-12 mx-auto mb-3 text-primary/60" />
                    <p className="text-base font-semibold mb-1 text-foreground">{welcomeConfig.title}</p>
                    <p className="text-xs text-muted-foreground mb-3">{welcomeConfig.subtitle}</p>
                    <div className="text-sm text-muted-foreground">
                      {welcomeConfig.greeting}
                    </div>
                  </div>
                  
                  {/* 意图按钮 */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground text-center mb-3">
                      {entryPoint === 'planning_workbench' && tripInsight 
                        ? '想让我帮你处理哪个问题？' 
                        : entryPoint === 'planning_workbench' 
                          ? '告诉我你现在想做什么：' 
                          : '你可以试试这样说：'}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {welcomeConfig.quickIntents.map((intent, index) => {
                        const IntentIcon = intent.icon;
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs h-8 px-3"
                            onClick={() => setInput(intent.prompt)}
                          >
                            <IntentIcon className="w-3 h-3 mr-1.5" />
                            {intent.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {welcomeConfig.example && (
                    <div className="text-center text-sm text-muted-foreground">
                      <p className="mb-1">
                        比如：<span className="text-primary font-medium">{welcomeConfig.example}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
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
            placeholder="你想去哪儿？我来帮你一起规划 🙂"
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
            <span className="text-sm">开始</span>
          </Button>
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
                // 规范化决策日志格式（支持新旧格式）
                const rawRetryDecisionLog = retryResponse.explain?.decision_log || [];
                const retryDecisionLog: DecisionLogEntry[] = rawRetryDecisionLog.map((entry: any) => 
                  normalizeToNewFormat(entry, retryResponse.request_id)
                );
                const mode = retryResponse.route.ui_hint.mode;
                
                setCurrentMode(mode);
                
                if (isSystem2 && onSystem2Response) {
                  setTimeout(() => {
                    onSystem2Response();
                  }, 500);
                }
                
                // 确保 answer_text 是字符串类型
                const retryAnswerText = retryResponse.result.answer_text != null 
                  ? String(retryResponse.result.answer_text) 
                  : '操作完成';
                let retryMessageContent = retryAnswerText;
                let retryUiStatus: UIStatus = (retryResponse.route.ui_hint.status || 'done') as UIStatus;
                
                if (retryResponse.result.status === 'NEED_MORE_INFO') {
                  // answer_text 已经包含了引导信息
                  // 如果 ui_hint.status 是 AWAITING_CONFIRMATION 或类似，使用 awaiting_user_input
                  if (retryResponse.route.ui_hint.status === 'awaiting_confirmation' || 
                      retryResponse.route.ui_hint.status === 'awaiting_user_input') {
                    retryUiStatus = 'awaiting_user_input';
                  } else {
                    retryUiStatus = 'awaiting_user_input';
                  }
                  
                  // 如果有澄清信息，结构化展示
                  const clarificationInfo = retryResponse.result.payload?.clarificationInfo;
                  if (clarificationInfo) {
                    let clarificationMessage = retryAnswerText;
                    
                    if (clarificationInfo.missingServices && clarificationInfo.missingServices.length > 0) {
                      clarificationMessage += `\n\n**缺失的服务：**\n${clarificationInfo.missingServices.map((s: string) => `- ${s}`).join('\n')}`;
                    }
                    
                    if (clarificationInfo.impact) {
                      clarificationMessage += `\n\n**影响：**\n${clarificationInfo.impact}`;
                    }
                    
                    if (clarificationInfo.solutions && clarificationInfo.solutions.length > 0) {
                      clarificationMessage += `\n\n**解决方案：**\n${clarificationInfo.solutions.map((s: string) => `- ${s}`).join('\n')}`;
                    }
                    
                    retryMessageContent = clarificationMessage;
                  }
                } else if (retryResponse.result.status === 'TIMEOUT') {
                  retryMessageContent = 'TIMEOUT'; // 特殊标记，用于显示优化的错误UI
                  retryUiStatus = 'failed';
                } else if (retryResponse.result.status === 'FAILED') {
                  retryMessageContent = retryAnswerText || 'FAILED'; // 特殊标记，用于显示优化的错误UI
                  retryUiStatus = 'failed';
                } else if (retryResponse.result.status === 'OK') {
                  retryUiStatus = (retryResponse.route.ui_hint.status || 'done') as UIStatus;
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
                      status: retryUiStatus,
                      routeType,
                      routeInfo: {
                        confidence: retryResponse.route.confidence,
                        latency_ms: retryResponse.observability.latency_ms,
                        tokens_est: retryResponse.observability.tokens_est,
                        cost_est_usd: retryResponse.observability.cost_est_usd,
                      },
                      decisionLog: retryDecisionLog.length > 0 ? retryDecisionLog : undefined,
                      mode,
                    },
                  ];
                });
              } catch (retryError: any) {
                console.error('Retry request failed:', retryError);
                // 确保错误消息是字符串类型
                const retryErrorMessage = retryError?.message != null 
                  ? String(retryError.message) 
                  : '出了一点小状况，要不再试一次？';
                setMessages((prev) => {
                  const filtered = prev.filter((m) => m.status !== 'awaiting_consent' && m.status !== 'thinking');
                  return [
                    ...filtered,
                    {
                      id: `error-${Date.now()}`,
                      role: 'assistant',
                      content: retryErrorMessage,
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