import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InfeasibilityExplanation, InfeasibilityReason } from '@/types/constraints';

interface InfeasibilityExplanationCardProps {
  explanation: InfeasibilityExplanation;
  onFix?: (reason: InfeasibilityReason) => void;
  className?: string;
}

export default function InfeasibilityExplanationCard({
  explanation,
  onFix,
  className,
}: InfeasibilityExplanationCardProps) {
  if (explanation.feasible) return null;

  return (
    <Card className={cn('border-gate-reject-border bg-gate-reject', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 text-gate-reject-foreground" />
          方案不可行
        </CardTitle>
        <CardDescription>{explanation.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {explanation.reasons.map((reason, index) => (
          <div
            key={index}
            className="p-3 bg-white rounded-lg border border-gate-reject-border"
          >
            <div className="flex items-start gap-2 mb-2">
              <Badge variant="destructive">{reason.constraint}</Badge>
              <div className="flex-1">
                <p className="font-medium text-gate-reject-foreground">{reason.description}</p>
                {reason.affected_activities.length > 0 && (
                  <p className="text-xs text-gate-reject-foreground mt-1">
                    受影响活动：{reason.affected_activities.length} 个
                  </p>
                )}
              </div>
            </div>
            {reason.fix_suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">修复建议：</p>
                <div className="space-y-1">
                  {reason.fix_suggestions.map((suggestion, sugIndex) => (
                    <Button
                      key={sugIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 border-gate-reject-border text-gate-reject-foreground hover:bg-gate-reject"
                      onClick={() => onFix?.(reason)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
