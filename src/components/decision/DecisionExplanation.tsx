/**
 * 决策解释组件
 * 展示决策引擎的推荐解释，包括关键因素、权衡、约束和风险评估
 */

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Shield,
  Star,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import type { DetailedExplanation, KeyFactor } from '@/types/decision-engine';

interface DecisionExplanationProps {
  explanation: DetailedExplanation;
  className?: string;
  showFullDetails?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  '🛡️': <Shield className="h-4 w-4" />,
  '⭐': <Star className="h-4 w-4" />,
  '⏱️': <Clock className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
  clock: <Clock className="h-4 w-4" />,
};

function getFactorIcon(factor: KeyFactor['name'] | string, icon?: string): React.ReactNode {
  if (icon && iconMap[icon]) {
    return iconMap[icon];
  }
  
  const name = factor.toLowerCase();
  if (name.includes('安全') || name.includes('safety')) {
    return <Shield className="h-4 w-4" />;
  }
  if (name.includes('体验') || name.includes('experience')) {
    return <Star className="h-4 w-4" />;
  }
  if (name.includes('时间') || name.includes('time')) {
    return <Clock className="h-4 w-4" />;
  }
  return <Info className="h-4 w-4" />;
}

function KeyFactorCard({ factor }: { factor: DetailedExplanation['keyFactors'][0] }) {
  const importance = parseFloat(factor.importance.replace('%', ''));
  const value = parseFloat(factor.value);
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        {getFactorIcon(factor.name, factor.icon)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{factor.name}</span>
          <Badge variant="secondary" className="text-xs">
            {factor.importance}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
        <div className="mt-2">
          <Progress value={value * 100} className="h-1.5" />
        </div>
      </div>
    </div>
  );
}

function TradeoffCard({ tradeoff }: { tradeoff: DetailedExplanation['tradeoffs'][0] }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{tradeoff.dimensions}</p>
        <p className="text-xs text-muted-foreground mt-1">{tradeoff.explanation}</p>
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {tradeoff.recommendation}
        </p>
      </div>
    </div>
  );
}

function ConstraintCard({ constraint }: { constraint: DetailedExplanation['constraints'][0] }) {
  const statusConfig = {
    satisfied: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      bg: 'bg-green-100',
      text: 'text-green-600',
      label: '已满足',
    },
    violated: {
      icon: <XCircle className="h-4 w-4" />,
      bg: 'bg-red-100',
      text: 'text-red-600',
      label: '未满足',
    },
    not_applicable: {
      icon: <Info className="h-4 w-4" />,
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      label: '不适用',
    },
  };
  
  const config = statusConfig[constraint.status];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', config.bg, config.text)}>
        {config.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{constraint.name}</span>
          <Badge variant={constraint.status === 'satisfied' ? 'default' : 'secondary'} className="text-xs">
            {config.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{constraint.explanation}</p>
      </div>
    </div>
  );
}

function RiskSection({ riskAssessment }: { riskAssessment: DetailedExplanation['riskAssessment'] }) {
  const levelConfig = {
    low: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      label: '低风险',
    },
    medium: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      label: '中等风险',
    },
    high: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      label: '高风险',
    },
  };
  
  const config = levelConfig[riskAssessment.level];
  
  return (
    <div className={cn('p-4 rounded-lg border', config.border, config.bg)}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className={cn('h-5 w-5', config.text)} />
        <span className={cn('font-semibold', config.text)}>{config.label}</span>
      </div>
      <p className="text-sm">{riskAssessment.summary}</p>
      {riskAssessment.factors.length > 0 && (
        <ul className="mt-3 space-y-2">
          {riskAssessment.factors.map((factor, idx) => (
            <li key={idx} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              <span>
                <strong>{factor.name}</strong>: {factor.description}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecommendationSection({ recommendation }: { recommendation: DetailedExplanation['recommendation'] }) {
  return (
    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-primary" />
        <span className="font-semibold text-primary">{recommendation.action}</span>
      </div>
      
      {recommendation.reasoning.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">推荐理由</p>
          <ul className="space-y-1">
            {recommendation.reasoning.map((reason, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {recommendation.caveats.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">注意事项</p>
          <ul className="space-y-1">
            {recommendation.caveats.map((caveat, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>{caveat}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {recommendation.nextSteps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">下一步行动</p>
          <ul className="space-y-1">
            {recommendation.nextSteps.map((step, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DecisionExplanation({
  explanation,
  className,
  showFullDetails = true,
}: DecisionExplanationProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          决策解释
        </CardTitle>
        <p className="text-sm text-muted-foreground">{explanation.summary}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 关键因素 */}
        <div>
          <h4 className="text-sm font-semibold mb-3">关键决策因素</h4>
          <div className="grid gap-2">
            {explanation.keyFactors.map((factor, idx) => (
              <KeyFactorCard key={idx} factor={factor} />
            ))}
          </div>
        </div>
        
        {showFullDetails && (
          <Accordion type="single" collapsible className="w-full">
            {/* 权衡分析 */}
            {explanation.tradeoffs.length > 0 && (
              <AccordionItem value="tradeoffs">
                <AccordionTrigger className="text-sm font-semibold">
                  权衡分析 ({explanation.tradeoffs.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2 pt-2">
                    {explanation.tradeoffs.map((tradeoff, idx) => (
                      <TradeoffCard key={idx} tradeoff={tradeoff} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {/* 约束检查 */}
            {explanation.constraints.length > 0 && (
              <AccordionItem value="constraints">
                <AccordionTrigger className="text-sm font-semibold">
                  约束检查 ({explanation.constraints.length})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2 pt-2">
                    {explanation.constraints.map((constraint, idx) => (
                      <ConstraintCard key={idx} constraint={constraint} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {/* 风险评估 */}
            <AccordionItem value="risk">
              <AccordionTrigger className="text-sm font-semibold">
                风险评估
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2">
                  <RiskSection riskAssessment={explanation.riskAssessment} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* 推荐行动 */}
        <RecommendationSection recommendation={explanation.recommendation} />
      </CardContent>
    </Card>
  );
}

export default DecisionExplanation;
