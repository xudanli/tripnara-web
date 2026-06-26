/**
 * result.payload.actionExecutionPreview — 物理预览卡片（与 answer_text 分工）。
 */

import { useMemo } from 'react';
import type {
  ActionExecutionPreviewPayload,
  ActionPreviewAssessmentDto,
  OrchestrationResult,
  SuggestedHealingOptionItemDto,
} from '@/api/agent';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  agentStructuredContentMaxClass,
  useAgentSidebarContentFullWidth,
} from '@/hooks/use-agent-sidebar-content-width';
import { useTranslation } from 'react-i18next';
import PendingActionChips from '@/components/agent/PendingActionChips';
import { normalizePendingActions } from '@/lib/pending-action.util';
import { AlertTriangle, ChevronRight, Wrench } from 'lucide-react';

export type AdoptHealingPreviewHandler = (params: {
  messageId: string;
  actionId: string;
  option_id: string;
  healed_action_input: Record<string, unknown>;
  orchestrationResult?: OrchestrationResult | null;
}) => void | Promise<void>;

import {
  formatActionPreviewStatus,
  formatActionPreviewTitle,
  formatInterruptMode,
} from '@/lib/physical-gate-display.util';

const KIND_LABELS: Record<string, string> = {
  TEMPORAL_SHIFT: '整体平移时间',
  ROUTE_REOPTIMIZE: '改线',
};

function riskBadgeClass(risk: string | undefined): string {
  const r = (risk ?? '').toUpperCase();
  if (r === 'HIGH') return 'border-red-300 bg-red-50 text-red-900 dark:bg-red-950/40';
  if (r === 'MEDIUM') return 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30';
  return 'border-border bg-muted/60';
}

function violationText(v: { detail?: string; message?: string; code?: string }): string {
  return (
    (typeof v.detail === 'string' && v.detail) ||
    (typeof v.message === 'string' && v.message) ||
    (typeof v.code === 'string' && v.code) ||
    '—'
  );
}

export function ActionExecutionPreviewPanel({
  preview,
  pendingActions,
  orchestrationResult,
  tripId,
  messageId,
  adoptBusyKey,
  onAdoptHealingPreview,
  suppressAnswerDuplicationNote,
  showDebugFields = false,
}: {
  preview: ActionExecutionPreviewPayload;
  /** payload.actionExecution.pendingActions */
  pendingActions?: unknown[] | null;
  orchestrationResult?: OrchestrationResult | null;
  tripId?: string | null;
  messageId: string;
  adoptBusyKey?: string | null;
  onAdoptHealingPreview?: AdoptHealingPreviewHandler;
  /** answer_text 已含「物理门」段落时提示去重 */
  suppressAnswerDuplicationNote?: boolean;
  showDebugFields?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const previews = preview.action_previews ?? [];
  const pendingChips = useMemo(() => normalizePendingActions(pendingActions), [pendingActions]);

  const headerCounts = useMemo(() => {
    const hi = preview.high_risk_count;
    const rq = preview.requires_confirmation_count;
    const parts: string[] = [];
    if (typeof rq === 'number') {
      parts.push(
        t('agent.physicalGate.pendingCount', { defaultValue: '待确认 {{count}}', count: rq })
      );
    }
    if (typeof hi === 'number') {
      parts.push(
        t('agent.physicalGate.highRiskCount', { defaultValue: '高风险 {{count}}', count: hi })
      );
    }
    return parts.join(' · ');
  }, [preview.high_risk_count, preview.requires_confirmation_count, t]);

  const assistantFullWidth = useAgentSidebarContentFullWidth();
  const contentMaxClass = agentStructuredContentMaxClass(assistantFullWidth);

  if (previews.length === 0 && !preview.message) return null;

  return (
    <div className={cn('mt-3 space-y-3', contentMaxClass)}>
      <div className="rounded-lg border border-border/90 bg-card px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            {t('agent.physicalGate.title', { defaultValue: '现实约束预警' })}
          </span>
          <Badge variant="outline" className="text-[10px] font-normal">
            {preview.status ?? '—'}
          </Badge>
          {preview.context_signature ? (
            <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]" title={preview.context_signature}>
              ctx: …{preview.context_signature.slice(-8)}
            </span>
          ) : null}
        </div>
        {preview.message ? (
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{preview.message}</p>
        ) : null}
        {headerCounts ? <p className="mt-1 text-[10px] text-muted-foreground">{headerCounts}</p> : null}
      </div>

      {pendingChips.length > 0 ? <PendingActionChips actions={pendingChips} /> : null}

      {previews.map((ap) => (
        <ActionPreviewSection
          key={ap.action_id}
          ap={ap}
          tripId={tripId}
          messageId={messageId}
          orchestrationResult={orchestrationResult}
          adoptBusyKey={adoptBusyKey}
          onAdoptHealingPreview={onAdoptHealingPreview}
          showDebugFields={showDebugFields}
          isZh={isZh}
        />
      ))}

      {suppressAnswerDuplicationNote ? (
        <p className="text-[10px] text-amber-900/90 dark:text-amber-100/90 rounded bg-amber-50/80 dark:bg-amber-950/30 px-2 py-1 border border-amber-200/70">
          {t('agent.physicalGate.dedupeNote', {
            defaultValue: '若正文已含同类预警，可与下列卡片去重阅读。',
          })}
        </p>
      ) : null}
    </div>
  );
}

