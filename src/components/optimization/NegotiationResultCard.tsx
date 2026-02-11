/**
 * 协商结果卡片组件
 * 
 * 展示三守护者（Abu/Dre/Neptune）的协商结论和投票结果
 */

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  ChevronRight,
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
  const percentage = Math.round(level * 100);
  
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

/** 投票结果展示 */
function VotingResult({ 
  result 
}: { 
  result: NegotiationResponse['votingResult'];
}) {
  const total = result.approve + result.reject + result.abstain;
  
  return (
    <div className="flex items-center gap-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-600">{result.approve}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>赞成</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-600">{result.reject}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>反对</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Minus className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-500">{result.abstain}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>弃权</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** 守护者评估卡 */
function GuardianEvaluation({
  guardian,
  utility,
}: {
  guardian: 'abu' | 'dre' | 'neptune';
  utility: number;
}) {
  const config = GUARDIAN_CONFIG[guardian];
  const Icon = config.icon;
  const percentage = Math.round(utility * 100);

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
            <p className="font-medium">{config.name}</p>
            <p className="text-xs text-muted-foreground">{config.nameCN}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums">{percentage}</p>
            <p className="text-xs text-muted-foreground">效用值</p>
          </div>
        </div>
      </div>
    </div>
  );
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
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>{item}</span>
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
  compact = false,
  showDetails = true,
  title = '协商结论',
  className,
}: NegotiationResultCardProps) {
  const decisionConfig = DECISION_CONFIG[result.decision] || DECISION_CONFIG.NEEDS_HUMAN;

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
              <CardDescription>三守护者协商评估结果</CardDescription>
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

        {/* 守护者评估 */}
        <div className="mb-4">
          <p className="text-sm font-medium mb-3">守护者评估</p>
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
        {showDetails && (
          <Accordion type="single" collapsible className="w-full">
            {/* 关键权衡 */}
            {result.keyTradeoffs && result.keyTradeoffs.length > 0 && (
              <AccordionItem value="tradeoffs">
                <AccordionTrigger className="text-sm">
                  关键权衡点 ({result.keyTradeoffs.length})
                </AccordionTrigger>
                <AccordionContent>
                  <TradeoffsList tradeoffs={result.keyTradeoffs} title="" />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* 附加条件 */}
            {result.conditions && result.conditions.length > 0 && (
              <AccordionItem value="conditions">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    附加条件 ({result.conditions.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {result.conditions.map((condition, i) => (
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

            {/* 需人工决策点 */}
            {result.humanDecisionPoints && result.humanDecisionPoints.length > 0 && (
              <AccordionItem value="human-decisions">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    需人工决策 ({result.humanDecisionPoints.length})
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

            {/* 关键关注点 */}
            {result.evaluationSummary?.criticalConcerns && result.evaluationSummary.criticalConcerns.length > 0 && (
              <AccordionItem value="concerns">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    关键关注点 ({result.evaluationSummary.criticalConcerns.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {result.evaluationSummary.criticalConcerns.map((concern, i) => (
                      <li 
                        key={i} 
                        className="flex items-start gap-2 p-2 rounded bg-red-50 text-sm text-red-700"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
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
