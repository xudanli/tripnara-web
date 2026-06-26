import { Link } from 'react-router-dom';
import { ArrowRight, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfidenceBadge } from './ConfidenceBadge';
import { advisorRoutes } from '@/lib/advisor-routes';
import { cn } from '@/lib/utils';
import {
  gate1TrustDataSourceKindLabel,
  gate1TrustSubjectTypeLabel,
  parseTrustConfidenceLevel,
} from '@/lib/gate1-trust-display';
import type { Gate1TrustCard, Gate1TrustCardSubjectType } from '@/types/decision-os';

export type TrustCardProps = {
  card: Gate1TrustCard;
  variant?: 'advisor' | 'participant';
  className?: string;
  /** 顾问端：跳转对应 Tab */
  projectId?: string;
  onAlternativeClick?: (alternativeId: string) => void;
};

function trustCardSubjectTab(subjectType: Gate1TrustCardSubjectType): string {
  switch (subjectType) {
    case 'CANDIDATE':
      return 'candidates';
    case 'PLAN_B':
      return 'plan-b';
    case 'DECISION':
      return 'decision';
  }
}

export function TrustCard({
  card,
  variant = 'advisor',
  className,
  projectId,
  onAlternativeClick,
}: TrustCardProps) {
  const isParticipant = variant === 'participant';
  const dataSources = isParticipant
    ? card.dataSources.filter((src) => src.kind !== 'ADVISOR')
    : card.dataSources;
  const subjectTab = trustCardSubjectTab(card.subjectType);

  return (
    <Card
      className={cn('overflow-hidden', className)}
      data-subject={card.subjectType}
      aria-label={card.title}
    >
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {gate1TrustSubjectTypeLabel(card.subjectType)}
            </p>
            <CardTitle className="text-base leading-snug">{card.title}</CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1">
            <ConfidenceBadge level={card.confidence.level} score={card.confidence.score} />
            <p className="text-xs text-muted-foreground">
              更新于 {new Date(card.updatedAt).toLocaleString()}
            </p>
            {variant === 'advisor' && projectId && (
              <Button variant="link" size="sm" className="h-auto px-0 text-xs" asChild>
                <Link to={advisorRoutes.project(projectId, subjectTab)}>
                  查看{gate1TrustSubjectTypeLabel(card.subjectType)}
                  <ArrowRight className="ml-0.5 h-3 w-3" />
                </Link>
              </Button>
            )}
          </div>
        </div>
        {card.confidence.rationale && (
          <p className="trust-rationale text-sm text-muted-foreground">{card.confidence.rationale}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {card.causalChain && card.causalChain.length > 0 && (
          <section aria-label="因果链" className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              因果链
            </h4>
            <ol className="space-y-2">
              {card.causalChain.map((step, index) => (
                <li
                  key={`${step.label}-${index}`}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {step.persona ? (
                      <span className="rounded border px-1.5 py-0.5 text-[10px] font-medium">
                        {step.persona}
                      </span>
                    ) : null}
                    <span className="font-medium">{step.label}</span>
                  </div>
                  {step.summary ? (
                    <p className="mt-1 text-muted-foreground">{step.summary}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        )}

        {card.alternatives.length > 0 && (
          <section aria-label="替代方案" className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isParticipant ? '其他方案' : '替代方案'}
            </h4>
            <ul className="space-y-2">
              {card.alternatives.map((alt) => (
                <li
                  key={alt.id}
                  className={cn(
                    'rounded-lg border p-3 text-sm',
                    alt.isSelected && 'border-primary/40 bg-primary/5',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {onAlternativeClick ? (
                      <button
                        type="button"
                        className="font-medium text-left text-primary underline-offset-2 hover:underline"
                        onClick={() => onAlternativeClick(alt.id)}
                      >
                        {alt.label}
                        {alt.isSelected ? ' ✓' : ''}
                      </button>
                    ) : (
                      <span className="font-medium">
                        {alt.label}
                        {alt.isSelected ? ' ✓' : ''}
                      </span>
                    )}
                    <ConfidenceBadge level={parseTrustConfidenceLevel(alt.confidenceLevel)} />
                  </div>
                  {alt.summary && (
                    <p className="mt-1 text-muted-foreground">{alt.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {dataSources.length > 0 && (
          <section aria-label="数据来源" className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              数据来源
            </h4>
            <ul className="flex flex-wrap gap-2">
              {dataSources.map((source) => (
                <li
                  key={source.id}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium tag',
                    `tag-${source.kind}`,
                  )}
                >
                  {source.label}
                  {!isParticipant && (
                    <span className="ml-1.5 text-muted-foreground">
                      ({gate1TrustDataSourceKindLabel(source.kind)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {card.machineAesthetic.humanAssisted && (
          <div className="rounded-md border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <span className="human-assisted font-medium text-amber-900 dark:text-amber-100">
              {isParticipant ? '含团队协助' : '含人工协助'}
            </span>
            {variant === 'advisor' && card.machineAesthetic.humanMinutes != null && (
              <span className="ml-2 text-muted-foreground">
                人工 {card.machineAesthetic.humanMinutes} 分钟
              </span>
            )}
          </div>
        )}
      </CardContent>

      {card.machineAesthetic.disclaimer && (
        <CardFooter className="trust-disclaimer border-t bg-muted/20 py-3 text-xs text-muted-foreground">
          {card.machineAesthetic.disclaimer}
        </CardFooter>
      )}
    </Card>
  );
}
