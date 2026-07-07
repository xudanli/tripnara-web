import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useTripTravelContext } from '../context/TripTravelContext';
import { ContextStatusBar } from '../components/ContextStatusBar';
import { ContextDiffDrawer } from '../components/ContextDiffDrawer';
import { TRAVEL_CONTEXT_VIEW_NAMES } from '@/travel-context/domain/travel-context.constants';
import type { TravelContextDiff } from '@/travel-context/client/travel-context-api.types';
import {
  formatContextDiffSummary,
  resolveContextViewLabel,
} from '../lib/context-diff-display.util';
import { resolveTripStageLabel } from '../lib/context-status-display.util';
import { mapDecisionsViewToQueueItems } from '../lib/decisions-view-to-queue.util';

interface TravelContextInspectorPageProps {
  tripId: string;
}

function JsonPanel({
  title,
  data,
  emptyHint,
}: {
  title: string;
  data: unknown;
  emptyHint?: string;
}) {
  const isEmpty = data == null || (typeof data === 'object' && Object.keys(data as object).length === 0);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {isEmpty && emptyHint ? (
        <p className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-xs leading-relaxed text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <pre className="max-h-[480px] overflow-auto rounded-lg border border-border/50 bg-muted/20 p-3 text-[11px] leading-relaxed">
          {JSON.stringify(data ?? null, null, 2)}
        </pre>
      )}
    </div>
  );
}

