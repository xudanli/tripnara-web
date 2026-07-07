import { AlertTriangle, CheckCircle2, Info, Loader2, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DECISION_EXECUTION_UI_VARIANT_META,
  type DecisionExecutionUiVariant,
} from '@/generated/decision-semantics-contracts';
import type { DecisionExecutionStatusResponse } from '@/types/decision-problem';

export interface DecisionExecutionStatusPanelProps {
  status: DecisionExecutionStatusResponse | null | undefined;
  polling?: boolean;
  variant?: DecisionExecutionUiVariant;
  effectiveDecisionId?: string | null;
  className?: string;
  onViewDecision?: (decisionId: string) => void;
  onRetry?: () => void;
  onRefreshEvidence?: () => void;
  onContinueRepair?: () => void;
  onReselectOption?: () => void;
  onViewItineraryChanges?: () => void;
}

function panelToneClass(variant: DecisionExecutionUiVariant): string {
  switch (variant) {
    case 'success':
      return 'border-gate-allow-border/80 bg-gate-allow/40 text-gate-allow-foreground';
    case 'neutral_replay':
      return 'border-border/80 bg-muted/15 text-muted-foreground';
    case 'warning_needs_repair':
    case 'blocked_stale_evidence':
      return 'border-border bg-muted/15 text-foreground';
    case 'error_rolled_back':
    case 'error_failed':
      return 'border-gate-reject-border/80 bg-gate-reject/40 text-gate-reject-foreground';
    case 'in_progress':
    default:
      return 'border-border/70 bg-background/80 text-foreground';
  }
}

function VariantIcon({ variant }: { variant: DecisionExecutionUiVariant }) {
  if (variant === 'success') return <CheckCircle2 className="h-4 w-4 text-gate-allow-foreground" />;
  if (variant === 'in_progress') return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (variant === 'neutral_replay') return <Info className="h-4 w-4 text-muted-foreground" />;
  if (variant === 'warning_needs_repair' || variant === 'blocked_stale_evidence') {
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  }
  return <RotateCcw className="h-4 w-4 text-gate-reject-foreground" />;
}

export function DecisionExecutionStatusPanel({
  status,
  polling,
  variant = 'in_progress',
  effectiveDecisionId,
  className,
  onViewDecision,
  onRetry,
  onRefreshEvidence,
  onContinueRepair,
  onReselectOption,
  onViewItineraryChanges,
}: DecisionExecutionStatusPanelProps) {
  if (!status && !polling) return null;

  const meta = DECISION_EXECUTION_UI_VARIANT_META[variant];
  const showLoading = polling || variant === 'in_progress';

  return (
    <div className={cn('rounded-xl border px-4 py-3.5 text-xs', panelToneClass(variant), className)}>
      <div className="flex flex-wrap items-center gap-2">
        <VariantIcon variant={variant} />
        <span className="font-medium">{meta.title}</span>
        {status?.status ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {status.status}
          </Badge>
        ) : null}
        {showLoading ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {polling ? '轮询中…' : null}
          </span>
        ) : null}
      </div>

      {status?.explanation ? (
        <p className="mt-1.5 text-[11px] leading-relaxed opacity-90">{status.explanation}</p>
      ) : null}

      {status?.postApplyCoherence?.failureMessage ? (
        <p className="mt-1.5 text-[11px] leading-relaxed font-medium">
          {status.postApplyCoherence.failureMessage}
        </p>
      ) : null}

      {status?.evidenceFreshnessBlock?.staleEvidenceTypes?.length ? (
        <p className="mt-1 text-[10px] opacity-80">
          过期证据：{status.evidenceFreshnessBlock.staleEvidenceTypes.join('、')}
        </p>
      ) : null}

      {status?.repairCommandApplied != null ? (
        <p className="mt-1 text-[10px] opacity-80">
          修复指令 {status.repairCommandApplied ? '已应用' : '未应用'}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        {variant === 'success' && onViewItineraryChanges ? (
          <Button type="button" size="sm" className="h-7 text-[11px]" onClick={onViewItineraryChanges}>
            {meta.cta}
          </Button>
        ) : null}
        {variant === 'neutral_replay' && effectiveDecisionId && onViewDecision ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => onViewDecision(effectiveDecisionId)}>
            {meta.cta}
          </Button>
        ) : null}
        {variant === 'warning_needs_repair' && onContinueRepair ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onContinueRepair}>
            {meta.cta}
          </Button>
        ) : null}
        {variant === 'blocked_stale_evidence' && onRefreshEvidence ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onRefreshEvidence}>
            {meta.cta}
          </Button>
        ) : null}
        {variant === 'error_rolled_back' && onReselectOption ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onReselectOption}>
            {meta.cta}
          </Button>
        ) : null}
        {variant === 'error_failed' && onRetry ? (
          <Button type="button" size="sm" variant="secondary" className="h-7 text-[11px]" onClick={onRetry}>
            {meta.cta}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
