/**
 * 守护者面板组件
 * 
 * 展示三人格（Abu、DrDre、Neptune）的评估结果
 * - 按优先级排序：安全 > 体力 > 替代方案
 * - 支持展开查看详情
 * - 支持接受/拒绝/忽略操作
 * - P2: 支持动画效果（打字、思考、出场）
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  PersonaInsight, 
  GuardianEvaluation, 
  GuardianPersona,
  Disclaimer,
} from '@/api/trip-planner';

// ==================== 类型定义 ====================

interface GuardianPanelProps {
  insights: PersonaInsight[];
  evaluation?: GuardianEvaluation;
  onAcceptSuggestion?: (persona: GuardianPersona, suggestionId?: string) => void;
  onRejectSuggestion?: (persona: GuardianPersona, reason?: string) => void;
  onIgnoreWarning?: (persona: GuardianPersona) => void;
  onExpandDetails?: (persona: GuardianPersona) => void;
  className?: string;
  /** P2: 是否启用入场动画（默认启用）*/
  enableAnimation?: boolean;
  /** P2: 是否有人格正在思考 */
  thinkingPersona?: GuardianPersona;
}

interface PersonaCardProps {
  insight: PersonaInsight;
  evaluation?: GuardianEvaluation['abu'] | GuardianEvaluation['drDre'] | GuardianEvaluation['neptune'];
  onAccept?: () => void;
  onReject?: () => void;
  onIgnore?: () => void;
  onExpandDetails?: () => void;
  /** P2: 入场动画延迟 (ms) */
  animationDelay?: number;
  /** P2: 是否处于思考状态 */
  isThinking?: boolean;
}

interface DisclaimerBannerProps {
  disclaimer: Disclaimer;
  onAcknowledge?: () => void;
}

// ==================== 配置 ====================

/**
 * 三人格详细信息配置
 * 基于产品设计稿更新
 */
const PERSONA_INFO: Record<GuardianPersona, {
  emoji: string;
  name: string;
  animal: string;
  animalEn: string;
  role: string;
  motto: string;
  description: string;
}> = {
  Abu: {
    emoji: '🐻‍❄️',
    name: 'Abu',
    animal: '北极熊',
    animalEn: 'Polar Guardian',
    role: '安全与边界守护者',
    motto: '我负责：这条路，真的能走吗？',
    description: '严肃但温柔，永远优先保证安全。',
  },
  DrDre: {
    emoji: '🐕',
    name: 'Dr.Dre',
    animal: '牧羊犬',
    animalEn: 'Mountain Shepherd Dog',
    role: '节奏与体力设计师',
    motto: '别太累，我会让每天刚刚好。',
    description: '聪明、稳重，在旁轻声引导节奏。',
  },
  Neptune: {
    emoji: '🦦',
    name: 'Neptune',
    animal: '海獭',
    animalEn: 'Navigation Otter',
    role: '修复与替代的空间魔法师',
    motto: '如果行不通，我会给你一个刚刚好的替代。',
    description: '灵活、体贴，永远理解你的真实需求。',
  },
};

const PERSONA_CONFIG: Record<GuardianPersona, {
  bgColor: string;
  borderColor: string;
  accentColor: string;
}> = {
  Abu: {
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    accentColor: 'text-slate-700',
  },
  DrDre: {
    bgColor: 'bg-stone-50',
    borderColor: 'border-stone-200',
    accentColor: 'text-stone-700',
  },
  Neptune: {
    bgColor: 'bg-zinc-50',
    borderColor: 'border-zinc-200',
    accentColor: 'text-zinc-700',
  },
};

const SEVERITY_CONFIG = {
  success: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    label: '通过',
  },
  info: {
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Info,
    label: '建议',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
    label: '警告',
  },
  error: {
    badge: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
    label: '风险',
  },
};

// ==================== 子组件 ====================

/**
 * 疲劳度进度条
 */
