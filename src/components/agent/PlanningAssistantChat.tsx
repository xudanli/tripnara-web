/**
 * 规划助手聊天组件
 * 
 * 使用新的规划助手 API，提供完整的对话式旅行规划体验
 * 适用页面: /dashboard/trips/new（Agent 主能力已迁至规划工作台右侧智能体）
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlanningAssistant, type PlanningMessage } from '@/hooks/usePlanningAssistant';
import { useAirbnb } from '@/hooks/useAirbnb';
import type { 
  GuidingQuestion, 
  DestinationRecommendation, 
  PlanCandidate,
  SuggestedAction,
  PlanningPhase,
  UserPreferenceSummaryResponse,
  NarrativeSection,
  ExpertCitation,
  DegradationInfo,
} from '@/api/assistant';
import { AirbnbSearchResults, AirbnbListingDetailsDialog } from '@/components/airbnb';
import { extractAirbnbSearchParams, hasAccommodationIntent } from '@/utils/airbnb-context-extractor';
import { itineraryItemsApi } from '@/api/trips';
import type { CreateItineraryItemRequest } from '@/types/trip';
import { tripsApi } from '@/api/trips';
import { countriesApi } from '@/api/countries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  User, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  Plane,
  Home,
  Utensils,
  Ticket,
  MoreHorizontal,
  ArrowRight,
  Check,
  Compass,
  Globe,
  Heart,
  AlertTriangle,
  Info,
  FileText,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { GuardianAssistantBlock, GuardianLegacyCitations } from '@/components/guardian';

interface PlanningAssistantChatProps {
  userId?: string;
  onTripCreated?: (tripId: string) => void;
  className?: string;
}

/**
 * 阶段进度配置
 */
const PHASE_CONFIG: Record<PlanningPhase, { label: string; progress: number; icon: React.ElementType }> = {
  INITIAL: { label: '开始', progress: 0, icon: Sparkles },
  EXPLORING: { label: '了解需求', progress: 15, icon: Compass },
  RECOMMENDING: { label: '推荐目的地', progress: 35, icon: Globe },
  PLANNING: { label: '生成方案', progress: 55, icon: Calendar },
  COMPARING: { label: '对比方案', progress: 70, icon: TrendingUp },
  ADJUSTING: { label: '调整优化', progress: 85, icon: RefreshCw },
  CONFIRMING: { label: '确认方案', progress: 95, icon: Check },
  COMPLETED: { label: '完成', progress: 100, icon: CheckCircle2 },
};

/**
 * V2.1: 专家引用组件
 * @deprecated 优先使用 {@link GuardianAssistantBlock}；仅无 presentation 时保留
 */
function ExpertCitationsPanel({ citations }: { citations: ExpertCitation[] }) {
  const personaConfig: Record<string, { emoji: string; color: string; bgColor: string }> = {
    'Abu': { emoji: '🐻‍❄️', color: 'text-blue-700', bgColor: 'bg-blue-50' },
    'Dr.Dre': { emoji: '🐕', color: 'text-amber-700', bgColor: 'bg-amber-50' },
    'Neptune': { emoji: '🦦', color: 'text-teal-700', bgColor: 'bg-teal-50' },
  };

  return (
    <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              "rounded-lg p-3 text-sm",
              config.bgColor
            )}
          >
            <div className={cn("font-medium mb-1 flex items-center gap-1.5", config.color)}>
              <span>{config.emoji}</span>
              <span>{citation.personaName} 说：</span>
            </div>
            <p className={cn("text-sm", config.color.replace('700', '600'))}>
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
    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {sections.map((section, idx) => {
        const config = sectionConfig[section.type] || sectionConfig.details;
        const Icon = config.icon;
        return (
          <div 
            key={idx} 
            className={cn("rounded-lg p-3", config.bgColor)}
          >
            <div className={cn("font-medium text-sm mb-1.5 flex items-center gap-1.5", config.color)}>
              <Icon className="w-4 h-4" />
              <span>{section.titleCN || section.title}</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
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
      "rounded-lg p-3 border flex items-start gap-2 animate-in fade-in duration-300",
      config.bgColor,
      config.borderColor
    )}>
      <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", config.color)}>
          {degradation.reasonCN || degradation.reason || '部分功能受限'}
        </p>
      </div>
    </div>
  );
}

