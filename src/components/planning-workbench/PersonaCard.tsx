import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import type {
  AbuPersonaOutput,
  DrDrePersonaOutput,
  NeptunePersonaOutput,
  EvidenceItem,
  RecommendationItem,
} from '@/api/planning-workbench';
import { cn } from '@/lib/utils';
import {
  getGateStatusIcon,
  getGateStatusLabel,
  getGateStatusClasses,
  normalizeGateStatus,
} from '@/lib/gate-status';
import {
  getPersonaIcon,
  getPersonaIconColorClasses,
} from '@/lib/persona-icons';

type PersonaOutput = AbuPersonaOutput | DrDrePersonaOutput | NeptunePersonaOutput;

interface PersonaCardProps {
  persona: PersonaOutput | null;
  className?: string;
  /** 应用建议的回调（仅 Neptune） */
  onApplyRecommendation?: (recommendation: RecommendationItem, index: number) => Promise<void>;
  /** 是否显示应用按钮（默认 true） */
  showApplyButton?: boolean;
}

export default function PersonaCard({ 
  persona, 
  className,
  onApplyRecommendation,
  showApplyButton = true,
}: PersonaCardProps) {
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [appliedIndices, setAppliedIndices] = useState<Set<number>>(new Set());

  if (!persona) {
    return null;
  }

  // 处理应用建议
  const handleApplyRecommendation = async (rec: RecommendationItem, index: number) => {
    if (!onApplyRecommendation || applyingIndex !== null) return;
    
    setApplyingIndex(index);
    try {
      await onApplyRecommendation(rec, index);
      setAppliedIndices(prev => new Set(prev).add(index));
    } finally {
      setApplyingIndex(null);
    }
  };

  // 标准化状态（支持旧状态映射：ADJUST/REPLACE -> SUGGEST_REPLACE）
  const normalizedStatus = normalizeGateStatus(persona.verdict);
  
  // 获取状态配置
  const StatusIcon = getGateStatusIcon(normalizedStatus);
  const statusLabel = getGateStatusLabel(normalizedStatus);
  const statusClasses = getGateStatusClasses(normalizedStatus);
  
  // 是否是 Neptune（Neptune 的建议可以一键应用）
  const isNeptune = persona.persona === 'NEPTUNE';
  const canApply = isNeptune && showApplyButton && onApplyRecommendation;

  // 获取三人格图标（使用符号系统而非 Emoji）
  const PersonaIcon = getPersonaIcon(persona.persona);
  const personaIconColorClasses = getPersonaIconColorClasses(persona.persona);

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PersonaIcon className={cn('w-8 h-8 flex-shrink-0', personaIconColorClasses)} />
            <div>
              <CardTitle className="text-lg font-semibold">
                {persona.persona === 'ABU' ? 'Abu' : persona.persona === 'DR_DRE' ? 'Dr.Dre' : 'Neptune'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{persona.slogan}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn('flex items-center gap-1.5 px-3 py-1', statusClasses)}
          >
            <StatusIcon className="w-4 h-4" />
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* 解释说明 */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {persona.explanation}
          </p>
        </div>

        {/* 证据列表 */}
        {persona.evidence && persona.evidence.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">证据</h4>
            <div className="space-y-2">
              {persona.evidence.map((evidence: EvidenceItem, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 min-w-[60px]">
                      {evidence.source}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{evidence.excerpt}</p>
                      {evidence.relevance && (
                        <p className="text-xs text-gray-500 mt-1">
                          相关性：{evidence.relevance}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 推荐建议 */}
        {persona.recommendations && persona.recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">
              {isNeptune ? '替代方案' : '建议'}
            </h4>
            <div className="space-y-2">
              {persona.recommendations.map((rec: RecommendationItem, index: number) => {
                const isApplying = applyingIndex === index;
                const isApplied = appliedIndices.has(index);
                const isDisabled = applyingIndex !== null || isApplied;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      isNeptune 
                        ? 'bg-purple-50 border-purple-200 hover:border-purple-300'
                        : 'bg-blue-50 border-blue-200',
                      isApplied && 'bg-green-50 border-green-200'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <ArrowRight className={cn(
                        'w-4 h-4 mt-0.5 flex-shrink-0',
                        isNeptune ? 'text-purple-600' : 'text-blue-600',
                        isApplied && 'text-green-600'
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          'text-sm font-medium',
                          isNeptune ? 'text-purple-900' : 'text-blue-900',
                          isApplied && 'text-green-900'
                        )}>
                          {rec.action}
                        </p>
                        <p className={cn(
                          'text-xs mt-1',
                          isNeptune ? 'text-purple-700' : 'text-blue-700',
                          isApplied && 'text-green-700'
                        )}>
                          {rec.reason}
                        </p>
                        {rec.impact && (
                          <p className={cn(
                            'text-xs mt-1 italic',
                            isNeptune ? 'text-purple-600' : 'text-blue-600',
                            isApplied && 'text-green-600'
                          )}>
                            影响：{rec.impact}
                          </p>
                        )}
                        
                        {/* 应用按钮（仅 Neptune） */}
                        {canApply && (
                          <div className="mt-2 flex justify-end">
                            {isApplied ? (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                已应用
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className={cn(
                                  'h-7 text-xs',
                                  'border-purple-300 text-purple-700 hover:bg-purple-100'
                                )}
                                disabled={isDisabled}
                                onClick={() => handleApplyRecommendation(rec, index)}
                              >
                                {isApplying ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    应用中...
                                  </>
                                ) : (
                                  '应用此建议'
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Abu 特有的确认项 */}
        {'confirmations' in persona && persona.confirmations && persona.confirmations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-900">需要确认</h4>
            <ul className="space-y-1">
              {persona.confirmations.map((confirmation: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">•</span>
                  <span>{confirmation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
