import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { agentApi } from '@/api/agent';
import type { ItineraryRevisionTimelineResponse } from '@/api/agent';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Lock, RotateCcw } from 'lucide-react';
import { Info } from 'lucide-react';
import type { EvidenceBundleDto, EvidenceCardDto, EvidenceCardUiDto } from '@/api/agent';
import NegotiationDialog from '@/components/agent/NegotiationDialog';
import { discardReasonLabel } from '@/lib/robustness-dashboard';
import type { AlignmentTupleSummary } from '@/types/robustness-dashboard';

export interface RevisionTimelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null | undefined;
}

function kindVariant(kind?: string) {
  if (kind === 'ROLLBACK') return 'secondary';
  if (kind === 'CONFIRMED') return 'default';
  return 'outline';
}

export default function RevisionTimelineDialog({ open, onOpenChange, tripId }: RevisionTimelineDialogProps) {
  const queryClient = useQueryClient();
  const [rolling, setRolling] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRevisionId, setDetailRevisionId] = useState<string | null>(null);
  const enabled = open && !!tripId;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agent', 'itinerary_revision_timeline', tripId],
    enabled,
    queryFn: async () => agentApi.getItineraryRevisionTimeline(tripId!),
  });

  const { data: robustnessData } = useQuery({
    queryKey: ['agent', 'robustness_dashboard', tripId],
    enabled,
    queryFn: () => agentApi.getTripRobustnessDashboard(tripId!),
  });

  const alignmentByRevisionId = useMemo(() => {
    const map = new Map<string, AlignmentTupleSummary>();
    const tuples = robustnessData?.alignment?.recent_tuples ?? [];
    for (const t of tuples) {
      if (t.revision_id && !map.has(t.revision_id)) {
        map.set(t.revision_id, t);
      }
    }
    return map;
  }, [robustnessData]);

  const revisions = useMemo(() => {
    const res: ItineraryRevisionTimelineResponse | undefined = data;
    return res?.revisions ?? [];
  }, [data]);

  const baselineRevisionId = useMemo(() => {
    const base = revisions.find((r) => r.kind === 'BASELINE');
    return base?.revision_id ?? null;
  }, [revisions]);

  const detailEnabled = detailOpen && !!detailRevisionId;
  const { data: detailData, isLoading: detailLoading, isError: detailError } = useQuery({
    queryKey: ['agent', 'negotiation_revision', detailRevisionId],
    enabled: detailEnabled,
    queryFn: async () => agentApi.getNegotiationRevision(detailRevisionId!),
  });

  const detailRevision = useMemo(() => {
    return (detailData as any)?.revision ?? null;
  }, [detailData]);

  const lockedRecommendationSummary = useMemo(() => {
    const r = detailRevision;
    if (!r) return null;
    return (
      r?.recommendation_summary ??
      r?.negotiation_payload?.recommendation_summary ??
      r?.snapshot?.recommendation_summary ??
      r?.payload?.negotiation_payload?.recommendation_summary ??
      null
    );
  }, [detailRevision]);

  const lockedEvidenceBundle = useMemo((): EvidenceBundleDto | undefined => {
    const r = detailRevision;
    const b =
      r?.evidence_bundle ??
      r?.payload?.evidence_bundle ??
      r?.result?.payload?.evidence_bundle ??
      r?.snapshot?.evidence_bundle;
    return b && typeof b === 'object' ? (b as EvidenceBundleDto) : undefined;
  }, [detailRevision]);

  const lockedEvidenceCards = useMemo((): EvidenceCardDto[] | undefined => {
    const r = detailRevision;
    const list =
      r?.decision_metadata?.evidence_cards ??
      r?.payload?.decision_metadata?.evidence_cards ??
      r?.result?.payload?.decision_metadata?.evidence_cards ??
      r?.snapshot?.decision_metadata?.evidence_cards;
    return Array.isArray(list) ? (list as EvidenceCardDto[]) : undefined;
  }, [detailRevision]);

  const lockedEvidenceCardsUi = useMemo((): EvidenceCardUiDto[] | undefined => {
    const r = detailRevision;
    const list =
      r?.ui_display?.evidence_cards_ui ??
      r?.payload?.ui_display?.evidence_cards_ui ??
      r?.result?.payload?.ui_display?.evidence_cards_ui ??
      r?.snapshot?.ui_display?.evidence_cards_ui;
    return Array.isArray(list) ? (list as EvidenceCardUiDto[]) : undefined;
  }, [detailRevision]);

  const handleRollback = async (revisionId: string) => {
    if (!tripId) return;
    setRolling(revisionId);
    try {
      await agentApi.rollbackToRevision({ revision_id: revisionId });
      toast.success('已回滚');
      await refetch();
      await queryClient.invalidateQueries({ queryKey: ['agent', 'robustness_dashboard', tripId] });
    } catch (e: any) {
      toast.error('回滚失败', { description: e?.message || '请稍后重试' });
    } finally {
      setRolling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            决策时间轴
            {tripId ? <Badge variant="outline">Trip {tripId}</Badge> : null}
          </DialogTitle>
          <DialogDescription>查看 revision 链（CONFIRMED/ROLLBACK），并可回滚到任意历史版本。</DialogDescription>
        </DialogHeader>

        {!tripId ? (
          <div className="text-sm text-muted-foreground">缺少 tripId</div>
        ) : isLoading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : isError ? (
          <div className="text-sm text-destructive">加载失败，请稍后重试</div>
        ) : revisions.length === 0 ? (
          <div className="text-sm text-muted-foreground">暂无 revision</div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="space-y-3 pr-3">
              {/* Rollback Portal */}
              {baselineRevisionId ? (
                <Card className="border-border/70 shadow-none">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm font-medium">安全港：回到 BASELINE</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          一键恢复到“冻结的初始决策”，并在时间轴中记录此次回滚。
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!rolling}
                        onClick={() => handleRollback(baselineRevisionId)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {rolling === baselineRevisionId ? '回滚中...' : '回滚到 BASELINE'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {revisions.map((rev) => {
                const alignmentTuple = alignmentByRevisionId.get(rev.revision_id);
                return (
                <Card key={rev.revision_id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={kindVariant(rev.kind) as any}>
                            {rev.kind === 'BASELINE' ? (
                              <span className="inline-flex items-center gap-1">
                                <Lock className="h-3.5 w-3.5" />
                                BASELINE
                              </span>
                            ) : (
                              rev.kind
                            )}
                          </Badge>
                          {alignmentTuple ? (
                            <Badge variant="outline" className="text-[10px]">
                              {discardReasonLabel(alignmentTuple.discard_reason)} · 组织{' '}
                              {Math.round(alignmentTuple.organizational_penalty * 100)}%
                            </Badge>
                          ) : null}
                          <span className="text-sm font-medium truncate">{rev.revision_id}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {rev.created_at ? format(new Date(rev.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
                          {typeof rev.delta_cost_usd === 'number' ? (
                            <span className="ml-2">Δcost ${rev.delta_cost_usd.toFixed(0)}</span>
                          ) : null}
                          {typeof rev.delta_time_minutes === 'number' ? (
                            <span className="ml-2">Δtime {rev.delta_time_minutes} min</span>
                          ) : null}
                        </div>
                        {rev.resolution_patch_summary ? (
                          <div className="mt-2 text-sm whitespace-pre-wrap">{rev.resolution_patch_summary}</div>
                        ) : (
                          <div className={cn('mt-2 text-sm text-muted-foreground')}>（无摘要）</div>
                        )}
                      </div>

                      <div className="shrink-0 flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="justify-start"
                          onClick={() => {
                            setDetailRevisionId(rev.revision_id);
                            setDetailOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          当时为何这样建议
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!rolling || rev.kind === 'BASELINE'}
                          onClick={() => handleRollback(rev.revision_id)}
                        >
                          {rolling === rev.revision_id ? '回滚中...' : '回滚到此版本'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Locked Logic View（只读快照，复用 NegotiationDialog 容器） */}
        <NegotiationDialog
          open={detailOpen}
          onOpenChange={(v) => {
            setDetailOpen(v);
            if (!v) setDetailRevisionId(null);
          }}
          negotiation={null}
          readOnly
          readOnlyTitle={`决策快照${detailRevisionId ? `：${detailRevisionId}` : ''}`}
          readOnlyDescription="这是当时那一帧的理由与证据快照，不会随当前数据漂移而改变。"
          readOnlyRecommendationSummary={
            detailLoading ? '加载中…' : detailError ? '加载失败，请稍后重试' : (lockedRecommendationSummary ? String(lockedRecommendationSummary) : null)
          }
          readOnlyEvidence={
            detailLoading || detailError
              ? null
              : {
                  evidence_bundle: lockedEvidenceBundle,
                  decision_metadata: { evidence_cards: lockedEvidenceCards },
                  ui_display: { evidence_cards_ui: lockedEvidenceCardsUi },
                }
          }
        />

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button onClick={() => refetch()} disabled={!tripId}>
            刷新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

