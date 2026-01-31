/**
 * 关键决策卡片组件（ToC Lite）
 * 用于预览阶段展示关键决策节点
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { normalizeGateStatus, type GateStatus } from '@/lib/gate-status';
import { cn } from '@/lib/utils';
import { Car, Hotel, MapPin, Calendar, DollarSign, type LucideIcon } from 'lucide-react';
import type { DecisionStep } from '@/types/decision-draft';

export interface KeyDecisionCardProps {
  step: DecisionStep;
  onClick?: () => void;
  className?: string;
}

// 决策类型图标映射
const DECISION_TYPE_ICONS: Record<string, LucideIcon> = {
  'transport': Car,
  'accommodation': Hotel,
  'poi': MapPin,
  'schedule': Calendar,
  'budget': DollarSign,
};

// 获取决策类型图标
function getDecisionIcon(type: string): LucideIcon {
  const normalizedType = type.toLowerCase();
  for (const [key, icon] of Object.entries(DECISION_TYPE_ICONS)) {
    if (normalizedType.includes(key)) {
      return icon;
    }
  }
  return MapPin; // 默认图标
}

// 格式化置信度显示
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// 获取决策结论（简化版）
function getDecisionConclusion(step: DecisionStep): string {
  // 从 outputs 中提取结论，如果没有则使用 title
  if (step.outputs && step.outputs.length > 0) {
    const firstOutput = step.outputs[0];
    if (typeof firstOutput === 'string') {
      return firstOutput;
    }
    if (typeof firstOutput === 'object' && firstOutput.value) {
      return String(firstOutput.value);
    }
  }
  return step.title;
}

export default function KeyDecisionCard({ step, onClick, className }: KeyDecisionCardProps) {
  const IconComponent = getDecisionIcon(step.type);
  const gateStatus = normalizeGateStatus(step.status);
  const confidence = formatConfidence(step.confidence);
  const conclusion = getDecisionConclusion(step);

  return (
    <Card
      className={cn(
        'w-full min-h-[120px] max-h-[180px] cursor-pointer transition-all hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <IconComponent className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-2">
              {step.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">建议：</span>
          <span className="font-medium ml-1">{conclusion}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">置信度：</span>
          <span className="font-medium ml-1">{confidence}</span>
        </div>
        <GateStatusBanner status={gateStatus} size="sm" />
        <Button variant="outline" size="sm" className="w-full mt-2">
          查看详情
        </Button>
      </CardContent>
    </Card>
  );
}
