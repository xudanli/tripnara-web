/**
 * 协商结果卡片组件
 * 
 * 展示三守护者（Abu/Dre/Neptune）的协商结论和投票结果
 */

import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { NegotiationResponse, NegotiationDecision } from '@/types/optimization-v2';
import type { GuardianPersonaPresentation } from '@/types/guardian-presentation';
import {
  Shield,
  Activity,
  Wrench,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Scale,
  Users,
  MessageSquare,
  Lightbulb,
  CloudRain,
  Pencil,
  Copy,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuardianChooseModal } from '@/components/guardian/GuardianChooseModal';
import { GuardianPresentationPanel } from '@/components/guardian/GuardianPresentationPanel';
import {
  canShowGuardianChoose,
  extractChooseOptions,
  resolveNegotiationHardBlocked,
} from '@/lib/guardian-presentation.util';
import { useGuardianHumanChoice } from '@/hooks/useGuardianHumanChoice';

// ==================== 配置 ====================

const DECISION_CONFIG: Record<NegotiationDecision, {
  label: string;
  labelEn: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  APPROVE: {
    label: '批准',
    labelEn: 'Approved',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: '计划通过所有守护者审核',
  },
  APPROVE_WITH_CONDITIONS: {
    label: '附条件批准',
    labelEn: 'Conditional',
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: '计划需满足附加条件后方可执行',
  },
  REJECT: {
    label: '拒绝',
    labelEn: 'Rejected',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: '计划存在重大问题，建议修改',
  },
  NEEDS_HUMAN: {
    label: '需人工决策',
    labelEn: 'Human Review',
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '存在复杂权衡，需要用户做出选择',
  },
};

const GUARDIAN_CONFIG = {
  abu: {
    name: 'Abu',
    nameCN: '安全守护者',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    description: '负责安全约束检查',
  },
  dre: {
    name: 'Dr.Dre',
    nameCN: '节奏守护者',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: '负责行程节奏调整',
  },
  neptune: {
    name: 'Neptune',
    nameCN: '修复守护者',
    icon: Wrench,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    description: '负责问题修复和替代方案',
  },
};

// ==================== 子组件 ====================

/** 决策状态徽章 */
function DecisionBadge({ 
  decision, 
  size = 'default' 
}: { 
  decision: NegotiationDecision;
  size?: 'default' | 'large';
}) {
  const config = DECISION_CONFIG[decision] || DECISION_CONFIG.NEEDS_HUMAN;
  const Icon = config.icon;

  if (size === 'large') {
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border',
        config.bgColor,
        config.borderColor
      )}>
        <Icon className={cn('h-6 w-6', config.color)} />
        <div>
          <p className={cn('font-semibold', config.color)}>{config.label}</p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn('gap-1', config.bgColor, config.borderColor, config.color)}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

