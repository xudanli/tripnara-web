import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ChevronRight, ShieldAlert, ShieldCheck, ShieldQuestion, FileText, Info } from 'lucide-react';
import type { EvidenceBundleDto, EvidenceCardDto, EvidenceCardUiDto, VerificationStatus } from '@/api/agent';
import {
  translateEvidenceBadgeTextForUser,
  translateFailureReasonCodeForUser,
  translateVerificationStatusForUser,
} from '@/lib/agent-display-zh';

function bundleTone(status?: VerificationStatus): 'pass' | 'warn' | 'block' | 'neutral' {
  if (!status) return 'neutral';
  if (status === 'VERIFIED') return 'pass';
  if (status === 'PARTIALLY_VERIFIED' || status === 'PARTIAL') return 'warn';
  if (status === 'STALE' || status === 'UNVERIFIED') return 'warn';
  if (status === 'FAILED') return 'block';
  return 'neutral';
}

function toneBadgeClass(tone: 'pass' | 'warn' | 'block' | 'neutral' | 'info') {
  switch (tone) {
    case 'pass':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'warn':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'block':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'info':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    default:
      return 'bg-muted text-foreground/80 border-border';
  }
}

function BundleIcon({ tone }: { tone: ReturnType<typeof bundleTone> }) {
  if (tone === 'pass') return <ShieldCheck className="h-4 w-4 text-green-700" />;
  if (tone === 'warn') return <ShieldQuestion className="h-4 w-4 text-amber-700" />;
  if (tone === 'block') return <ShieldAlert className="h-4 w-4 text-red-700" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function SoftBadgeIcon({ tone }: { tone: 'info' | 'warning' }) {
  if (tone === 'info') return <Info className="h-4 w-4 text-blue-600" />;
  return <ShieldQuestion className="h-4 w-4 text-amber-700" />;
}

/** 优先后端 failure_reason_labels_zh；否则前端映射（preferZhLabels） */
function failureReasonPrimaryLabel(
  code: string,
  index: number,
  labelsZh: string[] | undefined,
  preferZhLabels: boolean
): string {
  const raw = labelsZh?.[index];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return translateFailureReasonCodeForUser(code, preferZhLabels);
}

export type IronShieldEvidencePresentation =
  | 'default'
  | 'clarifying'
  | 'constraint_warning'
  | 'critical';

export interface IronShieldEvidenceCardsProps {
  evidenceBundle?: EvidenceBundleDto | null;
  /** 审计层证据卡（逻辑/审计层） */
  evidenceCards?: EvidenceCardDto[] | null;
  /** 展示层证据卡 UI Props（可直接渲染） */
  evidenceCardsUi?: EvidenceCardUiDto[] | null;
  className?: string;
  defaultOpen?: boolean;
  /** 产品语义：约束告警时默认展开并套 amber 强调 */
  evidencePresentation?: IronShieldEvidencePresentation;
  /** 用温和文案替换 FAILED 字面徽章（如「信息待补全」「约束冲突」） */
  verificationBadgeSoft?: { label: string; tone: 'info' | 'warning' };
  /** 为 false 时隐藏证据包下方失败原因码 chips（避免对用户惊吓） */
  showAuditFailureCodes?: boolean;
  /** 用户模式：技术码/枚举徽章显示中文（Debug 保持英文） */
  preferZhLabels?: boolean;
}

export default function IronShieldEvidenceCards({
  evidenceBundle,
  evidenceCards,
  evidenceCardsUi,
  className,
  defaultOpen = false,
  evidencePresentation = 'default',
  verificationBadgeSoft,
  showAuditFailureCodes = true,
  preferZhLabels = false,
}: IronShieldEvidenceCardsProps) {
  const [open, setOpen] = useState(
    () => defaultOpen || evidencePresentation === 'constraint_warning'
  );

  useEffect(() => {
    if (evidencePresentation === 'constraint_warning') setOpen(true);
  }, [evidencePresentation]);

  const bundleStatus = evidenceBundle?.verification_status;
  const tone = bundleTone(bundleStatus);

  const cardsUi = useMemo(() => (Array.isArray(evidenceCardsUi) ? evidenceCardsUi : []), [evidenceCardsUi]);
  const cardsAudit = useMemo(() => (Array.isArray(evidenceCards) ? evidenceCards : []), [evidenceCards]);

  const hasAny = Boolean(evidenceBundle || cardsUi.length > 0 || cardsAudit.length > 0);
  if (!hasAny) return null;

  const failureCodes = (evidenceBundle?.failure_reason_codes ?? []).filter(Boolean);
  const bundleFailureLabelsZh = Array.isArray(evidenceBundle?.failure_reason_labels_zh)
    ? evidenceBundle.failure_reason_labels_zh
    : undefined;

  const softToneMap =
    verificationBadgeSoft?.tone === 'info'
      ? ('info' as const)
      : verificationBadgeSoft?.tone === 'warning'
        ? ('warn' as const)
        : null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'mt-2',
        evidencePresentation === 'constraint_warning' &&
          'rounded-md ring-2 ring-amber-200/90 ring-offset-2 ring-offset-background',
        className
      )}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
            <span className="truncate">证据卡（Iron Shield）</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            {verificationBadgeSoft ? (
              <Badge
                variant="outline"
                className={cn('text-[10px]', toneBadgeClass(softToneMap ?? 'neutral'))}
              >
                <span className="inline-flex items-center gap-1">
                  <SoftBadgeIcon tone={verificationBadgeSoft.tone} />
                  <span>{verificationBadgeSoft.label}</span>
                </span>
              </Badge>
            ) : bundleStatus ? (
              <Badge
                variant="outline"
                className={cn('text-[10px]', toneBadgeClass(tone))}
                title={String(bundleStatus)}
              >
                <span className="inline-flex items-center gap-1">
                  <BundleIcon tone={tone} />
                  <span>{translateVerificationStatusForUser(bundleStatus, true)}</span>
                </span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                无汇总状态
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {cardsUi.length || cardsAudit.length} 张
            </Badge>
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-1">
        <div className="bg-muted/30 rounded-md p-2.5 space-y-2">
          {/* Summary */}
          {evidenceBundle ? (
            <Card className="border-border/60 shadow-none">
              <CardHeader className="py-3">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {verificationBadgeSoft ? (
                      <SoftBadgeIcon tone={verificationBadgeSoft.tone} />
                    ) : (
                      <BundleIcon tone={tone} />
                    )}
                    <span>C1 证据包</span>
                  </span>
                  {verificationBadgeSoft ? (
                    <Badge variant="outline" className={cn('text-[10px]', toneBadgeClass(softToneMap ?? 'neutral'))}>
                      {verificationBadgeSoft.label}
                    </Badge>
                  ) : bundleStatus ? (
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', toneBadgeClass(tone))}
                      title={String(bundleStatus)}
                    >
                      {translateVerificationStatusForUser(bundleStatus, true)}
                    </Badge>
                  ) : null}
                </CardTitle>
              </CardHeader>
              {showAuditFailureCodes && failureCodes.length > 0 ? (
                <CardContent className="pt-0 pb-3 space-y-2">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-2">失败原因</div>
                    <div className="flex flex-wrap gap-1.5">
                      {failureCodes.slice(0, 12).map((c, i) => (
                        <Badge
                          key={`${c}-${i}`}
                          variant="outline"
                          className="text-[10px] bg-background max-w-[220px] truncate"
                          title={c}
                        >
                          {failureReasonPrimaryLabel(c, i, bundleFailureLabelsZh, preferZhLabels)}
                        </Badge>
                      ))}
                      {failureCodes.length > 12 ? (
                        <Badge variant="outline" className="text-[10px] bg-background">
                          +{failureCodes.length - 12}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <details className="rounded border border-border/50 bg-background/40 px-2 py-1.5">
                    <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground select-none">
                      failure_reason_codes（技术码）
                    </summary>
                    <div className="flex flex-wrap gap-1.5 mt-2 font-mono">
                      {failureCodes.map((c, i) => (
                        <Badge key={`raw-${c}-${i}`} variant="outline" className="text-[9px] bg-muted/50">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </details>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {/* Cards */}
          <ScrollArea className="max-h-[320px] pr-2">
            <div className="space-y-2">
              {(cardsUi.length > 0 ? cardsUi : cardsAudit).slice(0, 20).map((card: any, idx: number) => {
                const title = card?.title ?? card?.id ?? `证据卡 ${idx + 1}`;
                const subtitle = card?.subtitle ?? card?.summary ?? '';
                const bullets: string[] = Array.isArray(card?.bullets) ? card.bullets.filter(Boolean) : [];
                const cardFailureCodes: string[] = Array.isArray(card?.failure_reason_codes)
                  ? card.failure_reason_codes.filter(Boolean)
                  : [];
                const cardFailureLabelsZh = Array.isArray(card?.failure_reason_labels_zh)
                  ? card.failure_reason_labels_zh
                  : undefined;
                const localTone =
                  card?.tone === 'pass' || card?.tone === 'warn' || card?.tone === 'block' || card?.tone === 'neutral'
                    ? card.tone
                    : bundleTone(card?.verification_status);
                const badgeText =
                  card?.badge_text ??
                  card?.verification_status ??
                  (card?.severity ? `SEV:${String(card.severity)}` : undefined);

                return (
                  <Card
                    key={card?.id ?? idx}
                    className={cn(
                      'border-border/60 shadow-none',
                      evidencePresentation === 'constraint_warning' &&
                        'border-amber-400 bg-amber-50/50 ring-1 ring-amber-200/90'
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{title}</div>
                          {subtitle ? (
                            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                              {String(subtitle)}
                            </div>
                          ) : null}

                          {bullets.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                              {bullets.slice(0, 6).map((b, i) => (
                                <li key={i} className="whitespace-pre-wrap">
                                  {b}
                                </li>
                              ))}
                            </ul>
                          ) : null}

                          {cardFailureCodes.length > 0 ? (
                            <div className="mt-2">
                              <div className="text-[11px] text-muted-foreground mb-1.5">失败原因</div>
                              <div className="flex flex-wrap gap-1.5">
                                {cardFailureCodes.slice(0, 12).map((c: string, fi: number) => (
                                  <Badge
                                    key={`${c}-${fi}`}
                                    variant="outline"
                                    className="text-[10px] bg-background max-w-[220px] truncate"
                                    title={c}
                                  >
                                    {failureReasonPrimaryLabel(c, fi, cardFailureLabelsZh, preferZhLabels)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {badgeText ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] shrink-0',
                              toneBadgeClass(localTone === 'neutral' ? 'neutral' : localTone)
                            )}
                            title={String(badgeText)}
                          >
                            {translateEvidenceBadgeTextForUser(String(badgeText), true)}
                          </Badge>
                        ) : null}
                      </div>

                      {/* Optional details */}
                      {card?.details ||
                      card?.evidence_refs ||
                      (Array.isArray(card?.failure_reason_codes) && card.failure_reason_codes.length > 0) ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                            查看详情
                          </summary>
                          <div className="mt-2 space-y-2 text-[11px] text-muted-foreground">
                            {Array.isArray(card?.evidence_refs) && card.evidence_refs.length > 0 ? (
                              <div>
                                <div className="font-medium text-foreground/80 mb-1">evidence_refs</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {card.evidence_refs.slice(0, 12).map((r: string) => (
                                    <Badge key={r} variant="outline" className="text-[10px] bg-background">
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {Array.isArray(card?.failure_reason_codes) && card.failure_reason_codes.length > 0 ? (
                              <div>
                                <div className="font-medium text-foreground/80 mb-1 font-mono">
                                  failure_reason_codes（技术码）
                                </div>
                                <div className="flex flex-wrap gap-1.5 font-mono">
                                  {card.failure_reason_codes.slice(0, 16).map((r: string, ri: number) => (
                                    <Badge
                                      key={`${r}-${ri}`}
                                      variant="outline"
                                      className="text-[9px] bg-muted/50"
                                      title={r}
                                    >
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {card?.details ? (
                              <pre className="text-[10px] leading-snug bg-background rounded border p-2 overflow-auto">
                                {typeof card.details === 'string'
                                  ? card.details
                                  : JSON.stringify(card.details, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}

              {Math.max(cardsUi.length, cardsAudit.length) > 20 ? (
                <div className="text-[11px] text-muted-foreground px-1">
                  已仅展示前 20 张证据卡（其余在审计日志/时间轴中查看）。
                </div>
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

