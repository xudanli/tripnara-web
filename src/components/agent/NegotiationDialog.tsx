import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { agentApi } from '@/api/agent';
import type {
  NegotiationPayload,
  NegotiationAlternativeDto,
  ConfirmNegotiationRequest,
} from '@/api/agent';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import IronShieldEvidenceCards from '@/components/agent/IronShieldEvidenceCards';
import type { EvidenceBundleDto, EvidenceCardDto, EvidenceCardUiDto } from '@/api/agent';
import { isTripnaraHttpError } from '@/types/http-error';

function formatDeltaUsd(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}$${Math.abs(v).toFixed(0)}`;
}

function formatDeltaMinutes(v: number) {
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${Math.abs(v)} min`;
}

function riskBadgeVariant(risk?: string) {
  if (!risk) return 'outline';
  if (risk === 'HIGH') return 'destructive';
  if (risk === 'MEDIUM') return 'secondary';
  return 'outline';
}

function pickRecommendationAltId(negotiation: NegotiationPayload | null, alternatives: NegotiationAlternativeDto[]) {
  if (!negotiation) return null;
  const id = negotiation.default_option_id;
  if (id && alternatives.some((a) => a.id === id)) return id;
  return alternatives[0]?.id ?? null;
}

function summarizeTradeoff(rec: NegotiationAlternativeDto, cur: NegotiationAlternativeDto) {
  const cost = (cur.cost_delta_usd ?? 0) - (rec.cost_delta_usd ?? 0);
  const time = (cur.time_delta_minutes ?? 0) - (rec.time_delta_minutes ?? 0);
  const effort = (cur.effort_delta ?? 0) - (rec.effort_delta ?? 0);
  return { cost, time, effort };
}

export interface NegotiationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: NegotiationPayload | null;
  /** 协商乐观锁冲突（HTTP 409）时回调，用于页面级遮罩等 */
  onNegotiationConflict?: () => void;
  onConfirmed?: (result: { itinerary: any; resolution_patch_summary?: string }) => void;
  /** 强摩擦：显式放弃本次调整（回到修改前的纯净态） */
  onDiscard?: () => void | Promise<void>;
  /** 埋点：弹窗已被用户真正看见（打开后触发一次） */
  onViewed?: () => void;
  /** 埋点：展开 reasoning tag（用于偏好学习） */
  onTagExpanded?: (payload: { alternativeId: string; tag: string }) => void;
  /** 与本轮 route_and_run 的 request_id 对齐，写入 confirm_negotiation 请求头 */
  correlationRequestId?: string | null;
  /** 只读模式：用于“决策快照/Locked Logic View”展示，不允许确认/放弃 */
  readOnly?: boolean;
  /** 只读模式标题/描述（可选） */
  readOnlyTitle?: string;
  readOnlyDescription?: string;
  /** 只读模式内容（可选） */
  readOnlyRecommendationSummary?: string | null;
  readOnlyEvidence?: {
    evidence_bundle?: EvidenceBundleDto;
    decision_metadata?: { evidence_cards?: EvidenceCardDto[] };
    ui_display?: { evidence_cards_ui?: EvidenceCardUiDto[] };
  } | null;
}

