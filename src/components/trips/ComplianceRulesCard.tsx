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
import { useRag } from '@/hooks';
import type { ExtractComplianceRulesResponse } from '@/api/rag';
import { Shield, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ComplianceRulesCardProps {
  tripId: string;
  countryCodes: string[];
  ruleTypes?: ('VISA' | 'TRANSPORT' | 'ENTRY' | 'EXIT')[];
  className?: string;
}

export default function ComplianceRulesCard({
  tripId,
  countryCodes,
  ruleTypes,
  className,
}: ComplianceRulesCardProps) {
  const { extractComplianceRules, loading, error } = useRag();
  const [rules, setRules] = useState<ExtractComplianceRulesResponse | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadComplianceRules();
  }, [tripId, countryCodes.join(',')]);

  const loadComplianceRules = async () => {
    const result = await extractComplianceRules({
      tripId,
      countryCodes,
      ruleTypes,
    });
    if (result) {
      setRules(result);
      // 默认展开所有分类
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

  if (loading && !rules) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Spinner className="w-6 h-6" />
            <span className="ml-2 text-sm text-muted-foreground">加载合规规则...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !rules) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-destructive">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="text-sm">加载失败: {error}</span>
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>合规规则清单</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadComplianceRules}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        </div>
        <CardDescription>
          {rules.summary.totalRules} 条规则 • {rules.summary.totalChecklistItems} 个检查项
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 摘要 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{rules.summary.totalRules}</div>
            <div className="text-xs text-muted-foreground">总规则数</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{rules.summary.totalChecklistItems}</div>
            <div className="text-xs text-muted-foreground">检查项</div>
          </div>
        </div>

        {/* 合规清单 */}
        {rules.checklist && rules.checklist.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">合规清单</h4>
            {rules.checklist.map((category, categoryIndex) => (
              <Collapsible
                key={categoryIndex}
                open={expandedCategories.has(category.category)}
                onOpenChange={() => toggleCategory(category.category)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">{category.category}</span>
                      <Badge variant="secondary" className="text-xs">
                        {category.items.length} 项
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 pl-4">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={cn(
                          'p-3 rounded-lg border',
                          item.required
                            ? 'bg-destructive/5 border-destructive/20'
                            : 'bg-muted/30 border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {item.required ? (
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                              )}
                              <p className="text-sm">{item.description}</p>
                            </div>
                            {item.deadline && (
                              <div className="mt-1 text-xs text-muted-foreground ml-6">
                                截止日期: {item.deadline}
                              </div>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">
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

        {/* 国家代码 */}
        <div className="pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">涉及国家:</span>
            {rules.countryCodes.map((code) => (
              <Badge key={code} variant="outline" className="text-xs">
                {code}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
