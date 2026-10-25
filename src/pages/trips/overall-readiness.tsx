import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { tripOverallReadinessApi } from '@/api/trip-detail-tab-client';
import { overallReadinessKeys } from '@/lib/overall-readiness-keys';
import { resolveOverallReadinessActionHref } from '@/lib/overall-readiness-navigation.util';
import {
  dimensionLabelZh,
  formatEvidenceTime,
  isEvidenceExpired,
  isOverallReadinessBlocked,
  normalizeOverallReadinessDimensions,
} from '@/lib/overall-readiness.util';
import { cn } from '@/lib/utils';
import { tripDetailUi } from '@/components/trips/detail/trip-detail-ui';
import type { OverallReadinessHomepageAction } from '@/types/overall-readiness';

function ActionRow({
  tripId,
  item,
}: {
  tripId: string;
  item: OverallReadinessHomepageAction;
}) {
  const href = resolveOverallReadinessActionHref(tripId, {
    actionCode: item.actionCode,
    deepLink: item.deepLink,
  });
  return (
    <Link
      to={href}
      className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.estimatedScoreLift != null ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            处理后预计 +{item.estimatedScoreLift} 分
          </p>
        ) : null}
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export default function TripOverallReadinessPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: overallReadinessKeys.report(tripId ?? ''),
    queryFn: () => tripOverallReadinessApi.getReport(tripId!),
    enabled: Boolean(tripId),
  });

  const dimensions = useMemo(
    () => (data ? normalizeOverallReadinessDimensions(data.dimensions) : []),
    [data],
  );

  if (!tripId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">缺少行程 ID</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message || '加载准备报告失败'}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          重试
        </Button>
      </div>
    );
  }

  const blocked = isOverallReadinessBlocked(data.state);
  const homepage = data.homepage;
  const expiredCount = data.expiredEvidenceCount ?? 0;

  return (
    <div className={cn('min-h-full', tripDetailUi.pageBg)}>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/dashboard/trips/${tripId}`)}
            aria-label="返回行程"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-foreground truncate">
              {homepage.headline || `整体准备度 ${Math.round(data.score)}% · ${data.displayLabelZh}`}
            </h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              证据置信度 {Math.round(data.evidenceConfidence)}%
              {expiredCount > 0 ? ` · ${expiredCount} 条证据已过期` : ''}
              {isFetching ? ' · 刷新中…' : ''}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(blocked ? tripDetailUi.tagReject : tripDetailUi.tagConfirm, 'shrink-0')}
          >
            {blocked ? (
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.displayLabelZh}
              </span>
            ) : (
              data.displayLabelZh
            )}
          </Badge>
        </div>

        <div
          className={cn(
            tripDetailUi.card,
            'px-4 py-3',
            blocked && 'border-gate-reject-border bg-gate-reject/5',
          )}
        >
          <p className="text-3xl font-semibold tabular-nums text-foreground">
            {Math.round(data.score)}
            <span className="text-base font-medium text-muted-foreground">%</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.stateLabelZh}
            {homepage.potentialScoreLift != null && homepage.potentialScoreLift > 0
              ? ` · 处理完预计 +${homepage.potentialScoreLift} 分`
              : ''}
          </p>
        </div>

        {homepage.whyNotReady?.length ? (
          <section className={cn(tripDetailUi.card)}>
            <div className={tripDetailUi.cardHeader}>
              <h2 className="text-sm font-semibold">为什么还没好</h2>
            </div>
            <ul className={cn(tripDetailUi.cardBody, 'space-y-1.5 list-disc pl-5')}>
              {homepage.whyNotReady.map((reason) => (
                <li key={reason} className="text-sm text-foreground">
                  {reason}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {homepage.mustHandleNow?.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground px-0.5">必须现在处理</h2>
            <div className="space-y-2">
              {homepage.mustHandleNow.map((item) => (
                <ActionRow key={`${item.title}-${item.actionCode ?? ''}`} tripId={tripId} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {homepage.canHandleLater?.length ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground px-0.5">可稍后处理</h2>
            <div className="space-y-2">
              {homepage.canHandleLater.map((item) => (
                <ActionRow key={`${item.title}-${item.actionCode ?? ''}`} tripId={tripId} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {homepage.dimensionRows?.length ? (
          <section className={cn(tripDetailUi.card)}>
            <div className={tripDetailUi.cardHeader}>
              <h2 className="text-sm font-semibold">五维概览</h2>
            </div>
            <div className={cn(tripDetailUi.cardBody, 'space-y-3')}>
              {homepage.dimensionRows.map((row) => (
                <div key={row.code}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{row.labelZh}</span>
                    <span className="tabular-nums text-muted-foreground">{Math.round(row.score)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        row.state === 'BLOCKED' ? 'bg-gate-reject-foreground' : 'bg-primary',
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, row.score))}%` }}
                    />
                  </div>
                  {row.primaryIssue ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{row.primaryIssue}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {dimensions.length ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-0.5">五维详情</h2>
            {dimensions.map((dim) => (
              <div key={dim.code} className={cn(tripDetailUi.card)}>
                <div className={tripDetailUi.cardHeader}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">
                      {dimensionLabelZh(dim.code)} · {Math.round(dim.score)}%
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      {dim.state}
                    </Badge>
                  </div>
                </div>
                <ul className={cn(tripDetailUi.cardBody, 'space-y-2')}>
                  {(dim.checks ?? []).map((check) => (
                    <li key={check.checkCode} className="text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-foreground">{check.title}</span>
                        <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                          {check.result} · {Math.round(check.score)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        {data.evidence?.length ? (
          <section className={cn(tripDetailUi.card)}>
            <div className={tripDetailUi.cardHeader}>
              <h2 className="text-sm font-semibold">证据</h2>
            </div>
            <ul className={cn(tripDetailUi.cardBody, 'space-y-3')}>
              {data.evidence.map((ev) => {
                const expired = isEvidenceExpired(ev.expiresAt);
                return (
                  <li key={ev.id} className="text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-foreground">
                        {ev.sourceName || ev.evidenceType || '证据'}
                      </span>
                      {ev.dimension ? (
                        <Badge variant="outline" className="text-[10px]">
                          {dimensionLabelZh(ev.dimension)}
                        </Badge>
                      ) : null}
                      {expired ? (
                        <Badge variant="outline" className={cn(tripDetailUi.tagReject, 'text-[10px]')}>
                          已过期
                        </Badge>
                      ) : null}
                    </div>
                    {ev.statement ? (
                      <p className="mt-1 text-muted-foreground">{ev.statement}</p>
                    ) : null}
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatEvidenceTime(ev.observedAt)}
                      {ev.expiresAt ? ` · 有效至 ${formatEvidenceTime(ev.expiresAt)}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