/** /dashboard/internal/trips/:id/context — 开发环境行程上下文检查器 */
export function TravelContextInspectorPage({ tripId }: TravelContextInspectorPageProps) {
  const navigate = useNavigate();
  const {
    enabled,
    ready,
    contextId,
    revision,
    state,
    overviewView,
    planView,
    decisionsView,
    monitoringView,
    openDecisionCount,
    monitoringCount,
    syncError,
    refresh,
    getProvider,
    openContextDiff,
  } = useTripTravelContext();

  const [sinceRevision, setSinceRevision] = useState(0);
  const [diff, setDiff] = useState<TravelContextDiff | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  useEffect(() => {
    setSinceRevision(Math.max(0, revision - 1));
  }, [revision]);

  const decisionQueuePreview = useMemo(
    () => mapDecisionsViewToQueueItems(decisionsView),
    [decisionsView],
  );

  const fetchDiff = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;
    setDiffLoading(true);
    setDiffError(null);
    try {
      const result = await provider.fetchDiff(sinceRevision);
      setDiff(result);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiffLoading(false);
    }
  }, [getProvider, sinceRevision]);

  const viewEmptyHint =
    syncError
      ? `后端未返回该视图数据。同步错误：${syncError}`
      : !contextId || revision <= 0
        ? '尚未解析到有效上下文。请确认已登录，且该行程已在后端 materialize / 绑定 Travel Context。'
        : '视图为空（后端可能尚未实现该 projection，或当前 revision 无数据）。';

  return (
    <div className="min-h-0 flex flex-col">
      <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-[11px] text-amber-900 dark:text-amber-200">
        内部调试 · 行程上下文检查器 · 行程 {tripId}
      </div>
      <ContextStatusBar />
      <ContextDiffDrawer />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 pb-12 md:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-1"
              onClick={() => navigate(`/dashboard/trips/${tripId}/travel`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回用户概览
            </Button>
            <h1 className="text-xl font-semibold">上下文检查器</h1>
            <p className="text-sm text-muted-foreground">
              版本 · 各视图数据 · 变化对比 · 决策卡片投影（只读，供联调）
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={!enabled}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              刷新视图
            </Button>
            <Button variant="outline" size="sm" onClick={() => openContextDiff(sinceRevision)}>
              <GitCompare className="mr-2 h-3.5 w-3.5" />
              打开变化对比
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/internal/harness">联调台</Link>
            </Button>
          </div>
        </header>

        {syncError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-xs leading-relaxed text-destructive">
            同步失败：{syncError}
            <p className="mt-1 text-muted-foreground text-[11px]">
              常见原因：未登录、后端未部署 RFC-003、或该 trip 尚未绑定 Travel Context。可在终端运行{' '}
              <code className="font-mono">PROXY=1 AUTH_TOKEN=… TRIP_ID={tripId} npm run test:travel-context</code>
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">已启用：{enabled ? '是' : '否'}</Badge>
          <Badge variant="secondary">已就绪：{ready ? '是' : '否'}</Badge>
          <Badge variant="outline">上下文 ID：{contextId || '—'}</Badge>
          <Badge variant="outline">版本：v{revision}</Badge>
          <Badge variant="outline">
            阶段：{state?.stage ? resolveTripStageLabel(state.stage) : '—'}
          </Badge>
          <Badge variant="outline">待决定：{openDecisionCount}</Badge>
          <Badge variant="outline">监控：{monitoringCount}</Badge>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex h-auto flex-wrap gap-1">
            {TRAVEL_CONTEXT_VIEW_NAMES.map((view) => (
              <TabsTrigger key={view} value={view} className="text-xs">
                {resolveContextViewLabel(view)}
              </TabsTrigger>
            ))}
            <TabsTrigger value="projection" className="text-xs">
              决策投影
            </TabsTrigger>
            <TabsTrigger value="diff" className="text-xs">
              变化对比
            </TabsTrigger>
            <TabsTrigger value="raw" className="text-xs">
              原始状态
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <JsonPanel title="概览视图（overview）" data={overviewView} emptyHint={viewEmptyHint} />
          </TabsContent>
          <TabsContent value="exploration" className="mt-4">
            <JsonPanel
              title="探索视图（exploration）"
              data={state?.views.exploration?.data}
              emptyHint={viewEmptyHint}
            />
          </TabsContent>
          <TabsContent value="plan" className="mt-4">
            <JsonPanel title="计划视图（plan）" data={planView} emptyHint={viewEmptyHint} />
          </TabsContent>
          <TabsContent value="decisions" className="mt-4">
            <JsonPanel title="决策视图（decisions）" data={decisionsView} emptyHint={viewEmptyHint} />
          </TabsContent>
          <TabsContent value="monitoring" className="mt-4">
            <JsonPanel title="监控视图（monitoring）" data={monitoringView} emptyHint={viewEmptyHint} />
          </TabsContent>
          <TabsContent value="participants" className="mt-4">
            <JsonPanel
              title="同行者视图（participants）"
              data={state?.views.participants?.data}
              emptyHint={viewEmptyHint}
            />
          </TabsContent>
          <TabsContent value="feasibility" className="mt-4">
            <JsonPanel
              title="可行性视图（feasibility）"
              data={state?.views.feasibility?.data}
              emptyHint={viewEmptyHint}
            />
          </TabsContent>
          <TabsContent value="assistant" className="mt-4">
            <JsonPanel
              title="助手视图（assistant）"
              data={state?.views.assistant?.data}
              emptyHint={viewEmptyHint}
            />
          </TabsContent>

          <TabsContent value="projection" className="mt-4 space-y-4">
            <JsonPanel
              title="决策视图 → 概览页决策卡片"
              data={decisionQueuePreview}
              emptyHint="暂无待决定项，或 decisions 视图未返回 problems / displayedIssues。"
            />
          </TabsContent>

          <TabsContent value="diff" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="since-revision">
                  起始版本（sinceRevision）
                </label>
                <Input
                  id="since-revision"
                  type="number"
                  min={0}
                  className="h-8 w-32 text-xs"
                  value={sinceRevision}
                  onChange={(e) => setSinceRevision(Number(e.target.value))}
                />
              </div>
              <Button size="sm" onClick={() => void fetchDiff()} disabled={diffLoading || !enabled}>
                {diffLoading ? <Spinner className="mr-2 h-3.5 w-3.5" /> : null}
                拉取变化
              </Button>
            </div>
            {diffError ? <p className="text-xs text-destructive">拉取失败：{diffError}</p> : null}
            {diff ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {formatContextDiffSummary({
                    fromRevision: diff.fromRevision,
                    toRevision: diff.toRevision,
                    changedViews: diff.changedViews,
                  })}
                </p>
                <JsonPanel title="变化对比原始数据" data={diff} />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <JsonPanel title="Provider 内存状态" data={state} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
