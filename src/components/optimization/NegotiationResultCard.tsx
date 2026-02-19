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
  CloudRain,
  Pencil,
  Copy,
} from 'lucide-react';

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
function ConsensusIndicator({ level }: { level: number }) {
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
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">共识度</span>
                <span className="text-sm tabular-nums">{percentage}%</span>
              </div>
              <Progress value={percentage} className={cn('h-2', getColor())} />
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
  result 
}: { 
  result: NegotiationResponse['votingResult'];
}) {
  const approve = Math.max(0, result.approve ?? 0);
  const reject = Math.max(0, result.reject ?? 0);
  const abstain = Math.max(0, result.abstain ?? 0);
  
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <ThumbsUp className="h-4 w-4 text-green-500" />
        <span className="font-medium text-green-600">{approve}</span>
        <span className="text-muted-foreground">赞成</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ThumbsDown className="h-4 w-4 text-red-500" />
        <span className="font-medium text-red-600">{reject}</span>
        <span className="text-muted-foreground">反对</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Minus className="h-4 w-4 text-gray-400" />
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
}: {
  guardian: 'abu' | 'dre' | 'neptune';
  utility: number;
}) {
  const config = GUARDIAN_CONFIG[guardian];
  const Icon = config.icon;
  const v = Number(utility);
  const percentage = Number.isNaN(v) ? 0 : Math.round(Math.max(0, Math.min(1, v)) * 100);

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg',
      config.bgColor
    )}>
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm'
      )}>
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{config.nameCN}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">{percentage}</p>
            <p className="text-xs text-muted-foreground">评分</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 将内部代号改写为用户可读文案 */
/** 根据文案推断建议类型（天气/节奏/安全），用于展示图标 */
function inferConcernType(text: string): 'weather' | 'pace' | 'safety' | 'other' {
  const t = text.toLowerCase();
  if (/天气|风|雨|雪|不确定|备选|室内|室外/.test(t)) return 'weather';
  if (/节奏|疲劳|负荷|休息|松紧|天数|天/.test(t)) return 'pace';
  if (/安全|风险|约束|危险|软约束/.test(t)) return 'safety';
  return 'other';
}

const CONCERN_TYPE_CONFIG: Record<'weather' | 'pace' | 'safety' | 'other', { icon: React.ElementType; label: string; color: string }> = {
  weather: { icon: CloudRain, label: '天气', color: 'text-blue-600' },
  pace: { icon: Activity, label: '节奏', color: 'text-amber-600' },
  safety: { icon: Shield, label: '安全', color: 'text-red-600' },
  other: { icon: AlertTriangle, label: '建议', color: 'text-muted-foreground' },
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
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
}

export function NegotiationResultCard({
  result,
  tripId,
  compact = false,
  showDetails = true,
  title = '协商结论',
  className,
}: NegotiationResultCardProps) {
  const navigate = useNavigate();
  const decisionConfig = DECISION_CONFIG[result.decision] || DECISION_CONFIG.NEEDS_HUMAN;

  const handleGoToEdit = () => {
    if (tripId) {
      navigate(`/dashboard/plan-studio?tripId=${tripId}`);
    }
  };

  return (
    <Card className={cn(
      'overflow-hidden',
      decisionConfig.borderColor,
      className
    )}>
      <CardHeader className={cn(decisionConfig.bgColor, compact && 'pb-3')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn(compact && 'text-base')}>{title}</CardTitle>
            {!compact && (
              <CardDescription>综合评估结论</CardDescription>
            )}
          </div>
          <DecisionBadge decision={result.decision} />
        </div>
      </CardHeader>

      <CardContent className={cn('pt-4', compact && 'pt-3')}>
        {/* 共识度和投票 */}
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <ConsensusIndicator level={result.consensusLevel} />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              投票结果
            </p>
            <VotingResult result={result.votingResult} />
          </div>
        </div>

        <Separator className="my-4" />

        {/* 评估维度（安全守护者 64 · 节奏 44 · 修复 67） */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-3">评估维度</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <GuardianEvaluation 
              guardian="abu" 
              utility={result.evaluationSummary.abuUtility} 
            />
            <GuardianEvaluation 
              guardian="dre" 
              utility={result.evaluationSummary.dreUtility} 
            />
            <GuardianEvaluation 
              guardian="neptune" 
              utility={result.evaluationSummary.neptuneUtility} 
            />
          </div>
        </div>

        {/* 详情展开 */}
        {showDetails && (() => {
          const criticalConcerns = result.evaluationSummary?.criticalConcerns ?? [];
          const keyTradeoffs = result.keyTradeoffs ?? [];
          const conditions = result.conditions ?? [];
          const conditionSet = new Set(conditions);
          const executableConcerns = criticalConcerns.filter((c) => !conditionSet.has(c));
          const suggestionCount = executableConcerns.length + keyTradeoffs.length;
          return (
          <Accordion type="single" collapsible className="w-full">
            {/* 行程优化建议 (N) = 可执行的调整 + 不同维度的评估意见，去重后 */}
            {suggestionCount > 0 ? (
              <AccordionItem value="suggestions">
                <AccordionTrigger className="text-sm">
                  行程优化建议 ({suggestionCount})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {executableConcerns.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">可执行的调整</p>
                        <p className="text-xs text-muted-foreground mb-3">根据建议调整行程顺序或预留备选方案，可点击「去改行程」进入规划工作台</p>
                        <ul className="space-y-3">
                          {executableConcerns.map((concern, i) => {
                            const type = inferConcernType(concern);
                            const config = CONCERN_TYPE_CONFIG[type];
                            const Icon = config.icon;
                            return (
                              <li
                                key={i}
                                className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', config.color, 'bg-muted/50')}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
                                    <p className="text-sm mt-0.5">{concern}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pl-11">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={handleGoToEdit}
                                            disabled={!tripId}
                                          >
                                            <Pencil className="h-3 w-3 mr-1" />
                                            去改行程
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {tripId ? '进入规划工作台调整行程' : '请在行程详情页使用此功能'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={async () => {
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
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {keyTradeoffs.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">不同维度的评估意见</p>
                        <p className="text-xs text-muted-foreground mb-2">安全、节奏、体验等角度看法不一，供参考</p>
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
                    出发前建议完成 ({conditions.length})
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
