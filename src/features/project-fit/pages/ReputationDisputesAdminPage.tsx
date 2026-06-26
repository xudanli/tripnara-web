import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import {
  usePendingReputationDisputes,
  useResolveReputationDispute,
  useStartReputationDisputeReview,
} from '@/hooks/useReputationDisputes';

export default function ReputationDisputesAdminPage() {
  const { data: disputes, isLoading, refetch } = usePendingReputationDisputes();
  const startReview = useStartReputationDisputeReview();
  const resolve = useResolveReputationDispute();
  const [resolution, setResolution] = useState<Record<string, string>>({});

  const handleResolve = async (disputeId: string, status: 'UPHELD' | 'REJECTED') => {
    const text = resolution[disputeId]?.trim();
    if (!text || text.length < 5) {
      toast.error('请填写结案说明（至少 5 字）');
      return;
    }
    try {
      await resolve.mutateAsync({ disputeId, body: { resolution: text, status } });
      toast.success(status === 'UPHELD' ? '争议成立，原事实已标记 DISPUTED' : '争议驳回');
      setResolution((prev) => {
        const next = { ...prev };
        delete next[disputeId];
        return next;
      });
    } catch {
      toast.error('结案失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/settings?tab=governance"
          title="声誉争议管理"
          subtitle="Admin · 与 Project Fit 申诉独立"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-6 md:px-6 md:py-8">
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => void refetch()}>
            刷新
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <LogoLoading size={32} />
          </div>
        )}

        {!isLoading && (disputes ?? []).length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">暂无待处理争议</p>
        )}

        {(disputes ?? []).map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                争议
                <Badge variant="outline">{d.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">事件 ID：{d.eventId}</p>
              <p className="text-sm">{d.reason}</p>
              <Textarea
                rows={2}
                placeholder="结案说明"
                value={resolution[d.id] ?? ''}
                onChange={(e) => setResolution((prev) => ({ ...prev, [d.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {d.status === 'SUBMITTED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void startReview.mutateAsync(d.id)}
                    disabled={startReview.isPending}
                  >
                    开始审核
                  </Button>
                )}
                <Button size="sm" onClick={() => void handleResolve(d.id, 'UPHELD')} disabled={resolve.isPending}>
                  成立
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void handleResolve(d.id, 'REJECTED')}
                  disabled={resolve.isPending}
                >
                  驳回
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
