import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LogoLoading } from '@/components/common/LogoLoading';
import { DashboardSubpageHeader } from '@/components/layout/DashboardSubpageHeader';
import {
  useExpireOutdatedFitAssessments,
  usePendingProjectFitAppeals,
  useResolveProjectFitAppeal,
  useStartProjectFitAppealReview,
  useTriageProjectFitAppeal,
} from '@/hooks/useProjectFitAdmin';
import { projectFitAppealStatusLabel } from '@/lib/project-fit-display';
import type { ProjectFitAppealStatus } from '@/types/project-fit';

const STATUS_FILTERS: { value: string; label: string; statuses?: ProjectFitAppealStatus[] }[] = [
  { value: 'pending', label: '待处理（SUBMITTED + TRIAGED）', statuses: ['SUBMITTED', 'TRIAGED'] },
  { value: 'submitted', label: '仅 SUBMITTED', statuses: ['SUBMITTED'] },
  { value: 'triaged', label: '仅 TRIAGED', statuses: ['TRIAGED'] },
  { value: 'under_review', label: 'UNDER_REVIEW', statuses: ['UNDER_REVIEW'] },
];

export default function ProjectFitAppealsAdminPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [resolveNotes, setResolveNotes] = useState<Record<string, string>>({});

  const filter = STATUS_FILTERS.find((f) => f.value === statusFilter) ?? STATUS_FILTERS[0];
  const { data: appeals, isLoading, refetch } = usePendingProjectFitAppeals(filter.statuses);
  const triage = useTriageProjectFitAppeal();
  const startReview = useStartProjectFitAppealReview();
  const resolve = useResolveProjectFitAppeal();
  const expireOutdated = useExpireOutdatedFitAssessments();

  const handleTriage = async (appealId: string) => {
    try {
      await triage.mutateAsync({
        appealId,
        body: { notes: resolveNotes[appealId]?.trim() || undefined },
      });
      toast.success('已分诊');
    } catch {
      toast.error('分诊失败');
    }
  };

  const handleStartReview = async (appealId: string) => {
    try {
      await startReview.mutateAsync(appealId);
      toast.success('已开始审核');
    } catch {
      toast.error('操作失败');
    }
  };

  const handleResolve = async (
    appealId: string,
    status: 'UPHELD' | 'PARTIALLY_UPHELD' | 'REJECTED'
  ) => {
    const resolution = resolveNotes[appealId]?.trim();
    if (!resolution || resolution.length < 5) {
      toast.error('结案说明至少 5 字');
      return;
    }
    try {
      const result = await resolve.mutateAsync({
        appealId,
        body: { resolution, status },
      });
      const effects = result.overturnEffects;
      if (effects?.reopenedApplicationIds?.length || effects?.resetAssessmentIds?.length) {
        toast.success(
          `申诉已结案 · 重开申请 ${effects.reopenedApplicationIds?.length ?? 0} · 重置评估 ${effects.resetAssessmentIds?.length ?? 0}`
        );
      } else {
        toast.success('申诉已结案');
      }
      setResolveNotes((prev) => {
        const next = { ...prev };
        delete next[appealId];
        return next;
      });
    } catch {
      toast.error('结案失败');
    }
  };

  const handleExpireScan = async () => {
    try {
      const result = await expireOutdated.mutateAsync();
      toast.success(`评估过期扫描完成，标记 ${result.expiredCount} 条`);
    } catch {
      toast.error('扫描失败');
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <DashboardSubpageHeader
          backTo="/dashboard/settings?tab=governance"
          title="Project Fit 申诉管理"
          subtitle="Admin · 分诊 / 审核 / 结案"
          maxWidth="full"
        />
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">运维操作</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleExpireScan()}
              disabled={expireOutdated.isPending}
            >
              触发评估过期扫描
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              需 Admin 权限。结案仅允许 SUBMITTED / TRIAGED / UNDER_REVIEW 状态。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">待处理申诉</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => void refetch()}>
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex justify-center py-8">
                <LogoLoading size={28} />
              </div>
            )}

            {!isLoading && (appeals ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无申诉</p>
            )}

            {(appeals ?? []).map((appeal) => (
              <div key={appeal.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{projectFitAppealStatusLabel(appeal.status)}</Badge>
                  <span className="text-xs text-muted-foreground">{appeal.targetType}</span>
                  <span className="text-xs font-mono text-muted-foreground">{appeal.id}</span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">目标：</span>
                  {appeal.targetId}
                </p>
                <p className="text-sm leading-relaxed">{appeal.reason}</p>

                <Textarea
                  placeholder="分诊/结案说明（结案必填，至少 5 字）"
                  rows={2}
                  value={resolveNotes[appeal.id] ?? ''}
                  onChange={(e) =>
                    setResolveNotes((prev) => ({ ...prev, [appeal.id]: e.target.value }))
                  }
                />

                <div className="flex flex-wrap gap-2">
                  {appeal.status === 'SUBMITTED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleTriage(appeal.id)}
                      disabled={triage.isPending}
                    >
                      分诊
                    </Button>
                  )}
                  {(appeal.status === 'SUBMITTED' || appeal.status === 'TRIAGED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleStartReview(appeal.id)}
                      disabled={startReview.isPending}
                    >
                      开始审核
                    </Button>
                  )}
                  {['SUBMITTED', 'TRIAGED', 'UNDER_REVIEW'].includes(String(appeal.status)) && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void handleResolve(appeal.id, 'UPHELD')}
                        disabled={resolve.isPending}
                      >
                        成立
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleResolve(appeal.id, 'PARTIALLY_UPHELD')}
                        disabled={resolve.isPending}
                      >
                        部分成立
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleResolve(appeal.id, 'REJECTED')}
                        disabled={resolve.isPending}
                      >
                        驳回
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
