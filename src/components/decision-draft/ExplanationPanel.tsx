/**
 * 解释面板组件
 * 显示决策步骤的解释信息（ToC/Expert/Studio模式）
 */

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { decisionDraftApi } from '@/api/decision-draft';
import type {
  DecisionStep,
  DecisionExplanation,
  TocExplanation,
  ExpertExplanation,
  StudioExplanation,
  UserMode,
} from '@/types/decision-draft';
import { X, FileText, Brain, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExplanationPanelProps {
  draftId: string;
  stepId: string;
  userMode: UserMode;
  open: boolean;
  onClose?: () => void;
}

export default function ExplanationPanel({
  draftId,
  stepId,
  userMode,
  open,
  onClose,
}: ExplanationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && draftId && stepId) {
      loadExplanation();
    }
  }, [open, draftId, stepId]);

  const loadExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getStepExplanation(draftId, stepId);
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || '加载解释失败');
      console.error('Failed to load explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  const tocExplanation = explanation as TocExplanation | null;
  const expertExplanation = explanation as ExpertExplanation | null;
  const studioExplanation = explanation as StudioExplanation | null;

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose?.()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>决策解释</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        )}

        {error && (
          <div className="p-4 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && explanation && (
          <div className="mt-6 space-y-6">
            {/* ToC模式：自然语言摘要 */}
            {userMode === 'toc' && tocExplanation && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      摘要
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{tocExplanation.summary}</p>
                  </CardContent>
                </Card>

                {/* 关键决策 */}
                {tocExplanation.key_decisions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        关键决策 ({tocExplanation.key_decisions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tocExplanation.key_decisions.map((decision) => (
                        <div
                          key={decision.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium">{decision.title}</div>
                          {decision.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {decision.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* 关键证据 */}
                {tocExplanation.key_evidence.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">关键证据</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tocExplanation.key_evidence.map((evidence) => (
                        <div
                          key={evidence.evidence_id}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium">{evidence.source_title}</div>
                          {evidence.excerpt && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {evidence.excerpt}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              相关性: {Math.round(evidence.relevance * 100)}%
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              置信度: {Math.round(evidence.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Expert模式：完整解释 */}
            {userMode === 'expert' && expertExplanation && (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList>
                  <TabsTrigger value="summary">摘要</TabsTrigger>
                  <TabsTrigger value="decisions">决策步骤</TabsTrigger>
                  <TabsTrigger value="evidence">证据链</TabsTrigger>
                  <TabsTrigger value="log">决策日志</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{expertExplanation.summary}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="decisions" className="space-y-4">
                  <div className="space-y-2">
                    {expertExplanation.decision_steps.map((step) => (
                      <Card key={step.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{step.type}</Badge>
                            <Badge variant="outline">{step.status}</Badge>
                            <Badge variant="outline">
                              置信度: {Math.round(step.confidence * 100)}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-4">
                  <div className="space-y-2">
                    {expertExplanation.evidence_chain.map((evidence) => (
                      <Card key={evidence.evidence_id}>
                        <CardHeader>
                          <CardTitle className="text-base">{evidence.source_title}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">{evidence.excerpt}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              相关性: {Math.round(evidence.relevance * 100)}%
                            </Badge>
                            <Badge variant="outline">
                              置信度: {Math.round(evidence.confidence * 100)}%
                            </Badge>
                          </div>
                          {evidence.source_url && (
                            <a
                              href={evidence.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              查看来源 →
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="log" className="space-y-4">
                  <div className="space-y-2">
                    {expertExplanation.decision_log.map((entry, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{entry.action}</div>
                              {entry.reasoning && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {entry.reasoning}
                                </div>
                              )}
                              {entry.agent && (
                                <Badge variant="outline" className="mt-2">
                                  {entry.agent}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            {/* Studio模式：技术层信息 */}
            {userMode === 'studio' && studioExplanation && (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList>
                  <TabsTrigger value="summary">摘要</TabsTrigger>
                  <TabsTrigger value="llm">LLM调用</TabsTrigger>
                  <TabsTrigger value="skills">Skill调用</TabsTrigger>
                  <TabsTrigger value="performance">性能指标</TabsTrigger>
                  <TabsTrigger value="optimization">优化建议</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{studioExplanation.summary}</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="llm" className="space-y-4">
                  <div className="space-y-2">
                    {studioExplanation.llm_calls.map((call) => (
                      <Card key={call.call_id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{call.model}</span>
                            <div className="flex items-center gap-2">
                              {call.cost && (
                                <Badge variant="outline">${call.cost.toFixed(4)}</Badge>
                              )}
                              {call.latency_ms && (
                                <Badge variant="outline">{call.latency_ms}ms</Badge>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="text-sm font-medium mb-1">Prompt:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {call.prompt}
                            </pre>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Response:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {call.response}
                            </pre>
                          </div>
                          {call.tokens_used && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Prompt: {call.tokens_used.prompt}</span>
                              <span>Completion: {call.tokens_used.completion}</span>
                              <span>Total: {call.tokens_used.total}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="skills" className="space-y-4">
                  <div className="space-y-2">
                    {studioExplanation.skill_calls.map((call) => (
                      <Card key={call.call_id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{call.skill_name}</span>
                            <div className="flex items-center gap-2">
                              {call.success ? (
                                <Badge variant="outline" className="bg-green-500">
                                  成功
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500">
                                  失败
                                </Badge>
                              )}
                              {call.latency_ms && (
                                <Badge variant="outline">{call.latency_ms}ms</Badge>
                              )}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="text-sm font-medium mb-1">Parameters:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(call.parameters, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-1">Response:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(call.response, null, 2)}
                            </pre>
                          </div>
                          {call.error && (
                            <div className="text-sm text-destructive">{call.error}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        性能指标
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">生成时间</div>
                          <div className="text-lg font-semibold">
                            {studioExplanation.performance_metrics.generation_time_ms}ms
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">执行时间</div>
                          <div className="text-lg font-semibold">
                            {studioExplanation.performance_metrics.execution_time_ms}ms
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">成功率</div>
                          <div className="text-lg font-semibold">
                            {Math.round(studioExplanation.performance_metrics.success_rate * 100)}%
                          </div>
                        </div>
                        {studioExplanation.performance_metrics.total_cost_usd && (
                          <div>
                            <div className="text-sm text-muted-foreground">总成本</div>
                            <div className="text-lg font-semibold">
                              ${studioExplanation.performance_metrics.total_cost_usd.toFixed(4)}
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-sm text-muted-foreground">LLM调用次数</div>
                          <div className="text-lg font-semibold">
                            {studioExplanation.performance_metrics.llm_calls_count}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Skill调用次数</div>
                          <div className="text-lg font-semibold">
                            {studioExplanation.performance_metrics.skill_calls_count}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="optimization" className="space-y-4">
                  {studioExplanation.optimization_suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {studioExplanation.optimization_suggestions.map((suggestion, index) => (
                        <Card key={index}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-2">
                              <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
                              <p className="text-sm">{suggestion}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">暂无优化建议</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
