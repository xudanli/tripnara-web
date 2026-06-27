/**
 * 合规规则卡片组件
 *
 * 显示行程的签证和交通合规信息
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRag } from '@/hooks';
import type { ExtractComplianceRulesResponse } from '@/api/rag';
import { Shield, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribePlanStudioConstraintsChanged } from '@/lib/plan-studio-constraints-events';
import { isRagDecisionContextError, mapRagUserMessage } from '@/lib/rag-error-map';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ComplianceRulesCardProps {
  tripId: string;
  /** execute uiOutput.decisionContext.planId，供 RAG 决策上下文 */
  planId?: string | null;
  countryCodes: string[];
  ruleTypes?: ('VISA' | 'TRANSPORT' | 'ENTRY' | 'EXIT')[];
  className?: string;
  /** 决策上下文缺失时引导用户完善约束 */
  onOpenConstraints?: () => void;
}

export default function ComplianceRulesCard({
  tripId,
  planId,
  countryCodes,
  ruleTypes,
  className,
  onOpenConstraints,
}: ComplianceRulesCardProps) {
  const { extractComplianceRules, loading, error } = useRag();
  const [rules, setRules] = useState<ExtractComplianceRulesResponse | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComplianceRules();
  }, [tripId, countryCodes.join(',')]);

  useEffect(() => {
    return subscribePlanStudioConstraintsChanged((detail) => {
      if (detail.tripId === tripId) {
        void loadComplianceRules();
      }
    });
  }, [tripId]);

  const loadComplianceRules = async () => {
    const result = await extractComplianceRules({
      tripId,
      ...(planId ? { planId } : {}),
      countryCodes,
      ruleTypes,
    });
    if (result) {
      setRules(result);
      const categories = new Set(result.checklist.map((c) => c.category));
      setExpandedCategories(categories);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const showDecisionContextHint =
    !!error &&
    (isRagDecisionContextError(undefined, error) ||
      error.includes('决策上下文') ||
      error.includes('decision_context'));

  if (loading && !rules) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Spinner className="w-5 h-5" />
            <span className="ml-2 text-sm text-muted-foreground">加载合规规则...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !rules) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm sm:text-base font-semibold">合规规则清单</CardTitle>
          </div>
          <CardDescription className="text-xs mt-0.5">
            参考信息，不影响方案预览与提交
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          <Alert className="border-amber-200 bg-amber-50/60">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900">
              {mapRagUserMessage(
                error.includes('rag_') ? error : undefined,
                error,
              )}
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadComplianceRules} disabled={loading}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
              重试
            </Button>
            {showDecisionContextHint && onOpenConstraints && (
              <Button variant="secondary" size="sm" onClick={onOpenConstraints}>
                去完善约束
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rules) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm sm:text-base font-semibold">合规规则清单</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadComplianceRules}
            disabled={loading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
        <CardDescription className="text-xs mt-0.5">
          {rules.summary.totalRules} 条规则 • {rules.summary.totalChecklistItems} 个检查项
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">{rules.summary.totalRules}</div>
            <div className="text-xs text-muted-foreground">总规则数</div>
          </div>
          <div className="p-2.5 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">{rules.summary.totalChecklistItems}</div>
            <div className="text-xs text-muted-foreground">检查项</div>
          </div>
        </div>

        {rules.checklist && rules.checklist.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold">合规清单</h4>
            {rules.checklist.map((category, categoryIndex) => (
              <Collapsible
                key={categoryIndex}
                open={expandedCategories.has(category.category)}
                onOpenChange={() => toggleCategory(category.category)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{category.category}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {category.items.length} 项
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1.5 space-y-1.5 pl-3">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={cn(
                          'p-2 rounded-lg border',
                          item.required
                            ? 'bg-destructive/5 border-destructive/20'
                            : 'bg-muted/30 border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              {item.required ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <p className="text-xs">{item.description}</p>
                            </div>
                            {item.deadline && (
                              <div className="mt-0.5 text-xs text-muted-foreground ml-5">
                                截止日期: {item.deadline}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {item.source}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        <div className="pt-2.5 border-t">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground">涉及国家:</span>
            {rules.countryCodes.map((code) => (
              <Badge key={code} variant="outline" className="text-xs px-1.5 py-0">
                {code}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
