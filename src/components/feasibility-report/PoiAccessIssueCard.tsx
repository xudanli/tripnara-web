import { useMemo, useState } from 'react';
import { ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FeasibilityIssueDto, FeasibilityRepairOptionDto } from '@/types/trip-feasibility-report';
import type { PoiCrowdingSnapshot } from '@/types/poi-access-capacity';
import type { TripDetail } from '@/types/trip';
import ReservationEvidenceDialog from '@/components/feasibility-report/ReservationEvidenceDialog';
import {
  collectPoiAccessPlanBOptions,
  poiAccessVerdictLabel,
  resolvePlanBDisplayLabel,
} from '@/lib/poi-access-display.util';
import {
  findReservationEvidenceManualConfirmOption,
  resolveReservationEvidenceFormContext,
  shouldOpenReservationEvidenceModal,
  type ReservationEvidenceFormContext,
} from '@/lib/poi-access-reservation-evidence.util';
import { listReservationEvidenceForItem } from '@/lib/trip-reservation-evidence-save.util';
import { cn } from '@/lib/utils';

function resolveCanGoText(issue: FeasibilityIssueDto): string {
  const evaluation = issue.visitorAccess?.evaluation ?? issue.accessEvaluation;
  if (evaluation?.message) return evaluation.message;
  if (issue.issueKind === 'poi_access_blocked') return '当前条件下无法按计划进入';
  if (issue.issueKind === 'poi_access_unknown') return '官方信息待确认，出发前务必复查';
  if (issue.issueKind === 'poi_access_reservation_required') {
    return '该时段需预约，请自行确认并上传凭证';
  }
  return issue.message;
}

function resolveSuitableText(
  crowding?: PoiCrowdingSnapshot,
  evaluationDetail?: string,
): string | null {
  if (crowding?.level) {
    const levelLabel =
      crowding.level === 'LOW'
        ? '客流较低'
        : crowding.level === 'MEDIUM'
          ? '客流适中'
          : crowding.level === 'HIGH'
            ? '客流较高'
            : '可能已满';
    const suffix = crowding.disclosureLabel ? `（${crowding.disclosureLabel}）` : '';
    return `${levelLabel}${suffix}`;
  }
  return evaluationDetail ?? null;
}

function externalRepairOptions(options?: FeasibilityIssueDto['repairOptions']) {
  return (options ?? []).filter(
    (opt) =>
      opt.actionType === 'book_parking' ||
      opt.actionType === 'book_timed_entry' ||
      Boolean(opt.metadata?.externalUrl),
  );
}

export interface PoiAccessIssueCardProps {
  issue: FeasibilityIssueDto;
  tripId?: string;
  trip?: TripDetail | null;
  className?: string;
  onEvidenceSaved?: () => void;
}

