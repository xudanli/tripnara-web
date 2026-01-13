import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';
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

type PersonaOutput = AbuPersonaOutput | DrDrePersonaOutput | NeptunePersonaOutput;

interface PersonaCardProps {
  persona: PersonaOutput | null;
  className?: string;
}

export default function PersonaCard({ persona, className }: PersonaCardProps) {
  if (!persona) {
    return null;
  }

  // 标准化状态（支持旧状态映射：ADJUST/REPLACE -> SUGGEST_REPLACE）
  const normalizedStatus = normalizeGateStatus(persona.verdict);
  
  // 获取状态配置
  const StatusIcon = getGateStatusIcon(normalizedStatus);
  const statusLabel = getGateStatusLabel(normalizedStatus);
  const statusClasses = getGateStatusClasses(normalizedStatus);

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{persona.icon}</span>
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
            <h4 className="text-sm font-semibold text-gray-900">建议</h4>
            <div className="space-y-2">
              {persona.recommendations.map((rec: RecommendationItem, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">{rec.action}</p>
                      <p className="text-xs text-blue-700 mt-1">{rec.reason}</p>
                      {rec.impact && (
                        <p className="text-xs text-blue-600 mt-1 italic">影响：{rec.impact}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
