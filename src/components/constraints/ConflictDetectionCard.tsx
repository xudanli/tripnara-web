import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conflict } from '@/types/constraints';
import ConflictFeedbackCard from '@/components/feedback/ConflictFeedbackCard';

interface ConflictDetectionCardProps {
  conflicts: Conflict[];
  onResolve?: (conflict: Conflict, option: string) => void;
  runId?: string;
  tripId?: string;
  userId?: string;
  className?: string;
}

export default function ConflictDetectionCard({
  conflicts,
  onResolve,
  runId,
  tripId,
  userId,
  className,
}: ConflictDetectionCardProps) {
  const [showFeedback, setShowFeedback] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});

  if (conflicts.length === 0) return null;

  const handleResolve = (conflict: Conflict, option: string, index: number) => {
    setSelectedOptions(prev => ({ ...prev, [index]: option }));
    onResolve?.(conflict, option);
  };

  const getConflictId = (conflict: Conflict, index: number): string => {
    // 尝试从 details 中获取 ID，否则使用索引生成
    return conflict.details?.id || `conflict_${index}_${Date.now()}`;
  };

  const getConflictType = (conflict: Conflict): string => {
    return conflict.between.join(' vs ');
  };

  const getSeverityVariant = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityLabel = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'critical':
        return '严重';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '未知';
    }
  };

  return (
    <Card className={cn('border-yellow-300 bg-yellow-50', className)}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          检测到约束冲突
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conflicts.map((conflict, index) => (
          <div
            key={index}
            className="p-3 bg-white rounded-lg border border-yellow-200"
          >
            <div className="flex items-start gap-2 mb-2">
              <Badge variant={getSeverityVariant(conflict.severity)}>
                {getSeverityLabel(conflict.severity)}
              </Badge>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{conflict.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  冲突约束：{conflict.between.join(' vs ')}
                </p>
              </div>
            </div>
            {conflict.tradeoff_options.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">权衡选项：</p>
                <div className="space-y-1">
                  {conflict.tradeoff_options.map((option, optIndex) => (
                    <Button
                      key={optIndex}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleResolve(conflict, option, index)}
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* 反馈入口 */}
            {runId && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setShowFeedback(showFeedback === index ? null : index)}
                >
                  <MessageSquare className="w-3 h-3 mr-2" />
                  {showFeedback === index ? '隐藏反馈' : '提供反馈'}
                </Button>
                {showFeedback === index && (
                  <div className="mt-2">
                    <ConflictFeedbackCard
                      runId={runId}
                      conflictId={getConflictId(conflict, index)}
                      conflictType={getConflictType(conflict)}
                      tradeoffOptions={conflict.tradeoff_options}
                      tripId={tripId}
                      userId={userId}
                      onSubmitted={() => setShowFeedback(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
