/**
 * 决策矩阵结果卡片组件
 * 显示最终的决策结果和建议
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  XCircle,
  Target,
  HelpCircle,
} from 'lucide-react';
import type { DecisionResult, DecisionType } from '@/types/trip';
import { cn } from '@/lib/utils';

interface DecisionMatrixCardProps {
  decisionResult: DecisionResult;
  destinationName?: string;
  onContinue?: () => void;
  onAlternative?: () => void;
  onCancel?: () => void;
  onConsultExpert?: () => void;
  className?: string;
}

// 决策类型配置
const DECISION_CONFIG: Record<DecisionType, {
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  description: string;
}> = {
  GO_FULLY_SUPPORTED: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    title: '完全支持',
    description: '用户完全适合，鼓励前往',
  },
  GO_WITH_STRONG_CAUTION: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    title: '需要特别指导',
    description: '建议在专业指导下进行',
  },
  GO_ALTERNATIVE_PLAN: {
    icon: Lightbulb,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    title: '推荐替代方案',
    description: '建议选择更适合的方案',
  },
  STRONGLY_RECONSIDER: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    title: '强烈建议重新考虑',
    description: '存在较大风险，建议调整计划',
  },
  NOT_RECOMMENDED: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    title: '不推荐',
    description: '风险过高，不建议前往',
  },
};

export default function DecisionMatrixCard({
  decisionResult,
  destinationName,
  onContinue,
  onAlternative,
  onCancel,
  onConsultExpert,
  className,
}: DecisionMatrixCardProps) {
  const config = DECISION_CONFIG[decisionResult.decision];
  const Icon = config.icon;
  
  return (
    <Card className={cn('border-2', config.borderColor, config.bgColor, className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-600" />
          <span>行程适合度评估</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 决策结果 */}
        <div className="flex items-start gap-3">
          <Icon className={cn('h-6 w-6 flex-shrink-0 mt-0.5', config.color)} />
          <div className="flex-1">
            <h3 className={cn('text-lg font-semibold mb-1', config.color)}>
              {config.title}
            </h3>
            <p className="text-sm text-slate-700 mb-2">
              {config.description}
            </p>
            {decisionResult.reason && (
              <p className="text-sm text-slate-600">
                {decisionResult.reason}
              </p>
            )}
          </div>
        </div>
        
        {/* 建议列表 */}
        {decisionResult.recommendations && decisionResult.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">建议：</h4>
            <ul className="space-y-1.5">
              {decisionResult.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className={cn('mt-0.5', config.color)}>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {decisionResult.decision === 'GO_FULLY_SUPPORTED' && onContinue && (
            <Button onClick={onContinue} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              创建行程
            </Button>
          )}
          
          {decisionResult.decision === 'GO_WITH_STRONG_CAUTION' && (
            <>
              <Button variant="outline" onClick={onAlternative} className="flex-1">
                <HelpCircle className="h-4 w-4 mr-1" />
                查看详细建议
              </Button>
              {onContinue && (
                <Button onClick={onContinue} variant="secondary" className="flex-1">
                  创建行程（需确认）
                </Button>
              )}
            </>
          )}
          
          {decisionResult.decision === 'GO_ALTERNATIVE_PLAN' && (
            <>
              <Button onClick={onAlternative} className="flex-1">
                <Lightbulb className="h-4 w-4 mr-1" />
                查看替代方案
              </Button>
              {onContinue && (
                <Button variant="outline" onClick={onContinue} className="flex-1">
                  继续原计划
                </Button>
              )}
            </>
          )}
          
          {decisionResult.decision === 'STRONGLY_RECONSIDER' && (
            <>
              <Button variant="outline" onClick={onAlternative} className="flex-1">
                <HelpCircle className="h-4 w-4 mr-1" />
                查看建议
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                延期计划
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                改目的地
              </Button>
            </>
          )}
          
          {decisionResult.decision === 'NOT_RECOMMENDED' && (
            <>
              <Button variant="outline" onClick={onAlternative} className="flex-1">
                <HelpCircle className="h-4 w-4 mr-1" />
                查看原因
              </Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">
                改目的地
              </Button>
              {onConsultExpert && (
                <Button variant="outline" onClick={onConsultExpert} className="flex-1">
                  <HelpCircle className="h-4 w-4 mr-1" />
                  咨询专家
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
