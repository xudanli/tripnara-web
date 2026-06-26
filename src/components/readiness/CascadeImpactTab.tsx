import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { readinessApi } from '@/api/readiness';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import CascadeImpactPanel from '@/components/readiness/CascadeImpactPanel';
import type { CascadeCausalPreAnalysis, CascadeImpactResponse, CascadeUiHint } from '@/types/readiness-cascade';
import {
  READINESS_CASCADE_MOCK_ENABLED,
  resolveCascadeHintsForDev,
  resolveCascadePreAnalysisForDev,
} from '@/lib/readiness-cascade-mock.util';
import { RefreshCw } from 'lucide-react';

interface CascadeImpactTabProps {
  tripId: string;
  /** 分数页已加载的快照，可避免重复请求 */
  initialHints?: CascadeUiHint[];
  initialPreAnalysis?: CascadeCausalPreAnalysis;
}

export default function CascadeImpactTab({
  tripId,
  initialHints,
  initialPreAnalysis,
}: CascadeImpactTabProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState<CascadeImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedMock, setUsedMock] = useState(false);

  const loadSnapshot = useCallback(
    async (opts?: { triggerScore?: boolean }) => {
      try {
        setError(null);
        let data = await readinessApi.getCascadeImpact(tripId);

        if (
          opts?.triggerScore &&
          (!data.cascadeUiHints || data.cascadeUiHints.length === 0)
        ) {
          await readinessApi.getScoreBreakdown(tripId);
          data = await readinessApi.getCascadeImpact(tripId);
        }

        const { hints, isMock } = resolveCascadeHintsForDev(data.cascadeUiHints);
        setUsedMock(isMock);
        setSnapshot({
          ...data,
          cascadeUiHints: hints,
          causalPreAnalysis:
            resolveCascadePreAnalysisForDev(data.causalPreAnalysis, hints.length === 0 && !isMock) ??
            data.causalPreAnalysis,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);
        const { hints, isMock } = resolveCascadeHintsForDev(initialHints);
        if (hints.length > 0 || isMock) {
          setUsedMock(isMock);
          setSnapshot({
            tripId,
            cascadeUiHints: hints,
            causalPreAnalysis:
              initialPreAnalysis ??
              resolveCascadePreAnalysisForDev(undefined, false),
          });
        } else {
          setSnapshot(null);
        }
      }
    },
    [tripId, initialHints, initialPreAnalysis]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSnapshot({ triggerScore: true });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadSnapshot]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSnapshot({ triggerScore: true });
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const hints = snapshot?.cascadeUiHints ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {t('dashboard.readiness.cascade.tabDescription', {
            defaultValue: '只读级联快照；无数据时会先触发分数重算。',
          })}
        </p>
        <Button variant="outline" size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
          {refreshing ? (
            <Spinner className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {t('dashboard.readiness.cascade.refresh', { defaultValue: '刷新快照' })}
        </Button>
      </div>

      {error && hints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {hints.length > 0 ? (
        <>
          {usedMock && READINESS_CASCADE_MOCK_ENABLED ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t('dashboard.readiness.cascade.mockBanner', {
                defaultValue: '开发 mock 数据（VITE_READINESS_CASCADE_MOCK=true）',
              })}
            </p>
          ) : null}
          <CascadeImpactPanel
            hints={hints}
            causalPreAnalysis={snapshot?.causalPreAnalysis}
            onViewRepairOptions={() => {
              window.location.hash = '';
              const el = document.getElementById('readiness-repair-preview');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          {snapshot?.updatedAt ? (
            <p className="text-xs text-muted-foreground text-right">
              {t('dashboard.readiness.cascade.updatedAt', { defaultValue: '快照更新' })}:{' '}
              {new Date(snapshot.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      ) : (
        !error && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.readiness.cascade.empty', {
                  defaultValue: '暂无级联影响快照。请先解决阻塞项或刷新分数。',
                })}
              </p>
              <Button size="sm" onClick={() => void handleRefresh()} disabled={refreshing}>
                {t('dashboard.readiness.cascade.triggerCompute', {
                  defaultValue: '触发计算',
                })}
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
