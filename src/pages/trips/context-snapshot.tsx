import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { LogoLoading } from '@/components/common/LogoLoading';
import ContextSnapshotDetailView from '@/components/travel-status/ContextSnapshotDetailView';
import { tripContextSnapshotApi, isTravelStatusUnavailable } from '@/api/travel-status-client';
import { buildTripTravelStatusPath } from '@/lib/travel-status-navigation.util';

export default function TripContextSnapshotPage() {
  const { id: tripId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['context-snapshot', tripId],
    queryFn: () => tripContextSnapshotApi.getSnapshot(tripId),
    enabled: Boolean(tripId),
    staleTime: 60_000,
  });

  if (!tripId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        缺少行程 ID
      </div>
    );
  }

  if (query.isLoading) {
    return <LogoLoading />;
  }

  if (query.error && isTravelStatusUnavailable(query.error)) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(buildTripTravelStatusPath(tripId))}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回概览
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>上下文快照</CardTitle>
            <CardDescription>后端 context-snapshot 接口尚未就绪</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(buildTripTravelStatusPath(tripId))}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回概览
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>加载失败</CardTitle>
            <CardDescription>{(query.error as Error)?.message ?? '无法获取快照'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-12 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-1"
            onClick={() => navigate(buildTripTravelStatusPath(tripId))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回概览
          </Button>
          <h1 className="text-xl font-semibold">决策依据 · 上下文快照</h1>
          <p className="text-sm text-muted-foreground">
            查看 AI 当前如何理解这趟旅行（只读）
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          刷新
        </Button>
      </header>

      <ContextSnapshotDetailView snapshot={query.data} />
    </div>
  );
}
