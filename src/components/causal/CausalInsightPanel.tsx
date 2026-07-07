import { useState } from 'react';
import { ChevronDown, GitBranch, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getGateStatusClasses, normalizeGateStatus } from '@/lib/gate-status';
import type {
  CausalCounterfactualReport,
  CausalPersonaProjection,
  CausalPersonaSeat,
  IcelandSelfDriveCausalAssessment,
  IcelandCausalCalibration,
} from '@/types/causal-travel-runtime';

export interface CausalInsightPanelProps {
  projection?: CausalPersonaProjection;
  counterfactual?: CausalCounterfactualReport;
  iceland?: IcelandSelfDriveCausalAssessment;
  calibration?: IcelandCausalCalibration;
  className?: string;
}

function formatProb(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatMinutes(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)} min`;
}

const PERSONA_LABELS: Record<CausalPersonaSeat, string> = {
  ABU: 'Abu',
  DR_DRE: 'Dr.Dre',
  NEPTUNE: 'Neptune',
};

function PersonaSliceRow({
  persona,
  summary,
  verdict,
}: {
  persona: CausalPersonaSeat;
  summary?: string;
  verdict?: string;
}) {
  if (!summary?.trim() && !verdict?.trim()) return null;
  const normalized = verdict ? normalizeGateStatus(verdict) : null;
  const verdictStyle = normalized ? getGateStatusClasses(normalized) : undefined;

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium text-foreground">{PERSONA_LABELS[persona]}</span>
        {verdict ? (
          <Badge variant="outline" className={cn('text-[10px]', verdictStyle)}>
            {verdict}
          </Badge>
        ) : null}
      </div>
      {summary?.trim() ? <p className="text-muted-foreground leading-relaxed">{summary.trim()}</p> : null}
    </div>
  );
}

export function CausalInsightPanel({
  projection,
  counterfactual,
  iceland,
  calibration,
  className,
}: CausalInsightPanelProps) {
  const [chainExpanded, setChainExpanded] = useState(false);

  const narrative =
    projection?.presentation?.narrative ??
    counterfactual?.narrative ??
    undefined;
  const chain = projection?.causalChain ?? [];
  const evidence = projection?.evidence ?? [];
  const showCalibrationBadge = (calibration?.sampleCount ?? 0) > 0;

  if (!narrative && chain.length === 0 && !counterfactual && !iceland) {
    return null;
  }

  return (
    <Card className={cn('border-border/60', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">因果洞察</CardTitle>
          {projection?.kernelAuthoritative ? (
            <Badge variant="secondary" className="text-[10px]">
              Kernel 权威
            </Badge>
          ) : null}
          {showCalibrationBadge ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              模型已根据实况微调
            </Badge>
          ) : null}
        </div>
        {projection?.presentation?.headline ? (
          <CardDescription>{projection.presentation.headline}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {narrative ? (
          <p className="leading-relaxed text-foreground">{narrative}</p>
        ) : null}

        {projection?.abuSlice || projection?.dreSlice || projection?.neptuneSlice ? (
          <div className="space-y-2">
            <PersonaSliceRow
              persona="ABU"
              summary={projection.abuSlice?.summary}
              verdict={projection.abuSlice?.verdict}
            />
            <PersonaSliceRow
              persona="DR_DRE"
              summary={projection.dreSlice?.summary}
              verdict={projection.dreSlice?.verdict}
            />
            <PersonaSliceRow
              persona="NEPTUNE"
              summary={projection.neptuneSlice?.summary}
              verdict={projection.neptuneSlice?.verdict}
            />
          </div>
        ) : null}

        {iceland ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-foreground">冰岛自驾评估</p>
            <p className="text-muted-foreground">
              错过概率 {formatProb(iceland.missProb)} · P90 {formatMinutes(iceland.p90Minutes)}
            </p>
            {iceland.rationale ? (
              <p className="text-muted-foreground">{iceland.rationale}</p>
            ) : null}
          </div>
        ) : null}

        {chain.length > 0 ? (
          <div className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs"
              onClick={() => setChainExpanded((v) => !v)}
              aria-expanded={chainExpanded}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <GitBranch className="h-3.5 w-3.5" />
                因果链
                <span className="font-normal text-muted-foreground">({chain.length})</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-muted-foreground transition-transform',
                  chainExpanded && 'rotate-180',
                )}
              />
            </button>
            {chainExpanded ? (
              <ol className="space-y-2 border-t px-3 py-2">
                {chain.map((step, index) => (
                  <li key={step.stepId ?? `${step.slice ?? step.persona}-${index}`} className="text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {step.persona || step.slice ? (
                        <Badge variant="outline" className="text-[10px]">
                          {step.persona ?? step.slice}
                        </Badge>
                      ) : null}
                      {step.label ? (
                        <span className="font-medium text-foreground">{step.label}</span>
                      ) : null}
                    </div>
                    {step.summary ? (
                      <p className="mt-0.5 text-muted-foreground">{step.summary}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        {evidence.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {evidence.map((item, index) => (
              <li key={item.id ?? `evidence-${index}`}>
                {item.label ?? item.kind ?? '证据'}：{item.summary ?? '—'}
              </li>
            ))}
          </ul>
        ) : null}

        {counterfactual ? (
          <div className="rounded-md border border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20 px-3 py-2 space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <Scale className="h-3.5 w-3.5" />
              预测 vs 实况
            </p>
            {counterfactual.userFacingAssessment ? (
              <p className="text-xs leading-relaxed">{counterfactual.userFacingAssessment}</p>
            ) : null}
            {counterfactual.metricDeltas && Object.keys(counterfactual.metricDeltas).length > 0 ? (
              <dl className="grid gap-1 text-[11px]">
                {Object.entries(counterfactual.metricDeltas).map(([key, delta]) => (
                  <div key={key} className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-foreground">{key}</dt>
                    <dd>
                      预测 {delta.predicted ?? '—'} → 实况 {delta.observed ?? '—'}
                      {delta.delta != null ? ` (Δ ${delta.delta})` : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