function FatigueBar({ level }: { level: number }) {
  const getColor = (l: number) => {
    if (l > 80) return { bg: 'bg-red-500', text: 'text-red-600', emoji: '🔴' };
    if (l > 60) return { bg: 'bg-amber-500', text: 'text-amber-600', emoji: '🟡' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600', emoji: '🟢' };
  };

  const { bg, text, emoji } = getColor(level);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">体力消耗评估</span>
        <span className={cn("font-medium", text)}>
          {emoji} {level}/100
        </span>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", bg)}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 替代方案选择器
 */
function AlternativesPicker({ 
  alternatives, 
  onSelect 
}: { 
  alternatives: NonNullable<GuardianEvaluation['neptune']>['alternatives'];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground font-medium">可选替代方案：</p>
      {alternatives.map((alt) => (
        <div 
          key={alt.id}
          className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer group"
          onClick={() => onSelect?.(alt.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground line-through">{alt.original}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium text-slate-800">{alt.replacement}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{alt.reason}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            选择
          </Button>
        </div>
      ))}
    </div>
  );
}

/**
 * 单个人格卡片
 */
function PersonaCard({
  insight,
  evaluation,
  onAccept,
  onReject: _onReject,
  onIgnore,
  onExpandDetails,
  animationDelay = 0,
  isThinking = false,
}: PersonaCardProps) {
  // onReject is available for future use (e.g., showing rejection reason dialog)
  void _onReject;
  const [expanded, setExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const config = PERSONA_CONFIG[insight.persona];
  const severityConfig = SEVERITY_CONFIG[insight.severity];
  const SeverityIcon = severityConfig.icon;

  // P2: 延迟入场动画
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
    if (!expanded && onExpandDetails) {
      onExpandDetails();
    }
  };

  // 判断是否是 DrDre 的疲劳度评估
  const isDrDreFatigue = insight.persona === 'DrDre' && evaluation && 'fatigueLevel' in evaluation;
  
  // 判断是否是 Neptune 的替代方案
  const isNeptuneAlternatives = insight.persona === 'Neptune' && evaluation && 'alternatives' in evaluation && evaluation.hasAlternatives;

  return (
    <Card className={cn(
      "border transition-all duration-300",
      config.borderColor,
      config.bgColor,
      // P2: 入场动画
      isVisible 
        ? "opacity-100 translate-y-0" 
        : "opacity-0 translate-y-2",
      // P2: 思考状态动画
      isThinking && "animate-pulse ring-2 ring-slate-300/50",
      // P2: 悬停效果
      "hover:shadow-md hover:border-slate-300/80",
    )}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* P2: 头像动画 - 悬停时轻微跳动 */}
              <span className={cn(
                "text-xl transition-transform duration-200",
                "hover:scale-110 hover:-translate-y-0.5",
                isThinking && "animate-bounce"
              )}>
                {PERSONA_INFO[insight.persona].emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">
                    {PERSONA_INFO[insight.persona].name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {PERSONA_INFO[insight.persona].animal}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {PERSONA_INFO[insight.persona].role}
                </div>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-xs transition-colors", severityConfig.badge)}
            >
              <SeverityIcon className="w-3 h-3 mr-1" />
              {severityConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-3 px-4">
          {/* 主消息 */}
          <p className="text-sm text-slate-700 leading-relaxed">
            {insight.message}
          </p>

          {/* DrDre 疲劳度条 */}
          {isDrDreFatigue && (
            <div className="mt-3">
              <FatigueBar level={(evaluation as GuardianEvaluation['drDre'])!.fatigueLevel} />
            </div>
          )}

          {/* 建议 */}
          {insight.suggestion && (
            <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-white/80 border border-slate-100">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">{insight.suggestion}</p>
            </div>
          )}

          {/* Neptune 替代方案 */}
          {isNeptuneAlternatives && (
            <AlternativesPicker 
              alternatives={(evaluation as GuardianEvaluation['neptune'])!.alternatives}
              onSelect={() => onAccept?.()}
            />
          )}

          {/* 展开详情 */}
          <CollapsibleContent>
            {insight.details && insight.details.length > 0 && (
              <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-muted-foreground">详细说明：</p>
                <ul className="space-y-1">
                  {insight.details.map((detail, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-slate-400">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>

          {/* 操作区域 */}
          <div className="mt-3 flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground hover:text-slate-700 h-7 px-2"
                onClick={handleToggleExpand}
              >
                {expanded ? (
                  <>收起 <ChevronUp className="w-3 h-3 ml-1" /></>
                ) : (
                  <>查看详情 <ChevronDown className="w-3 h-3 ml-1" /></>
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              {(insight.severity === 'warning' || insight.severity === 'error') && onIgnore && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs h-7 px-2 text-muted-foreground"
                  onClick={onIgnore}
                >
                  忽略
                </Button>
              )}
              {insight.suggestion && onAccept && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7 px-3"
                  onClick={onAccept}
                >
                  <Check className="w-3 h-3 mr-1" />
                  接受建议
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// ==================== 主组件 ====================

/**
 * 顾问团面板
 */
export function GuardianPanel({
  insights,
  evaluation,
  onAcceptSuggestion,
  onRejectSuggestion,
  onIgnoreWarning,
  onExpandDetails,
  className,
  enableAnimation = true,
  thinkingPersona,
}: GuardianPanelProps) {
  if (!insights || insights.length === 0) {
    return null;
  }

  // 获取对应人格的评估数据
  const getEvaluationForPersona = (persona: GuardianPersona) => {
    if (!evaluation) return undefined;
    switch (persona) {
      case 'Abu': return evaluation.abu;
      case 'DrDre': return evaluation.drDre;
      case 'Neptune': return evaluation.neptune;
      default: return undefined;
    }
  };

  // P2: 按优先级排序人格卡片（安全 > 节奏 > 替代方案）
  const sortedInsights = [...insights].sort((a, b) => {
    const priority: Record<GuardianPersona, number> = {
      Abu: 1,      // 安全优先
      DrDre: 2,    // 其次是体力
      Neptune: 3,  // 最后是替代方案
    };
    return priority[a.persona] - priority[b.persona];
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* 标题 - 带渐入动画 */}
      <div className={cn(
        "flex items-center gap-2 text-sm font-medium text-slate-600",
        enableAnimation && "animate-in fade-in duration-300"
      )}>
        <span className="animate-pulse">💭</span>
        <span>顾问团评估</span>
        {thinkingPersona && (
          <span className="text-xs text-muted-foreground animate-pulse">
            · {PERSONA_INFO[thinkingPersona].name}思考中...
          </span>
        )}
      </div>

      {/* 人格卡片列表 - 带 staggered 动画 */}
      <div className="space-y-3">
        {sortedInsights.map((insight, index) => (
          <PersonaCard
            key={insight.persona}
            insight={insight}
            evaluation={getEvaluationForPersona(insight.persona)}
            onAccept={() => onAcceptSuggestion?.(insight.persona)}
            onReject={() => onRejectSuggestion?.(insight.persona)}
            onIgnore={() => onIgnoreWarning?.(insight.persona)}
            onExpandDetails={() => onExpandDetails?.(insight.persona)}
            // P2: staggered animation - 每张卡片延迟 100ms
            animationDelay={enableAnimation ? index * 100 : 0}
            isThinking={thinkingPersona === insight.persona}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 顾问团全部通过状态
 * 当所有人格评估都没有问题时显示
 */
export function GuardianAllClearBanner({ 
  className,
}: { 
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100 animate-in fade-in duration-300",
      className
    )}>
      {/* 三人格头像 - 全部显示成功状态 */}
      <div className="flex -space-x-2">
        {(['Abu', 'DrDre', 'Neptune'] as GuardianPersona[]).map((persona) => (
          <div
            key={persona}
            className="w-7 h-7 rounded-full bg-white border-2 border-emerald-100 flex items-center justify-center"
          >
            <span className="text-sm">{PERSONA_INFO[persona].emoji}</span>
          </div>
        ))}
      </div>
      
      {/* 成功文案 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">当前方案已通过顾问团评估</span>
        </div>
        <p className="text-xs text-emerald-600/80 mt-0.5">
          安全、节奏、替代方案均无需调整
        </p>
      </div>
    </div>
  );
}

/**
 * P2: 守护者思考指示器
 * 当 AI 正在分析时显示的动画效果
 */
export function GuardianThinkingIndicator({ 
  message = '顾问团正在分析...',
}: { 
  message?: string;
}) {
  const personas: GuardianPersona[] = ['Abu', 'DrDre', 'Neptune'];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 animate-in fade-in duration-300">
      {/* 三人格头像 - 带脉冲动画 */}
      <div className="flex -space-x-2">
        {personas.map((persona, i) => (
          <div
            key={persona}
            className={cn(
              "w-8 h-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center",
              "animate-pulse"
            )}
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <span className="text-base">{PERSONA_INFO[persona].emoji}</span>
          </div>
        ))}
      </div>
      
      {/* 思考文字 */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{message}</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 责任声明横幅
 */
export function DisclaimerBanner({ 
  disclaimer, 
  onAcknowledge 
}: DisclaimerBannerProps) {
  const isWarning = disclaimer.type === 'user_override_safety';

  return (
    <div className={cn(
      "rounded-lg p-3 border flex items-start gap-3",
      isWarning 
        ? "bg-amber-50 border-amber-200" 
        : "bg-slate-50 border-slate-200"
    )}>
      <AlertTriangle className={cn(
        "w-4 h-4 flex-shrink-0 mt-0.5",
        isWarning ? "text-amber-500" : "text-slate-500"
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm",
          isWarning ? "text-amber-800" : "text-slate-700"
        )}>
          {disclaimer.message}
        </p>
        {disclaimer.relatedPersona && (
          <p className="text-xs text-muted-foreground mt-1">
            相关人格：{PERSONA_INFO[disclaimer.relatedPersona].emoji} {PERSONA_INFO[disclaimer.relatedPersona].name} · {PERSONA_INFO[disclaimer.relatedPersona].animal}
          </p>
        )}
      </div>
      {onAcknowledge && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7"
          onClick={onAcknowledge}
        >
          知道了
        </Button>
      )}
    </div>
  );
}

export default GuardianPanel;