function ActionPreviewSection({
  ap,
  tripId,
  messageId,
  orchestrationResult,
  adoptBusyKey,
  onAdoptHealingPreview,
  showDebugFields,
  isZh,
}: {
  ap: ActionPreviewAssessmentDto;
  tripId?: string | null;
  messageId: string;
  orchestrationResult?: OrchestrationResult | null;
  adoptBusyKey?: string | null;
  onAdoptHealingPreview?: AdoptHealingPreviewHandler;
  showDebugFields?: boolean;
  isZh: boolean;
}) {
  const { t } = useTranslation();
  const blocked = ap.status === 'blocked';
  const suggestMode = ap.physical_validator_interrupt_mode === 'INTERRUPT_WITH_SUGGESTION';
  const violations = ap.physical_validation?.violations;
  const actionTitle = formatActionPreviewTitle(ap.action_id, isZh);
  const statusLabel = formatActionPreviewStatus(ap.status, isZh);
  const interruptLabel = formatInterruptMode(ap.physical_validator_interrupt_mode, isZh);

  return (
    <div className="rounded-lg border border-border/80 bg-muted/15 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/30">
        <span className="text-xs font-medium text-foreground">{actionTitle}</span>
        <Badge
          variant={blocked ? 'destructive' : 'secondary'}
          className="text-[10px] font-normal"
        >
          {statusLabel}
        </Badge>
        {interruptLabel ? (
          <Badge variant="outline" className="text-[10px] font-normal max-w-[240px] truncate">
            {interruptLabel}
          </Badge>
        ) : null}
        {showDebugFields ? (
          <span className="font-mono text-[10px] text-muted-foreground">{ap.action_id}</span>
        ) : null}
      </div>

      <div className="p-3 space-y-3">
        {blocked && violations && violations.length > 0 ? (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-xs">
              {t('agent.physicalGate.violationTitle', { defaultValue: '现实约束未满足' })}
            </AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              {violations.map((v, i) => (
                <div key={i}>{violationText(v)}</div>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        {showDebugFields && ap.physical_validation ? (
          <Collapsible className="rounded-md border border-border/70 bg-background/50">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-between h-8 px-2 text-[11px]">
                {t('agent.physicalGate.debugValidation', { defaultValue: '校验详情（调试）' })}
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-2 pb-2">
              <pre className="max-h-40 overflow-auto rounded border bg-muted/40 p-2 text-[10px] leading-snug text-muted-foreground">
                {JSON.stringify(ap.physical_validation, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {ap.preconditions && ap.preconditions.length > 0 ? (
          <div className="text-xs space-y-1">
            <span className="font-medium text-foreground">
              {t('agent.physicalGate.preconditions', { defaultValue: '需满足的前置条件' })}
            </span>
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              {ap.preconditions.map((p, i) => (
                <li key={i}>
                  {showDebugFields && p.code ? (
                    <code className="mr-1 rounded bg-muted px-1">{p.code}</code>
                  ) : null}
                  {p.message ?? ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {suggestMode && ap.suggested_healing_options && ap.suggested_healing_options.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Wrench className="h-3.5 w-3.5" />
              {t('agent.physicalGate.healingOptions', { defaultValue: '建议调整方案' })}
            </div>
            {ap.suggested_healing_options.map((opt) => (
              <HealingOptionCard
                key={opt.option_id}
                opt={opt}
                actionId={ap.action_id}
                messageId={messageId}
                tripId={tripId}
                orchestrationResult={orchestrationResult}
                adoptBusyKey={adoptBusyKey}
                onAdopt={onAdoptHealingPreview}
                showDebugFields={showDebugFields}
              />
            ))}
          </div>
        ) : blocked && !suggestMode ? (
          <p className="text-xs text-muted-foreground">
            {t('agent.physicalGate.blockedNoHeal', {
              defaultValue: '当前约束下无法自动给出调整方案，请手动修改行程。',
            })}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function HealingOptionCard({
  opt,
  actionId,
  messageId,
  tripId,
  orchestrationResult,
  adoptBusyKey,
  onAdopt,
  showDebugFields = false,
}: {
  opt: SuggestedHealingOptionItemDto;
  actionId: string;
  messageId: string;
  tripId?: string | null;
  orchestrationResult?: OrchestrationResult | null;
  adoptBusyKey?: string | null;
  onAdopt?: AdoptHealingPreviewHandler;
  showDebugFields?: boolean;
}) {
  const { t } = useTranslation();
  const kindLabel = opt.kind ? KIND_LABELS[opt.kind] ?? opt.kind : '';
  const ts = opt.temporal_shift;
  const busy = adoptBusyKey === `${messageId}:${opt.option_id}`;

  return (
    <Card className="border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/15">
      <CardHeader className="py-2.5 px-3 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{opt.summary}</p>
          {ts?.risk != null ? (
            <Badge variant="outline" className={cn('shrink-0 text-[10px]', riskBadgeClass(String(ts.risk)))}>
              {String(ts.risk)}
            </Badge>
          ) : null}
        </div>
        {kindLabel ? (
          <p className="text-[10px] text-muted-foreground">{kindLabel}</p>
        ) : null}
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-2 text-xs">
        {(ts?.rationale || ts?.condition_text) ? (
          <p className="text-muted-foreground leading-relaxed">{ts?.rationale ?? ts?.condition_text}</p>
        ) : null}
        {(ts?.shift_days != null || ts?.suggested_enter_at || ts?.enter_at) && showDebugFields ? (
          <ul className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
            {ts?.shift_days != null ? <li>shift_days: {ts.shift_days}</li> : null}
            {(ts?.suggested_enter_at || ts?.enter_at) ? (
              <li>enter_at: {String(ts.suggested_enter_at ?? ts.enter_at)}</li>
            ) : null}
          </ul>
        ) : null}
        {typeof ts?.shift_days === 'number' ? (
          <p className="text-[10px] text-amber-900/85 dark:text-amber-100/85 border-t border-amber-200/60 pt-2">
            {t('agent.physicalGate.shiftDaysHint', {
              defaultValue: '若整体平移 {{days}} 天，行程内其它日期通常需同步平移相同天数。',
              days: ts.shift_days,
            })}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !tripId || !onAdopt}
            onClick={() =>
              void onAdopt?.({
                messageId,
                actionId,
                option_id: opt.option_id,
                healed_action_input: opt.healed_action_input,
                orchestrationResult,
              })
            }
          >
            {busy ? '预览中…' : t('agent.physicalGate.adoptPreview', { defaultValue: '预览调整效果' })}
          </Button>
          {showDebugFields && opt.healing_one_click_action_id ? (
            <Badge variant="outline" className="text-[9px] font-normal">
              {opt.healing_one_click_action_id}
            </Badge>
          ) : null}
          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]" title={opt.option_id}>
            id: {opt.option_id}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
