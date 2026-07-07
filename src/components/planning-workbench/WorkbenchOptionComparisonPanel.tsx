import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  KernelGateOptionDelta,
  OptionComparison,
  OptionComparisonEntry,
} from '@/api/planning-workbench';
import { getGateStatusClasses, getGateStatusLabel, normalizeGateStatus } from '@/lib/gate-status';
import { cn } from '@/lib/utils';
import { AlertTriangle, Shield } from 'lucide-react';

const SCORE_LABELS: Record<string, string> = {
  executability: '可执行性',
  cost: '成本',
  fatigue: '疲劳',
  risk: '风险',
};

function GateBadge({ status }: { status: string }) {
  const normalized = normalizeGateStatus(status);
  return (
    <Badge variant="outline" className={cn('text-[10px]', getGateStatusClasses(normalized))}>
      {getGateStatusLabel(normalized)}
    </Badge>
  );
}

function OptionScores({ scores }: { scores?: Record<string, number> }) {
  if (!scores || Object.keys(scores).length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Object.entries(scores).map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-[10px] font-normal">
          {SCORE_LABELS[key] ?? key}: {Math.round(value)}
        </Badge>
      ))}
    </div>
  );
}

function L3EvidenceList({ items }: { items: KernelGateOptionDelta['l3Evidence'] }) {
  if (!items?.length) return null;
  return (
    <ul className="mt-2 space-y-1.5 text-xs">
      {items.map((ev) => (
        <li
          key={`${ev.cid}-${ev.detail}`}
          className="rounded border border-border/80 bg-muted/30 px-2 py-1.5"
        >
          <span className="font-mono text-[10px] text-muted-foreground">{ev.cid}</span>
          <p className="mt-0.5 leading-snug">{ev.detail}</p>
          {(ev.slack != null || ev.limit != null) && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {ev.slack != null ? `slack ${ev.slack}` : null}
              {ev.slack != null && ev.limit != null ? ' · ' : null}
              {ev.limit != null ? `limit ${ev.limit}` : null}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function OptionCard({
  entry,
  gateDelta,
  isRecommended,
}: {
  entry: OptionComparisonEntry;
  gateDelta?: KernelGateOptionDelta;
  isRecommended?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isRecommended ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium">{entry.label ?? entry.optionId}</span>
        <div className="flex items-center gap-1.5">
          {gateDelta && <GateBadge status={gateDelta.gateStatus} />}
          {isRecommended && (
            <Badge className="text-[10px]">推荐</Badge>
          )}
        </div>
      </div>
      {entry.tradeoffs?.length ? (
        <ul className="mt-1.5 space-y-1">
          {entry.tradeoffs.map((item, index) => (
            <li key={index} className="flex gap-1.5 text-xs text-muted-foreground leading-relaxed">
              <span className="shrink-0">·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {entry.budget?.costDisplayValue && (
        <p className="mt-1.5 text-xs font-medium tabular-nums">{entry.budget.costDisplayValue}</p>
      )}
      <OptionScores scores={entry.scores} />
      {gateDelta && gateDelta.violationCount > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          违规 {gateDelta.violationCount}
          {gateDelta.violationTypes.length > 0
            ? `（${gateDelta.violationTypes.join('、')}）`
            : null}
          {gateDelta.dominantCid ? ` · dominant_cid=${gateDelta.dominantCid}` : null}
        </p>
      )}
      <L3EvidenceList items={gateDelta?.l3Evidence} />
    </div>
  );
}

export interface WorkbenchOptionComparisonPanelProps {
  comparison: OptionComparison;
  className?: string;
  /** 运营 / 调试字段 */
  showAudit?: boolean;
}

/**
 * 多方案对比展示：以 comparison.recommendation.optionId 为准，不客户端改分。
 */
export function WorkbenchOptionComparisonPanel({
  comparison,
  className,
  showAudit = false,
}: WorkbenchOptionComparisonPanelProps) {
  const { options = [], recommendation, kernelGateEval } = comparison;
  const gateByOption = new Map(
    (kernelGateEval?.optionDeltas ?? []).map((d) => [d.optionId, d]),
  );
  const recommendedId =
    comparison.budgetComparison?.recommendedPlanId ?? recommendation?.optionId;

  if (!options.length && !recommendation && !kernelGateEval) return null;

  const diverges = kernelGateEval?.divergesFromLlmRecommendation === true;

  return (
    <div className={cn('space-y-4', className)}>
      {diverges && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1.5 min-w-0">
              <p className="font-medium text-amber-950">Kernel 门控与 LLM 推荐不一致</p>
              {kernelGateEval?.llmRecommendedOptionId && (
                <p>
                  LLM 推荐：
                  <span className="font-mono ml-1">{kernelGateEval.llmRecommendedOptionId}</span>
                </p>
              )}
              {kernelGateEval?.recommendedByGate && (
                <p className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-amber-700" />
                  Kernel 门控推荐：
                  <span className="font-mono">{kernelGateEval.recommendedByGate}</span>
                  {kernelGateEval.recommendedDominantCid ? (
                    <span className="text-muted-foreground">
                      （dominant_cid={kernelGateEval.recommendedDominantCid}）
                    </span>
                  ) : null}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {recommendation && (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-1">系统推荐</p>
          <p className="text-sm">
            <span className="font-mono">{recommendation.optionId}</span>
            <span className="text-muted-foreground mx-1.5">—</span>
            <span className="text-xs leading-relaxed">{recommendation.reason}</span>
          </p>
        </div>
      )}

      {options.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((entry) => (
            <OptionCard
              key={entry.optionId}
              entry={entry}
              gateDelta={gateByOption.get(entry.optionId)}
              isRecommended={entry.optionId === recommendedId}
            />
          ))}
        </div>
      )}

      {showAudit && kernelGateEval?.decisionOsAudit && (
        <Card className="border-dashed">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              decisionOsAudit（调试）
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-[10px]">
              {JSON.stringify(kernelGateEval.decisionOsAudit, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