/** 共识度指示器 */
function ConsensusIndicator({ level, compact }: { level: number; compact?: boolean }) {
  const v = Number(level);
  const percentage = Number.isNaN(v) ? 0 : Math.round(Math.max(0, Math.min(1, v)) * 100);
  
  const getColor = () => {
    if (level >= 0.8) return 'bg-green-500';
    if (level >= 0.6) return 'bg-blue-500';
    if (level >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLabel = () => {
    if (level >= 0.8) return '高度共识';
    if (level >= 0.6) return '基本共识';
    if (level >= 0.4) return '存在分歧';
    return '严重分歧';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center', compact ? 'gap-1.5' : 'gap-3')}>
            <Scale className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
            <div className="flex-1">
              <div className={cn('flex items-center justify-between', compact ? 'mb-0.5' : 'mb-1')}>
                <span className="text-sm font-medium">共识度</span>
                <span className="text-sm tabular-nums">{percentage}%</span>
              </div>
              <Progress value={percentage} className={cn(compact ? 'h-1.5' : 'h-2', getColor())} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>{getLabel()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 投票结果展示（X 赞成 · Y 反对 · Z 弃权） */
function VotingResult({ 
  result,
  compact,
}: { 
  result: NegotiationResponse['votingResult'];
  compact?: boolean;
}) {
  const approve = Math.max(0, result.approve ?? 0);
  const reject = Math.max(0, result.reject ?? 0);
  const abstain = Math.max(0, result.abstain ?? 0);
  
  return (
    <div className={cn('flex flex-wrap items-center text-sm', compact ? 'gap-2' : 'gap-3')}>
      <div className="flex items-center gap-1">
        <ThumbsUp className={cn('text-green-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        <span className="font-medium text-green-600">{approve}</span>
        <span className="text-muted-foreground">赞成</span>
      </div>
      <div className="flex items-center gap-1">
        <ThumbsDown className={cn('text-red-500', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        <span className="font-medium text-red-600">{reject}</span>
        <span className="text-muted-foreground">反对</span>
      </div>
      <div className="flex items-center gap-1">
        <Minus className={cn('text-gray-400', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        <span className="font-medium text-gray-500">{abstain}</span>
        <span className="text-muted-foreground">弃权</span>
      </div>
    </div>
  );
}

/** 评估维度卡（安全/节奏/修复，用户可读） */
function GuardianEvaluation({
  guardian,
  utility,
  compact,
}: {
  guardian: 'abu' | 'dre' | 'neptune';
  utility: number;
  compact?: boolean;
}) {
  const config = GUARDIAN_CONFIG[guardian];
  const Icon = config.icon;
  const v = Number(utility);
  const percentage = Number.isNaN(v) ? 0 : Math.round(Math.max(0, Math.min(1, v)) * 100);

  return (
    <div className={cn(
      'flex items-center rounded-lg',
      config.bgColor,
      compact ? 'gap-2 p-2' : 'gap-3 p-3'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full bg-white shadow-sm',
        compact ? 'h-7 w-7' : 'h-10 w-10'
      )}>
        <Icon className={cn(compact ? 'h-3.5 w-3.5' : 'h-5 w-5', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{config.nameCN}</p>
            {!compact && <p className="text-xs text-muted-foreground">{config.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={cn('font-bold tabular-nums', compact ? 'text-sm' : 'text-lg')}>{percentage}</p>
            <p className="text-xs text-muted-foreground">{getScoreLabel(percentage)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 评估分数 → 可读状态 */
function getScoreLabel(percentage: number): string {
  if (percentage >= 70) return '良好';
  if (percentage >= 40) return '一般';
  return '待改进';
}

/** 从建议文案提取首句或前 40 字作为摘要 */
function extractSummary(text: string, maxLen = 40): string {
  const match = text.match(/^[^。！？]+[。！？]?/);
  const first = (match ? match[0].trim() : text) || text;
  if (first.length <= maxLen) return first;
  return first.slice(0, maxLen) + '…';
}

/** 是否有超出摘要的详情可展开 */
function hasExpandableDetail(full: string, summary: string): boolean {
  return full.length > summary.length;
}

/** 根据文案推断建议类型（天气/节奏/安全），用于展示图标 */
function inferConcernType(text: string): 'weather' | 'pace' | 'safety' | 'other' {
  const t = text.toLowerCase();
  if (/天气|风|雨|雪|不确定|备选|室内|室外/.test(t)) return 'weather';
  if (/节奏|疲劳|负荷|休息|松紧|天数|天/.test(t)) return 'pace';
  if (/安全|风险|约束|危险|软约束/.test(t)) return 'safety';
  return 'other';
}

/** 建议类型 → 影响维度（建立 建议↔评分 认知映射） */
const CONCERN_TYPE_CONFIG: Record<
  'weather' | 'pace' | 'safety' | 'other',
  { icon: React.ElementType; label: string; color: string; dimension: string; impactHint: string }
> = {
  weather: { icon: CloudRain, label: '天气', color: 'text-blue-600', dimension: '安全', impactHint: '采纳后可降低天气风险、提升安全分' },
  pace: { icon: Activity, label: '节奏', color: 'text-amber-600', dimension: '节奏', impactHint: '采纳后可缓解疲劳、提升节奏分' },
  safety: { icon: Shield, label: '安全', color: 'text-red-600', dimension: '安全', impactHint: '采纳后可提升安全分' },
  other: { icon: AlertTriangle, label: '建议', color: 'text-muted-foreground', dimension: '修复', impactHint: '采纳后可优化体验与路线结构' },
};

function toUserReadableTradeoff(text: string): string {
  return text
    .replace(/NEPTUNE\s*支持\s*vs\s*DRE\s*反对/gi, '安全与节奏存在分歧')
    .replace(/DRE\s*支持\s*vs\s*NEPTUNE\s*反对/gi, '节奏与修复存在分歧')
    .replace(/ABU\s*支持\s*vs\s*DRE\s*反对/gi, '安全与节奏存在分歧')
    .replace(/NEPTUNE\s*支持\s*vs\s*ABU\s*反对/gi, '修复与安全存在分歧')
    .replace(/\bNEPTUNE\b/gi, '修复')
    .replace(/\bDRE\b/gi, '节奏')
    .replace(/\bABU\b/gi, '安全');
}

/** 权衡点列表 */
function TradeoffsList({
  tradeoffs,
  title = '关键权衡',
}: {
  tradeoffs: string[];
  title?: string;
}) {
  if (tradeoffs.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        {title}
      </p>
      <ul className="space-y-1.5">
        {tradeoffs.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{toUserReadableTradeoff(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 建议任务行：结论 + 主操作，详情可展开 */
function SuggestionTaskRow({
  concern,
  onGoToEdit,
  tripId,
  dimensionLabel,
}: {
  concern: string;
  onGoToEdit: () => void;
  tripId: string | undefined;
  /** 后端返回的维度标签（如 安全/节奏/修复），无则用 heuristic */
  dimensionLabel?: string;
}) {
  const [detailOpen, setDetailOpen] = React.useState(false);
  const type = inferConcernType(concern);
  const config = CONCERN_TYPE_CONFIG[type];
  const Icon = config.icon;
  const label = dimensionLabel ?? config.dimension;
  const hint = dimensionLabel ? `采纳后可提升${dimensionLabel}分` : config.impactHint;
  const summary = extractSummary(concern);
  const hasDetail = hasExpandableDetail(concern, summary);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-3 min-h-[48px]">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50', config.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm line-clamp-2">
                  <span className="text-xs text-muted-foreground shrink-0">[{label}] </span>
                  {summary}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                {hint}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={onGoToEdit}
                disabled={!tripId}
              >
                <Pencil className="h-3 w-3 mr-1" />
                去改行程
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {tripId ? '进入规划工作台调整行程' : '请在行程详情页使用此功能'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {hasDetail && (
        <Collapsible open={detailOpen} onOpenChange={setDetailOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
            {detailOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            查看详情
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0 flex items-start gap-2">
              <p className="text-sm text-muted-foreground flex-1">{concern}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await navigator.clipboard.writeText(concern);
                    toast.success('已复制');
                  } catch {
                    toast.error('复制失败');
                  }
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                复制
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ==================== 主组件 ====================

export interface NegotiationResultCardProps {
  /** 协商结果 */
  result: NegotiationResponse;
  /** 行程 ID，用于「去改行程」跳转规划工作台 */
  tripId?: string;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示详情 */
  showDetails?: boolean;
  /** 是否展示三人 utility 分数（默认 false，符合 P1 单主角规范） */
  showUtilityScores?: boolean;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
  /** 登录用户 ID（用于 CHOOSE 写回 feedback） */
  userId?: string | null;
  /** CHOOSE 确认回调（写回成功后触发；未传则仅写回 feedback） */
  onHumanChoice?: (selectedIndex: number, selectedText: string) => void;
}

export function NegotiationResultCard({
  result,
  tripId,
  compact = false,
  showDetails = true,
  showUtilityScores = false,
  title = '协商结论',
  className,
  userId,
  onHumanChoice,
}: NegotiationResultCardProps) {
  const navigate = useNavigate();
  const [chooseOpen, setChooseOpen] = React.useState(false);
  const [postChoosePresentation, setPostChoosePresentation] =
    React.useState<GuardianPersonaPresentation | null>(null);
  const decisionConfig = DECISION_CONFIG[result.decision] || DECISION_CONFIG.NEEDS_HUMAN;
  const criticalConcerns = result.evaluationSummary?.criticalConcerns ?? [];
  const [humanPoints, setHumanPoints] = React.useState(() =>
    extractChooseOptions({ negotiation: result }),
  );

  React.useEffect(() => {
    setHumanPoints(extractChooseOptions({ negotiation: result }));
    setPostChoosePresentation(null);
  }, [result]);

  const hardBlocked = resolveNegotiationHardBlocked(result);
  const showChoose = canShowGuardianChoose({
    decision: result.decision,
    hardConstraintBlocked: hardBlocked,
    chooseOptions: humanPoints,
  });

  const { submitChoice, isSubmitting: isChooseSubmitting } = useGuardianHumanChoice({
    userId,
    tripId,
    source: 'negotiation',
    decisionPoints: humanPoints,
    onSuccess: onHumanChoice,
    onPresentation: (next) => {
      setPostChoosePresentation(next);
      const refreshed = extractChooseOptions({ presentation: next, negotiation: result });
      setHumanPoints(refreshed.length > 0 ? refreshed : humanPoints);
    },
  });

  const handleGoToEdit = () => {
    if (tripId) {
      navigate(`/dashboard/plan-studio?tripId=${tripId}`);
    }
  };

  const handleChooseConfirm = (idx: number, text: string) => {
    void submitChoice(idx, text, humanPoints);
  };

  return (
    <Card className={cn(
      'overflow-hidden',
      decisionConfig.borderColor,
      className
    )}>
      <CardHeader className={cn(decisionConfig.bgColor, compact ? 'p-2.5 pb-1.5' : 'pb-3')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn(compact ? 'text-sm' : '')}>{title}</CardTitle>
            {!compact && (
              <CardDescription>综合评估结论</CardDescription>
            )}
          </div>
          <DecisionBadge decision={result.decision} />
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? 'p-2.5 pt-0' : 'pt-4')}>
        {postChoosePresentation ? (
          <div className="mb-3">
            <GuardianPresentationPanel presentation={postChoosePresentation} />
          </div>
        ) : null}
        {criticalConcerns.length > 0 ? (
          <div
            className={cn(
              'mb-3 rounded-lg border px-3 py-2 text-sm',
              hardBlocked
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-amber-200 bg-amber-50 text-amber-950',
            )}
          >
            <p className="font-medium flex items-center gap-1.5 mb-1">
              <Shield className="h-4 w-4 shrink-0" />
              {hardBlocked ? 'Abu 硬风险摘要' : '关键关注点'}
            </p>
            <ul className="space-y-1 text-xs sm:text-sm">
              {criticalConcerns.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {showChoose ? (
          <div className={cn('mb-3', compact ? 'space-y-2' : 'space-y-3')}>
            <Button
              size="sm"
              variant="default"
              disabled={isChooseSubmitting}
              onClick={() => setChooseOpen(true)}
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              做出价值取舍
            </Button>
            <GuardianChooseModal
              open={chooseOpen}
              onOpenChange={setChooseOpen}
              points={humanPoints}
              title="价值协商 — 需要您选择"
              description="以下为软约束取舍，不会覆盖 Abu 已判定的硬风险。"
              onConfirm={handleChooseConfirm}
            />
          </div>
        ) : null}

        {/* 共识度和投票 */}
        <div className={cn('grid sm:grid-cols-2', compact ? 'gap-2 mb-2' : 'gap-4 mb-4')}>
          <ConsensusIndicator level={result.consensusLevel} compact={compact} />
          <div>
            <p className={cn('font-medium flex items-center gap-2', compact ? 'text-sm mb-1' : 'text-sm mb-2')}>
              <Users className={cn('text-muted-foreground', compact ? 'h-3 w-3' : 'h-4 w-4')} />
              投票结果
            </p>
            <VotingResult result={result.votingResult} compact={compact} />
          </div>
        </div>

        <Separator className={compact ? 'my-2' : 'my-4'} />

        {showUtilityScores ? (
        <div className={compact ? 'mb-2' : 'mb-4'}>
          <p className={cn('font-medium', compact ? 'text-sm mb-2' : 'text-sm mb-3')}>评估维度</p>
          <div className={cn('grid sm:grid-cols-3', compact ? 'gap-2' : 'gap-2')}>
            <GuardianEvaluation 
              guardian="abu" 
              utility={result.evaluationSummary.abuUtility}
              compact={compact}
            />
            <GuardianEvaluation 
              guardian="dre" 
              utility={result.evaluationSummary.dreUtility}
              compact={compact}
            />
            <GuardianEvaluation 
              guardian="neptune" 
              utility={result.evaluationSummary.neptuneUtility}
              compact={compact}
            />
          </div>
        </div>
        ) : null}

        {/* 详情展开 */}
        {showDetails && (() => {
          const criticalConcerns = result.evaluationSummary?.criticalConcerns ?? [];
          const suggestionsWithDimension = result.evaluationSummary?.suggestionsWithDimension;
          const keyTradeoffs = result.keyTradeoffs ?? [];
          const conditions = result.conditions ?? [];
          const conditionSet = new Set(conditions);
          const executableItems: Array<{ text: string; dimensionLabel?: string }> =
            suggestionsWithDimension?.length
              ? suggestionsWithDimension.filter((s) => !conditionSet.has(s.text)).map((s) => ({ text: s.text, dimensionLabel: s.dimensionLabel }))
              : criticalConcerns.filter((c) => !conditionSet.has(c)).map((text) => ({ text, dimensionLabel: undefined }));
          const suggestionCount = executableItems.length + keyTradeoffs.length;
          return (
          <Accordion type="single" collapsible className="w-full">
            {/* 建议你先做：任务清单式，结论+主操作 */}
            {suggestionCount > 0 ? (
              <AccordionItem value="suggestions">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    建议你先做 ({suggestionCount})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {executableItems.map((item, i) => (
                      <SuggestionTaskRow
                        key={i}
                        concern={item.text}
                        onGoToEdit={handleGoToEdit}
                        tripId={tripId}
                        dimensionLabel={item.dimensionLabel}
                      />
                    ))}
                    {keyTradeoffs.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">其他参考</p>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {keyTradeoffs.map((item, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                onClick={async () => {
                                  const text = toUserReadableTradeoff(item);
                                  try {
                                    await navigator.clipboard.writeText(text);
                                    toast.success('已复制');
                                  } catch {
                                    toast.error('复制失败');
                                  }
                                }}
                                className="flex items-start gap-2 text-left w-full p-2 -m-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span>{toUserReadableTradeoff(item)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : null}

            {/* 出发前建议完成：仅 decision=APPROVE_WITH_CONDITIONS 时展示，与 criticalConcerns 去重 */}
            {result.decision === 'APPROVE_WITH_CONDITIONS' && conditions.length > 0 && (
              <AccordionItem value="conditions">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    出发前需完成 ({conditions.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    为保障行程安全与体验，建议在出发前完成以下调整。
                  </p>
                  <ul className="space-y-2">
                    {conditions.map((condition, i) => (
                      <li 
                        key={i} 
                        className="flex items-start gap-2 p-2 rounded bg-yellow-50 text-sm"
                      >
                        <span className="font-medium text-yellow-700">{i + 1}.</span>
                        <span>{condition}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 需人类决策的点：仅 decision=NEEDS_HUMAN 时展示 */}
            {result.decision === 'NEEDS_HUMAN' && result.humanDecisionPoints && result.humanDecisionPoints.length > 0 && (
              <AccordionItem value="human-decisions">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    需人类决策的点 ({result.humanDecisionPoints.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {result.humanDecisionPoints.map((point, i) => (
                      <li 
                        key={i} 
                        className="flex items-start gap-2 p-2 rounded bg-blue-50 text-sm"
                      >
                        <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// ==================== 导出 ====================

export default NegotiationResultCard;
export { 
  DecisionBadge, 
  ConsensusIndicator, 
  VotingResult, 
  GuardianEvaluation, 
  TradeoffsList,
  DECISION_CONFIG,
  GUARDIAN_CONFIG,
};