export default function NegotiationDialog({
  open,
  onOpenChange,
  negotiation,
  onNegotiationConflict,
  onConfirmed,
  onDiscard,
  onViewed,
  onTagExpanded,
  correlationRequestId,
  readOnly = false,
  readOnlyTitle,
  readOnlyDescription,
  readOnlyRecommendationSummary,
  readOnlyEvidence,
}: NegotiationDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [expandedTagKey, setExpandedTagKey] = useState<string | null>(null);

  const alternatives = negotiation?.alternatives ?? [];

  // best-effort：弹窗真正被用户看见（每个 session_id 触发一次）
  useEffect(() => {
    if (readOnly) return;
    if (!open) return;
    if (!negotiation?.negotiation_session_id) return;
    onViewed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readOnly, negotiation?.negotiation_session_id]);

  const effectiveSelectedId = useMemo(() => {
    if (!negotiation) return null;
    if (selectedId && alternatives.some((a) => a.id === selectedId)) return selectedId;
    if (negotiation.default_option_id && alternatives.some((a) => a.id === negotiation.default_option_id)) {
      return negotiation.default_option_id;
    }
    return alternatives[0]?.id ?? null;
  }, [alternatives, negotiation, selectedId]);

  const recommendedId = useMemo(() => pickRecommendationAltId(negotiation, alternatives), [alternatives, negotiation]);
  const recommendedAlt = useMemo(
    () => (recommendedId ? alternatives.find((a) => a.id === recommendedId) : undefined),
    [alternatives, recommendedId]
  );

  const selectedAlt: NegotiationAlternativeDto | undefined = useMemo(() => {
    if (!effectiveSelectedId) return undefined;
    return alternatives.find((a) => a.id === effectiveSelectedId);
  }, [alternatives, effectiveSelectedId]);

  const tradeoffSummary = useMemo(() => {
    if (!recommendedAlt || !selectedAlt) return null;
    return summarizeTradeoff(recommendedAlt, selectedAlt);
  }, [recommendedAlt, selectedAlt]);

  const handleConfirm = async () => {
    if (!negotiation || !effectiveSelectedId) return;
    setConfirming(true);
    try {
      const req: ConfirmNegotiationRequest = {
        session_id: negotiation.negotiation_session_id,
        alternative_id: effectiveSelectedId,
        expected_negotiation_hash: negotiation.expected_negotiation_hash,
      };
      if (correlationRequestId?.trim()) {
        req.request_id = correlationRequestId.trim();
      }
      const res = await agentApi.confirmNegotiation(req);
      toast.success('已确认方案');
      onOpenChange(false);
      onConfirmed?.({ itinerary: res.itinerary, resolution_patch_summary: res.resolution_patch_summary });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        onNegotiationConflict?.();
        toast.error('协商已过期或不匹配', {
          description: '请重新发起协商（重新发送上一条请求），再选择并确认。',
        });
      } else {
        const rid = isTripnaraHttpError(e) ? e.requestId : undefined;
        toast.error('确认失败', {
          description: rid ? `${e?.message || '请稍后重试'}（request_id: ${rid}）` : e?.message || '请稍后重试',
        });
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscard = async () => {
    try {
      await onDiscard?.();
      toast.message('已放弃本次调整', { description: '我们已回到修改前的纯净态，你可以重新发起协商或换个策略。' });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('放弃失败', { description: e?.message || '请稍后重试' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {readOnly ? (readOnlyTitle || '决策快照') : '参谋对话框（协商决策）'}
            {!readOnly && negotiation?.reason ? <Badge variant="outline">{negotiation.reason}</Badge> : null}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? (readOnlyDescription || '这是当时那一帧的理由与证据快照，不会随当前数据漂移而改变。')
              : '我不会替你做决定：我会把“影响、风险与证据”摊开给你看，帮助你更稳地选。确认时会进行乐观锁校验。'}
          </DialogDescription>
        </DialogHeader>

        {readOnly ? (
          <div className="space-y-3">
            {readOnlyRecommendationSummary ? (
              <Card className="shadow-none">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">首席参谋摘要</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm whitespace-pre-wrap">
                  {readOnlyRecommendationSummary}
                </CardContent>
              </Card>
            ) : null}

            {readOnlyEvidence ? (
              <IronShieldEvidenceCards
                defaultOpen
                preferZhLabels
                evidenceBundle={readOnlyEvidence.evidence_bundle}
                evidenceCards={readOnlyEvidence.decision_metadata?.evidence_cards}
                evidenceCardsUi={readOnlyEvidence.ui_display?.evidence_cards_ui}
              />
            ) : (
              <div className="text-sm text-muted-foreground">暂无快照内容</div>
            )}
          </div>
        ) : !negotiation ? (
          <div className="text-sm text-muted-foreground">暂无协商内容</div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">首席参谋摘要</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm whitespace-pre-wrap">{negotiation.impact}</div>
                  {negotiation.recommendation_summary ? (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                      {negotiation.recommendation_summary}
                    </div>
                  ) : null}

                  {/* 对比摘要卡：推荐 vs 当前选择 */}
                  {recommendedAlt && selectedAlt && tradeoffSummary ? (
                    <Card className="shadow-none">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">对比摘要（推荐 vs 你当前选择）</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">推荐 {recommendedAlt.id}</Badge>
                          <Badge variant="outline">当前 {selectedAlt.id}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          这里展示的是“相对推荐方案”的差值，帮助你理解你在用什么换什么。
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-md border p-2">
                            <div className="text-[11px] text-muted-foreground">成本</div>
                            <div className="font-semibold">{formatDeltaUsd(tradeoffSummary.cost)}</div>
                          </div>
                          <div className="rounded-md border p-2">
                            <div className="text-[11px] text-muted-foreground">时间</div>
                            <div className="font-semibold">{formatDeltaMinutes(tradeoffSummary.time)}</div>
                          </div>
                          <div className="rounded-md border p-2">
                            <div className="text-[11px] text-muted-foreground">精力</div>
                            <div className="font-semibold">
                              {tradeoffSummary.effort > 0 ? '+' : tradeoffSummary.effort < 0 ? '−' : ''}
                              {Math.abs(tradeoffSummary.effort).toFixed(1)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}

                  {negotiation.strategy_impact_map?.heat_zones?.length ? (
                    <div className="pt-2">
                      <div className="text-xs font-medium text-muted-foreground mb-2">冲突热力区（Heat-Zones）</div>
                      <div className="space-y-2">
                        {negotiation.strategy_impact_map.heat_zones.slice(0, 8).map((z: any, idx: number) => (
                          <div
                            key={`${z.segment_id}-${idx}`}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-md border px-3 py-2',
                              z.bottleneck_node ? 'border-red-200 bg-red-50/40' : 'bg-muted/20'
                            )}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {z.segment_id}
                                {z.bottleneck_node ? <span className="ml-2 text-xs text-red-700">物理瓶颈</span> : null}
                              </div>
                              {z.criterion ? (
                                <div className="text-xs text-muted-foreground mt-0.5">原因：{String(z.criterion)}</div>
                              ) : null}
                            </div>
                            <Badge variant={z.bottleneck_node ? 'destructive' : 'secondary'} className="shrink-0">
                              {z.bottleneck_node ? 'bottleneck' : 'zone'}
                            </Badge>
                          </div>
                        ))}
                        <div className="text-[11px] text-muted-foreground">
                          地图层热区叠加（脉冲区）可作为下一步增强；当前先提供可读列表以支撑决策解释。
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">可选方案（你来选）</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[380px]">
                    <div className="p-4 space-y-3">
                      {alternatives.map((alt) => {
                        const selected = alt.id === effectiveSelectedId;
                        const isRecommended = alt.id === recommendedId;
                        return (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => setSelectedId(alt.id)}
                            className={cn(
                              'w-full text-left rounded-lg border p-3 transition-colors',
                              selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium truncate">{alt.id}</div>
                                  {isRecommended ? (
                                    <Badge className="shrink-0">推荐</Badge>
                                  ) : null}
                                  {alt.is_fragile ? (
                                    <Badge variant="destructive" className="shrink-0">
                                      脆弱
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <span>成本 {formatDeltaUsd(alt.cost_delta_usd)}</span>
                                  <span>时间 {formatDeltaMinutes(alt.time_delta_minutes)}</span>
                                  <span>精力 {(alt.effort_delta ?? 0).toFixed(1)}</span>
                                  {typeof alt.reliability_score === 'number' ? (
                                    <span>可靠性 {Math.round(alt.reliability_score * 100)}%</span>
                                  ) : null}
                                </div>
                              </div>
                              {alt.risk_level ? (
                                <Badge variant={riskBadgeVariant(alt.risk_level) as any} className="shrink-0">
                                  风险 {alt.risk_level}
                                </Badge>
                              ) : null}
                            </div>

                            {alt.reasoning_tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {alt.reasoning_tags.slice(0, 6).map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const k = `${alt.id}:${t}`;
                                      setExpandedTagKey((prev) => {
                                        const next = prev === k ? null : k;
                                        if (next) onTagExpanded?.({ alternativeId: alt.id, tag: t });
                                        return next;
                                      });
                                    }}
                                    className="inline-flex"
                                  >
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px] transition-colors',
                                        expandedTagKey === `${alt.id}:${t}` ? 'bg-muted' : undefined
                                      )}
                                    >
                                      {t}
                                    </Badge>
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            {expandedTagKey && expandedTagKey.startsWith(`${alt.id}:`) ? (
                              <div className="mt-2 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                                <div className="font-medium text-foreground/80 mb-1">损耗明细（Effort-Delta）</div>
                                <div className="flex flex-wrap gap-2">
                                  <span>成本 {formatDeltaUsd(alt.cost_delta_usd)}</span>
                                  <span>时间 {formatDeltaMinutes(alt.time_delta_minutes)}</span>
                                  <span>精力 {(alt.effort_delta ?? 0).toFixed(1)}</span>
                                </div>
                                {alt.regret_notice ? (
                                  <div className="mt-1 whitespace-pre-wrap">{alt.regret_notice}</div>
                                ) : (
                                  <div className="mt-1">（暂无额外说明）</div>
                                )}
                              </div>
                            ) : null}

                            {alt.regret_notice ? (
                              <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">{alt.regret_notice}</div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleDiscard} disabled={confirming}>
                放弃本次调整
              </Button>
              <Button onClick={handleConfirm} disabled={!negotiation || !effectiveSelectedId || confirming}>
                {confirming ? '确认中...' : selectedAlt ? `确认：${selectedAlt.id}` : '确认'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