export default function PoiAccessIssueCard({
  issue,
  tripId,
  trip,
  className,
  onEvidenceSaved,
}: PoiAccessIssueCardProps) {
  const payload = issue.visitorAccess;
  const evaluation = payload?.evaluation ?? issue.accessEvaluation;
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [dialogContext, setDialogContext] = useState<ReservationEvidenceFormContext | null>(null);
  const manualOption = findReservationEvidenceManualConfirmOption(issue);
  const formContext = useMemo(
    () => (manualOption ? resolveReservationEvidenceFormContext(issue, manualOption) : null),
    [issue, manualOption],
  );

  if (!evaluation && !issue.issueKind?.startsWith('poi_access_')) return null;

  const verdict = evaluation?.verdict ?? (issue.issueKind === 'poi_access_blocked' ? 'BLOCKED' : 'UNKNOWN');
  const poiName = evaluation?.poiName ?? issue.title;
  const canGo = resolveCanGoText(issue);
  const suitable = resolveSuitableText(evaluation?.crowding, evaluation?.detail);
  const planB = collectPoiAccessPlanBOptions(evaluation ?? {});
  const bookingOptions = externalRepairOptions(issue.repairOptions);
  const sourceRule = evaluation?.applicableRules?.[0];
  const existingEvidence = formContext?.tripItemId
    ? listReservationEvidenceForItem(trip, formContext.tripItemId)
    : [];
  const hasReservationEvidence =
    Boolean(payload?.hasReservationEvidence) || existingEvidence.length > 0;

  const openEvidenceModal = (opt: FeasibilityRepairOptionDto) => {
    if (!tripId) {
      toast.error('缺少行程信息，请刷新页面后重试');
      return;
    }
    const ctx = resolveReservationEvidenceFormContext(issue, opt);
    if (!ctx) {
      toast.error('无法定位行程项，请点「重新验证」或从时间轴打开该 POI');
      return;
    }
    setDialogContext(ctx);
    setEvidenceDialogOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'rounded-lg border border-border/80 bg-muted/15 overflow-hidden',
          className,
        )}
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 bg-muted/25">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
          <span className="text-xs font-medium text-foreground truncate">{poiName}</span>
          <Badge variant="outline" className="text-[10px] h-5 ml-auto shrink-0">
            {poiAccessVerdictLabel(verdict)}
          </Badge>
        </div>
        <div className="divide-y divide-border/60 text-xs">
          <div className="px-3 py-2.5 space-y-0.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">能不能去</p>
            <p className="text-foreground leading-relaxed">{canGo}</p>
            {sourceRule ? (
              <p className="text-[10px] text-muted-foreground pt-1">
                来源：{sourceRule.sourceAuthority}
                {sourceRule.sourceUrl ? (
                  <>
                    {' · '}
                    <a
                      href={sourceRule.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      官方说明
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          {suitable ? (
            <div className="px-3 py-2.5 space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">是否合适</p>
              <p className="text-foreground leading-relaxed">{suitable}</p>
            </div>
          ) : null}
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">怎么改</p>
            {planB.length > 0 ? (
              <ul className="space-y-1">
                {planB.map((hint) => (
                  <li key={hint.id} className="text-foreground leading-relaxed pl-3 border-l border-border/80">
                    {resolvePlanBDisplayLabel(hint)}
                    {hint.description ? (
                      <span className="text-muted-foreground"> — {hint.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground leading-relaxed">
                {issue.actionRequired ?? '调整到达时段、改走 Plan B，或上传预约凭证。'}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {bookingOptions.map((opt) => {
                const href = (opt.metadata?.externalUrl as string | undefined) ?? undefined;
                if (!href) return null;
                return (
                  <Button key={opt.id} variant="outline" size="sm" className="h-7 text-[11px]" asChild>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {opt.label}
                    </a>
                  </Button>
                );
              })}
              {!hasReservationEvidence && manualOption && shouldOpenReservationEvidenceModal(manualOption, issue) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-[11px]"
                  type="button"
                  onClick={() => openEvidenceModal(manualOption)}
                >
                  {manualOption.label}
                </Button>
              ) : null}
            </div>
            {hasReservationEvidence ? (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                已上传预约凭证
                {existingEvidence[0]?.confirmationCode
                  ? `（${existingEvidence[0].confirmationCode}）`
                  : ''}
              </p>
            ) : null}
          </div>
        </div>
        {evaluation?.crowding?.disclosureLabel ? (
          <div className="flex items-start gap-1.5 px-3 py-2 text-[10px] text-muted-foreground border-t border-border/60 bg-muted/10">
            <Info className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
            <span>{evaluation.crowding.disclosureLabel}</span>
          </div>
        ) : null}
        {payload?.deferredLive ? (
          <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border/60 bg-muted/10">
            实时库存暂未接入；请通过官方渠道自行确认后上传凭证。
          </p>
        ) : null}
      </div>

      {tripId ? (
        <ReservationEvidenceDialog
          open={evidenceDialogOpen}
          onOpenChange={setEvidenceDialogOpen}
          tripId={tripId}
          trip={trip}
          context={dialogContext ?? formContext}
          onSaved={onEvidenceSaved}
        />
      ) : null}
    </>
  );
}
