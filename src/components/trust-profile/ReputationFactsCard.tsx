import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  REPUTATION_FACT_LABELS,
  formatReputationFactValue,
} from '@/lib/reputation-facts-display';
import type { ReputationFacts } from '@/types/identity-governance';

interface ReputationFactsCardProps {
  facts: ReputationFacts;
  className?: string;
}

/** 仅展示可解释事实计数，不计算综合信用分 */
export function ReputationFactsCard({ facts, className }: ReputationFactsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">声誉事实</CardTitle>
        <CardDescription>
          基于可验证项目事件的计数摘要；不展示综合信用分或芝麻分。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {REPUTATION_FACT_LABELS.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <div>
                <dt className="text-sm font-medium">{label}</dt>
                {description && (
                  <dd className="mt-0.5 text-xs text-muted-foreground">{description}</dd>
                )}
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {formatReputationFactValue(key, facts)}
              </Badge>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