/**
 * 引导问题组件
 */
function GuidingQuestionsPanel({ 
  questions, 
  onSelect 
}: { 
  questions: GuidingQuestion[];
  onSelect: (answer: string) => void;
}) {
  return (
    <div className="space-y-3 mt-4">
      {questions.map((q, idx) => (
        <div key={idx} className="space-y-2">
          <p className="text-sm font-medium text-foreground">{q.questionCN || q.question}</p>
          {q.options && q.optionsCN && (
            <div className="flex flex-wrap gap-2">
              {q.optionsCN.map((opt, optIdx) => (
                <Button
                  key={optIdx}
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(opt)}
                  className="h-8 px-3 text-xs hover:bg-primary/10 hover:border-primary"
                >
                  {opt}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 目的地推荐卡片
 */
function DestinationCard({ 
  recommendation, 
  onSelect 
}: { 
  recommendation: DestinationRecommendation;
  onSelect: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card 
        className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {recommendation.nameCN || recommendation.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {recommendation.countryCode}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Star className="w-3 h-3 mr-1 text-yellow-500" />
              {recommendation.matchScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recommendation.descriptionCN || recommendation.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {(recommendation.highlightsCN || recommendation.highlights).slice(0, 3).map((h, i) => (
              <Badge key={i} variant="outline" className="text-xs py-0">
                {h}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {recommendation.estimatedBudget.min}-{recommendation.estimatedBudget.max} {recommendation.estimatedBudget.currency}
            </span>
            <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              选择 <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 方案候选卡片
 */
function PlanCandidateCard({ 
  plan, 
  onSelect,
  isSelected,
}: { 
  plan: PlanCandidate;
  onSelect: () => void;
  isSelected?: boolean;
}) {
  const paceLabels = {
    relaxed: '轻松',
    moderate: '适中',
    intensive: '紧凑',
  };

  const budgetIcons = [
    { key: 'flight', icon: Plane, label: '交通' },
    { key: 'accommodation', icon: Home, label: '住宿' },
    { key: 'activities', icon: Ticket, label: '活动' },
    { key: 'food', icon: Utensils, label: '餐饮' },
    { key: 'other', icon: MoreHorizontal, label: '其他' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card 
        className={cn(
          "cursor-pointer transition-all",
          isSelected 
            ? "border-primary shadow-md ring-2 ring-primary/20" 
            : "hover:shadow-md hover:border-primary/50"
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {plan.nameCN || plan.name}
                {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {plan.descriptionCN || plan.description}
              </CardDescription>
            </div>
            <Badge className={cn(
              "text-xs",
              plan.pace === 'relaxed' && "bg-green-100 text-green-700",
              plan.pace === 'moderate' && "bg-blue-100 text-blue-700",
              plan.pace === 'intensive' && "bg-orange-100 text-orange-700",
            )}>
              {paceLabels[plan.pace]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* 基本信息 */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {plan.destination}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {plan.duration} 天
            </span>
          </div>

          {/* 亮点 */}
          <div className="flex flex-wrap gap-1">
            {plan.highlights.slice(0, 4).map((h, i) => (
              <Badge key={i} variant="outline" className="text-xs py-0">
                {h}
              </Badge>
            ))}
          </div>

          {/* 预算分布 */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">预算估算</span>
              <span className="text-sm font-semibold text-primary">
                {formatCurrency(plan.estimatedBudget.total, 'CNY')}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs">
              {budgetIcons.map(({ key, icon: Icon, label }) => (
                <div key={key} className="text-center">
                  <Icon className="w-3 h-3 mx-auto text-muted-foreground" />
                  <div className="text-muted-foreground mt-0.5">{label}</div>
                  <div className="font-medium">
                    {formatCurrency(plan.estimatedBudget.breakdown[key as keyof typeof plan.estimatedBudget.breakdown] || 0, 'CNY')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 适合度 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">适合度</span>
            <Progress value={plan.suitability.score} className="flex-1 h-1.5" />
            <span className="text-xs font-medium">{plan.suitability.score}%</span>
          </div>

          {/* 警告 */}
          {plan.warnings && plan.warnings.length > 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
              ⚠️ {plan.warnings.join(', ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 建议操作按钮
 */
function SuggestedActionsPanel({
  actions,
  onAction,
}: {
  actions: SuggestedAction[];
  onAction: (action: SuggestedAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {actions.map((action, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={() => onAction(action)}
          className="h-8 text-xs hover:bg-primary/10 hover:border-primary"
        >
          {action.labelCN || action.label}
          <ArrowRight className="w-3 h-3 ml-1" />
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
  onSelectOption,
  onSelectRecommendation,
  onSelectPlan,
  onAction,
  userId,
}: { 
  message: PlanningMessage;
  onSelectOption: (option: string) => void;
  onSelectRecommendation: (id: string) => void;
  onSelectPlan: (id: string) => void;
  onAction: (action: SuggestedAction) => void;
  userId?: string;
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
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
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

        {/* 引导问题 */}
        {!isUser && message.guidingQuestions && message.guidingQuestions.length > 0 && (
          <GuidingQuestionsPanel 
            questions={message.guidingQuestions} 
            onSelect={onSelectOption}
          />
        )}

        {/* 目的地推荐 */}
        {!isUser && message.recommendations && message.recommendations.length > 0 && (
          <div className="grid gap-3 mt-4 sm:grid-cols-2">
            {message.recommendations.map((rec) => (
              <DestinationCard
                key={rec.id}
                recommendation={rec}
                onSelect={() => onSelectRecommendation(rec.id)}
              />
            ))}
          </div>
        )}

        {/* 方案候选 */}
        {!isUser && message.planCandidates && message.planCandidates.length > 0 && (
          <div className="grid gap-3 mt-4">
            {message.planCandidates.map((plan) => (
              <PlanCandidateCard
                key={plan.id}
                plan={plan}
                onSelect={() => onSelectPlan(plan.id)}
              />
            ))}
          </div>
        )}

        {/* 确认完成 */}
        {!isUser && message.confirmedTripId && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center animate-in zoom-in-95 fade-in duration-300">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">行程已创建！</p>
            <p className="text-sm text-green-600 mt-1">
              行程编号: {message.confirmedTripId}
            </p>
          </div>
        )}

        {/* P1/P2 三人格单主角 */}
        {!isUser && message.guardianPresentation && (
          <div className="mt-3">
            <GuardianAssistantBlock
              presentation={message.guardianPresentation}
              tripId={message.confirmedTripId}
              userId={userId}
              source="presentation"
            />
          </div>
        )}

        {/* V2.1: 专家引用 — 无 presentation 或 decision_committee 时保留 */}
        {!isUser && (
          <GuardianLegacyCitations
            presentation={message.guardianPresentation}
            citations={message.citations}
            renderCitation={(citations) => (
              <ExpertCitationsPanel citations={citations ?? []} />
            )}
          />
        )}

        {/* V2.1: 分段内容 */}
        {!isUser && message.sections && message.sections.length > 0 && (
          <NarrativeSectionsPanel sections={message.sections} />
        )}

        {/* V2.1: 降级提示 */}
        {!isUser && message.degradation && message.degradation.degraded && (
          <div className="mt-3">
            <DegradationBanner degradation={message.degradation} />
          </div>
        )}

        {/* 建议操作 */}
        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <SuggestedActionsPanel 
            actions={message.suggestedActions} 
            onAction={onAction}
          />
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
 * 欢迎界面
 */
function WelcomeScreen({ 
  onStart,
  userPreferences,
  preferencesLoading,
}: { 
  onStart: (message: string) => void;
  userPreferences?: UserPreferenceSummaryResponse | null;
  preferencesLoading?: boolean;
}) {
  const quickStarts = [
    { icon: Heart, label: '浪漫蜜月', prompt: '我想和另一半去度蜜月，想要浪漫一点的目的地' },
    { icon: Users, label: '家庭出游', prompt: '想带父母和孩子一起出去玩，有什么适合的地方？' },
    { icon: Compass, label: '探险之旅', prompt: '想去探险，体验一些刺激的户外活动' },
    { icon: Globe, label: '说走就走', prompt: '我想去旅行' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 animate-in zoom-in-50 fade-in duration-500">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold mb-2 animate-in fade-in slide-in-from-bottom-4 duration-400 delay-200">
        嗨，我是规划助手 ✨
      </h2>
      
      <p className="text-muted-foreground mb-8 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400 delay-300">
        告诉我你的旅行想法，我会帮你找到完美的目的地，并生成详细的行程方案
      </p>

      {/* 用户偏好摘要 (P1 新功能) */}
      {preferencesLoading ? (
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在加载你的旅行偏好...
        </div>
      ) : userPreferences && userPreferences.topPreferences.length > 0 ? (
        <div className="mb-6 p-4 bg-primary/5 rounded-xl max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-400 delay-[350ms]">
          <p className="text-sm text-muted-foreground mb-2">
            根据你的旅行记录，我了解到：
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {userPreferences.topPreferences.slice(0, 4).map((pref, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {pref.labelCN}: {pref.value}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-400 delay-[400ms]">
        {quickStarts.map(({ icon: Icon, label, prompt }) => (
          <Button
            key={label}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary"
            onClick={() => onStart(prompt)}
          >
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-sm">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * 规划助手聊天组件
 */
export default function PlanningAssistantChat({
  userId,
  onTripCreated,
  className,
}: PlanningAssistantChatProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const {
    messages,
    phase,
    loading,
    error,
    confirmedTripId,
    sendMessage,
    selectOption,
    selectRecommendation,
    selectPlan,
    reset,
    // P1 新功能
    userPreferences,
    preferencesLoading,
    fetchUserPreferences,
  } = usePlanningAssistant(userId);

  // Airbnb 搜索功能
  const {
    searchResults: airbnbResults,
    searchLoading: airbnbLoading,
    searchError: airbnbError,
    search: searchAirbnb,
    authStatus: airbnbAuthStatus,
    checkAuthStatus: checkAirbnbAuth,
  } = useAirbnb();


  // 自动触发 Airbnb 搜索
  useEffect(() => {
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();
    
    const lastAssistantMessage = messages
      .filter(m => m.role === 'assistant')
      .pop();

    if (
      lastUserMessage && 
      hasAccommodationIntent(lastUserMessage.content) &&
      !airbnbLoading &&
      !airbnbResults &&
      airbnbAuthStatus?.isAuthorized
    ) {
      // 提取搜索参数（使用改进的上下文提取）
      const params = extractAirbnbSearchParams(
        messages,
        lastAssistantMessage?.recommendations?.[0],
        userPreferences
      );
      
      // 触发搜索
      searchAirbnb(params);
    }
  }, [messages, airbnbLoading, airbnbResults, airbnbAuthStatus, searchAirbnb, userPreferences, hasAccommodationIntent, extractAirbnbSearchParams]);

  // 检查 Airbnb 授权状态
  useEffect(() => {
    checkAirbnbAuth();
  }, [checkAirbnbAuth]);
  
  // 加载用户偏好 (P1 新功能)
  useEffect(() => {
    if (userId && messages.length === 0) {
      fetchUserPreferences();
    }
  }, [userId, fetchUserPreferences, messages.length]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 行程创建完成后的回调
  useEffect(() => {
    if (confirmedTripId && onTripCreated) {
      onTripCreated(confirmedTripId);
    }
  }, [confirmedTripId, onTripCreated]);

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

  // 处理建议操作
  const handleAction = useCallback(async (action: SuggestedAction) => {
    if (action.action === 'view_itinerary' && confirmedTripId) {
      navigate(`/dashboard/trips/${confirmedTripId}`);
    } else if (action.action === 'start_preparing' && confirmedTripId) {
      navigate(`/dashboard/plan-studio?tripId=${confirmedTripId}`);
    } else if (action.action.startsWith('view_')) {
      const planId = action.action.replace('view_', '');
      await selectPlan(planId);
    } else {
      await sendMessage(action.labelCN || action.label);
    }
  }, [confirmedTripId, navigate, selectPlan, sendMessage]);

  // 处理快速开始
  const handleQuickStart = useCallback(async (prompt: string) => {
    await sendMessage(prompt);
  }, [sendMessage]);

  const phaseConfig = PHASE_CONFIG[phase];

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* 顶部进度条 */}
      {messages.length > 0 && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <phaseConfig.icon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{phaseConfig.label}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-7 text-xs text-muted-foreground"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              重新开始
            </Button>
          </div>
          <Progress value={phaseConfig.progress} className="h-1.5" />
        </div>
      )}

      {/* 消息区域 */}
      {messages.length === 0 ? (
        <WelcomeScreen 
          onStart={handleQuickStart} 
          userPreferences={userPreferences}
          preferencesLoading={preferencesLoading}
        />
      ) : (
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onSelectOption={selectOption}
                onSelectRecommendation={selectRecommendation}
                onSelectPlan={selectPlan}
                onAction={handleAction}
                userId={userId}
              />
            ))}

            {/* Airbnb 搜索结果展示 */}
            {(airbnbResults || airbnbLoading || airbnbError) && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Home className="w-4 h-4 text-primary" />
                      Airbnb 房源推荐
                    </CardTitle>
                    <CardDescription className="text-xs">
                      为您找到了一些 Airbnb 房源选择
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AirbnbSearchResults
                      results={airbnbResults}
                      loading={airbnbLoading}
                      error={airbnbError}
                      isAuthorized={airbnbAuthStatus?.isAuthorized ?? false}
                      onViewDetails={(listingId) => {
                        setSelectedListingId(listingId);
                        setDetailsDialogOpen(true);
                      }}
                      onAddToTrip={async (listing) => {
                        // 如果行程已创建，添加到行程中
                        if (confirmedTripId) {
                          try {
                            const trip = await tripsApi.getById(confirmedTripId);
                            if (trip.TripDay && trip.TripDay.length > 0) {
                              // 使用第一个日期（实际应该让用户选择）
                              const firstDay = trip.TripDay[0];

                              // 提取价格信息
                              const priceText = listing.structuredDisplayPrice?.primaryLine?.accessibilityLabel || '';
                              const priceMatch = priceText.match(/\$(\d+)/);

                              // 获取行程目的地的货币策略，使用实时汇率
                              let estimatedCost: number | undefined;
                              let currency = 'CNY';

                              if (priceMatch) {
                                try {
                                  const currencyStrategy = await countriesApi.getCurrencyStrategy(trip.destination);
                                  const exchangeRate = currencyStrategy.exchangeRateToCNY || 1;
                                  estimatedCost = parseFloat(priceMatch[1]) * exchangeRate;
                                  currency = currencyStrategy.currencyCode || 'CNY';
                                } catch (error) {
                                  console.warn('获取货币策略失败，使用默认汇率:', error);
                                  // 回退到简单汇率转换
                                  estimatedCost = parseFloat(priceMatch[1]) * 6.5;
                                }
                              }

                              // 创建行程项（住宿类型）
                              const itemData: CreateItineraryItemRequest = {
                                tripDayId: firstDay.id,
                                type: 'ACTIVITY', // 住宿作为活动项
                                startTime: new Date().toISOString(), // TODO: 使用实际日期
                                endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // TODO: 使用实际日期
                                note: `Airbnb: ${listing.demandStayListing.description.name.localizedStringWithTranslationPreference}\n链接: ${listing.url}`,
                                estimatedCost,
                                costCategory: 'ACCOMMODATION',
                                currency,
                              };

                              await itineraryItemsApi.create(itemData);
                              toast.success(`已将 ${listing.demandStayListing.description.name.localizedStringWithTranslationPreference} 添加到行程`);
                            } else {
                              toast.error('行程中没有日期信息');
                            }
                          } catch (error: any) {
                            console.error('添加到行程失败:', error);
                            toast.error(error.message || '添加到行程失败');
                          }
                        } else {
                          // 行程未创建，提示用户先创建行程
                          toast.info('请先完成行程规划', {
                            description: '创建行程后可以将房源添加到行程中',
                          });
                        }
                      }}
                      onAuthorize={() => {
                        checkAirbnbAuth();
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 加载指示器 */}
            {loading && (
              <div className="flex gap-3 animate-in fade-in duration-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">思考中...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Airbnb 房源详情对话框 */}
      {selectedListingId && (
        <AirbnbListingDetailsDialog
          listingId={selectedListingId}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onAddToTrip={async (listing) => {
            // 如果行程已创建，添加到行程中
            if (confirmedTripId) {
              try {
                const trip = await tripsApi.getById(confirmedTripId);
                if (trip.TripDay && trip.TripDay.length > 0) {
                  const firstDay = trip.TripDay[0];

                  const priceText = listing.structuredDisplayPrice?.primaryLine?.accessibilityLabel || '';
                  const priceMatch = priceText.match(/\$(\d+)/);

                  // 获取行程目的地的货币策略，使用实时汇率
                  let estimatedCost: number | undefined;
                  let currency = 'CNY';

                  if (priceMatch) {
                    try {
                      const currencyStrategy = await countriesApi.getCurrencyStrategy(trip.destination);
                      const exchangeRate = currencyStrategy.exchangeRateToCNY || 1;
                      estimatedCost = parseFloat(priceMatch[1]) * exchangeRate;
                      currency = currencyStrategy.currencyCode || 'CNY';
                    } catch (error) {
                      console.warn('获取货币策略失败，使用默认汇率:', error);
                      // 回退到简单汇率转换
                      estimatedCost = parseFloat(priceMatch[1]) * 6.5;
                    }
                  }

                  const itemData: CreateItineraryItemRequest = {
                    tripDayId: firstDay.id,
                    type: 'ACTIVITY',
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    note: `Airbnb: ${listing.demandStayListing.description.name.localizedStringWithTranslationPreference}\n链接: ${listing.url}`,
                    estimatedCost,
                    costCategory: 'ACCOMMODATION',
                    currency,
                  };

                  await itineraryItemsApi.create(itemData);
                  toast.success(`已将 ${listing.demandStayListing.description.name.localizedStringWithTranslationPreference} 添加到行程`);
                  setDetailsDialogOpen(false);
                }
              } catch (error: any) {
                toast.error(error.message || '添加到行程失败');
              }
            } else {
              toast.info('请先完成行程规划');
            }
          }}
          searchParams={(() => {
            if (!airbnbResults) return undefined;
            // 从搜索结果中提取搜索参数
            const lastAssistantMessage = messages
              .filter(m => m.role === 'assistant')
              .pop();
            const params = extractAirbnbSearchParams(
              messages, 
              lastAssistantMessage?.recommendations?.[0], 
              userPreferences
            );
            return {
              checkin: params.checkin,
              checkout: params.checkout,
              adults: params.adults || 2,
              children: params.children,
            };
          })()}
        />
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* 输入区域 */}
      <div className="border-t p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              phase === 'COMPLETED' 
                ? "行程已创建，输入继续对话..." 
                : "告诉我你的旅行想法..."
            }
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
