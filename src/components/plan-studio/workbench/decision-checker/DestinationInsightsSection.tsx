import { useMemo } from 'react';
import { Info, Lightbulb, MapPin, RefreshCw, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  collectDestinationInsightEntries,
  type TripDestinationInsightsPayload,
  type TripDestinationInsightsResponse,
} from '@/api/destination-insight.types';
import {
  consolidateDestinationInsightEntries,
  splitDestinationInsightSummary,
} from '@/lib/destination-insight-display.util';
import {
  DecisionCheckerBadge,
  DecisionCheckerEmpty,
  DecisionCheckerSection,
  formatDecisionCheckerText,
  reliabilityLabel,
  reliabilityTone,
} from './decision-checker-ui';
import { workbenchAccentIconClass } from '../workbench-ui';

export interface DestinationInsightsSectionProps {
  insights: TripDestinationInsightsPayload;
  /** 完整响应（含 bundle.insights）；与 insights 二选一传入即可 */
  response?: Pick<TripDestinationInsightsResponse, 'bundle' | 'insights'> | null;
  loading?: boolean;
  error?: string | null;
  displayTimezone?: string;
  includeRag?: boolean;
  onRequestRag?: () => void;
  ragLoading?: boolean;
  className?: string;
  /** 决策空间：中栏 DecisionWorkbenchContextPanel 已展示问题说明，隐藏 bundle 冲突解释 */
  hideConflictExplanation?: boolean;
}

function hasInsightContent(
  payload: TripDestinationInsightsPayload,
  response?: DestinationInsightsSectionProps['response'],
  hideConflictExplanation?: boolean,
): boolean {
  const bundleEntries = collectDestinationInsightEntries(
    response ? { insights: payload, bundle: response.bundle } : { insights: payload },
  );
  return Boolean(
    (!hideConflictExplanation && bundleEntries.length) ||
      payload.items?.length ||
      payload.tips?.length ||
      payload.localInsights?.length ||
      payload.routeInsights?.answer ||
      payload.rag?.length,
  );
}

function formatSourceRefs(
  refs: NonNullable<
    ReturnType<typeof collectDestinationInsightEntries>[number]['sourceRefs']
  >,
): string {
  return refs
    .map((ref) => ref.label?.trim() || ref.refId?.trim() || ref.id?.trim() || ref.type?.trim())
    .filter(Boolean)
    .join(' · ');
}

