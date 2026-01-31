/**
 * 草案级别解释视图组件
 * 使用 getExplanation API 显示整个草案的解释
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { decisionDraftApi } from '@/api/decision-draft';
import type { DecisionExplanation, UserMode } from '@/types/decision-draft';
import { FileText } from 'lucide-react';

export interface DraftExplanationViewProps {
  draftId: string;
  userMode: UserMode;
}

export default function DraftExplanationView({
  draftId,
  userMode,
}: DraftExplanationViewProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draftId) {
      loadExplanation();
    }
  }, [draftId, userMode]);

  const loadExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getExplanation(draftId, userMode);
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || '加载解释失败');
      console.error('Failed to load explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!explanation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">暂无解释数据</div>
        </CardContent>
      </Card>
    );
  }

  // ToC模式
  if (userMode === 'toc' && 'summary' in explanation && 'key_decisions' in explanation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              决策摘要
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{explanation.summary}</p>
          </CardContent>
        </Card>

        {explanation.key_decisions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>关键决策 ({explanation.key_decisions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {explanation.key_decisions.map((decision) => (
                  <div key={decision.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{decision.title}</div>
                    {decision.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {decision.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Expert/Studio模式
  if ('decision_steps' in explanation) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              决策解释
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{explanation.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>决策步骤 ({explanation.decision_steps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {explanation.decision_steps.map((step) => (
                <div key={step.id} className="p-3 border rounded-lg">
                  <div className="font-medium">{step.title}</div>
                  {step.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
