/**
 * 用户决策点确认弹窗
 *
 * 当优化结果需要用户确认时展示。
 *
 * @deprecated 单点 CHOOSE / 扁平选项优先 {@link GuardianChooseModal}；
 * 多题结构化 `userJudgmentPoints` 仍用本组件，写回见 `submitGuardianHumanChoice`。
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { HelpCircle, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

// ==================== 类型 ====================

export interface JudgmentPoint {
  id: string;
  question: string;
  options: string[];
  recommendation: string;
}

export interface JudgmentPointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  judgmentPoints: JudgmentPoint[];
  onConfirm: (decisions: Record<string, string>) => void;
  onCancel?: () => void;
}

// ==================== 子组件 ====================

function JudgmentPointCard({
  point,
  value,
  onChange,
  index,
}: {
  point: JudgmentPoint;
  value: string;
  onChange: (value: string) => void;
  index: number;
}) {
  const recommendedIndex = point.options.findIndex(
    opt => opt.toLowerCase() === point.recommendation.toLowerCase()
  );
  
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-2">
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
          {index + 1}
        </div>
        <div className="space-y-1 flex-1">
          <p className="font-medium text-sm">{point.question}</p>
          {point.recommendation && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              <span>推荐: {point.recommendation}</span>
            </div>
          )}
        </div>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="space-y-2 pl-8"
      >
        {point.options.map((option, optIndex) => {
          const isRecommended = optIndex === recommendedIndex;
          const isSelected = value === option;
          
          return (
            <div
              key={optIndex}
              className={cn(
                'flex items-center space-x-3 rounded-md border p-3 transition-colors cursor-pointer',
                isSelected && 'border-primary bg-primary/5',
                !isSelected && 'hover:bg-muted/50'
              )}
              onClick={() => onChange(option)}
            >
              <RadioGroupItem value={option} id={`${point.id}-${optIndex}`} />
              <Label 
                htmlFor={`${point.id}-${optIndex}`}
                className="flex-1 cursor-pointer text-sm"
              >
                {option}
              </Label>
              {isRecommended && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 text-xs">
                  推荐
                </Badge>
              )}
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

// ==================== 主组件 ====================

export function JudgmentPointDialog({
  open,
  onOpenChange,
  judgmentPoints,
  onConfirm,
  onCancel,
}: JudgmentPointDialogProps) {
  const [decisions, setDecisions] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    judgmentPoints.forEach(point => {
      initial[point.id] = point.recommendation || point.options[0] || '';
    });
    return initial;
  });
  
  React.useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      judgmentPoints.forEach(point => {
        initial[point.id] = point.recommendation || point.options[0] || '';
      });
      setDecisions(initial);
    }
  }, [open, judgmentPoints]);
  
  const handleDecisionChange = React.useCallback((pointId: string, value: string) => {
    setDecisions(prev => ({ ...prev, [pointId]: value }));
  }, []);
  
  const handleConfirm = React.useCallback(() => {
    onConfirm(decisions);
  }, [decisions, onConfirm]);
  
  const handleCancel = React.useCallback(() => {
    onCancel?.();
    onOpenChange(false);
  }, [onCancel, onOpenChange]);
  
  const allAnswered = judgmentPoints.every(point => decisions[point.id]);
  
  const nonRecommendedCount = judgmentPoints.filter(point => {
    const recommended = point.recommendation || point.options[0];
    return decisions[point.id] !== recommended;
  }).length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            需要您的确认
          </DialogTitle>
          <DialogDescription>
            优化方案中有 {judgmentPoints.length} 个决策点需要您确认
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4 -mx-6 px-6">
          {judgmentPoints.map((point, index) => (
            <JudgmentPointCard
              key={point.id}
              point={point}
              value={decisions[point.id]}
              onChange={(value) => handleDecisionChange(point.id, value)}
              index={index}
            />
          ))}
        </div>
        
        <Separator />
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {nonRecommendedCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-600 mr-auto">
              <AlertTriangle className="h-3 w-3" />
              <span>您有 {nonRecommendedCount} 项选择与推荐不同</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!allAnswered}
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              确认并应用
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default JudgmentPointDialog;