export function DestinationInsightsSection({
  insights,
  response,
  loading,
  error,
  displayTimezone,
  includeRag,
  onRequestRag,
  ragLoading,
  className,
  hideConflictExplanation = false,
}: DestinationInsightsSectionProps) {
  const bundleEntries = useMemo(
    () =>
      hideConflictExplanation
        ? []
        : consolidateDestinationInsightEntries(
            collectDestinationInsightEntries(
              response ? { insights, bundle: response.bundle } : { insights },
            ),
          ),
    [insights, response, hideConflictExplanation],
  );
  const showContent = useMemo(
    () => hasInsightContent(insights, response, hideConflictExplanation),
    [insights, response, hideConflictExplanation],
  );

  if (loading && !showContent) {
    return <DecisionCheckerEmpty>正在加载目的地洞察…</DecisionCheckerEmpty>;
  }

  if (error && !showContent) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (!showContent) {
    return (
      <div className={cn('space-y-2', className)}>
        <DecisionCheckerEmpty>暂无与当前冲突/决策问题相关的目的地洞察。</DecisionCheckerEmpty>
        {!includeRag && onRequestRag ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mx-auto flex h-8 w-full max-w-xs text-xs"
            disabled={ragLoading}
            onClick={onRequestRag}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', ragLoading && 'animate-spin')} />
            加载 RAG 补充洞察
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {bundleEntries.length ? (
        <DecisionCheckerSection title="冲突解释">
          <div className="space-y-2">
            {bundleEntries.map((entry, index) => {
              const sourceLabel = entry.sourceRefs?.length
                ? formatSourceRefs(entry.sourceRefs)
                : undefined;
              const summaryLines = splitDestinationInsightSummary(entry.summary);
              return (
                <div
                  key={entry.id ?? `bundle-${index}`}
                  className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {entry.title ?? '洞察'}
                    </p>
                    {entry.explanatoryOnly ? (
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Info className="h-3 w-3" aria-hidden />
                        仅供参考
                      </span>
                    ) : null}
                  </div>
                  {summaryLines.length ? (
                    <div className="mt-0.5 space-y-0.5">
                      {summaryLines.map((line, lineIndex) => (
                        <p
                          key={`${entry.id ?? index}-line-${lineIndex}`}
                          className="text-[11px] leading-relaxed text-muted-foreground"
                        >
                          {formatDecisionCheckerText(line, displayTimezone)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {sourceLabel ? (
                    <p className="mt-1 text-[10px] text-muted-foreground/80">依据 {sourceLabel}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {insights.items?.length ? (
        <DecisionCheckerSection title="目的地依据">
          <div className="space-y-2">
            {insights.items.map((item, index) => {
              const body = item.subtitle ?? item.content ?? '';
              return (
                <div
                  key={item.id ?? `item-${index}`}
                  className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {item.title ?? '洞察'}
                    </p>
                    {item.reliability ? (
                      <DecisionCheckerBadge tone={reliabilityTone(item.reliability)}>
                        {reliabilityLabel(item.reliability)}
                      </DecisionCheckerBadge>
                    ) : null}
                  </div>
                  {body ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {formatDecisionCheckerText(body, displayTimezone)}
                    </p>
                  ) : null}
                  {item.source ? (
                    <p className="mt-1 text-[10px] text-muted-foreground/80">来源 {item.source}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {insights.tips?.length ? (
        <DecisionCheckerSection title="当地贴士">
          <div className="space-y-2">
            {insights.tips.map((tip, index) => (
              <div
                key={`tip-${index}`}
                className="flex gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
              >
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{tip.content}</p>
                  {tip.source ? (
                    <p className="mt-1 text-[10px] text-muted-foreground/80">来源 {tip.source}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {insights.localInsights?.length ? (
        <DecisionCheckerSection title="当地信息">
          <div className="space-y-2">
            {insights.localInsights.map((item, index) => (
              <div
                key={`local-${index}`}
                className="flex gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2"
              >
                <MapPin className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', workbenchAccentIconClass)} />
                <div className="min-w-0">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{item.content}</p>
                  {item.tags?.length ? (
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      {item.tags.join(' · ')}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {insights.routeInsights?.answer ? (
        <DecisionCheckerSection title="路线背景">
          <div className="flex gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2">
            <Route className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', workbenchAccentIconClass)} />
            <div className="min-w-0">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {insights.routeInsights.answer}
              </p>
              {insights.routeInsights.source ? (
                <p className="mt-1 text-[10px] text-muted-foreground/80">
                  来源 {insights.routeInsights.source}
                </p>
              ) : null}
            </div>
          </div>
        </DecisionCheckerSection>
      ) : null}

      {insights.rag?.length ? (
        <DecisionCheckerSection title="RAG 补充">
          <div className="space-y-2">
            {insights.rag.map((item, index) => {
              const body = item.subtitle ?? item.content ?? '';
              return (
                <div
                  key={item.id ?? `rag-${index}`}
                  className="rounded-lg border border-dashed border-border/60 bg-background/50 px-2.5 py-2"
                >
                  <p className="text-xs font-medium text-foreground">{item.title ?? '补充洞察'}</p>
                  {body ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DecisionCheckerSection>
      ) : null}

      {!includeRag && onRequestRag ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full text-xs text-muted-foreground"
          disabled={ragLoading}
          onClick={onRequestRag}
        >
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', ragLoading && 'animate-spin')} />
          加载 RAG 补充洞察（最多 3 条）
        </Button>
      ) : null}
    </div>
  );
}
