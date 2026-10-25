import { AlertTriangle, Binoculars } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  OrtToolsEvaluateShadowAttachment,
  OrtToolsPlanningShadowAttachment,
  OrtToolsShadowCandidate,
} from '@/types/ortools-shadow';

const SHADOW_COPY = 'OR-Tools Shadow · 非权威 · 不可写回';

function candidateLabel(candidate: OrtToolsShadowCandidate, index: number): string {
  return (
    candidate.label?.trim() ||
    candidate.candidateId?.trim() ||
    candidate.id?.trim() ||
    `观测候选 ${index + 1}`
  );
}

function changeLabel(change: Record<string, unknown>, index: number): string {
  const label = change.label ?? change.note ?? change.operation;
  if (typeof label === 'string' && label.trim()) return label.trim();
  return `观测变更 ${index + 1}`;
}

export interface OrtToolsEvaluateShadowPanelProps {
  shadow: OrtToolsEvaluateShadowAttachment;
  className?: string;
  /** 是否展示 Shadow（由 health.shadowRepairEnabled 门控） */
  enabled?: boolean;
}

/** Evaluate / Decision：旁路展示 shadowRepairCandidates + canary 审计 */
export function OrtToolsEvaluateShadowPanel({
  shadow,
  className,
  enabled = true,
}: OrtToolsEvaluateShadowPanelProps) {
  if (!enabled) return null;

  const stale = shadow.evidenceFreshness === 'STALE';
  const candidates = shadow.shadowRepairCandidates ?? [];
  const canary = shadow.canary;

  return (
    <section
      className={cn(
        'rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2.5',
        stale && 'opacity-60',
        className,
      )}
      aria-label={SHADOW_COPY}
    >
      <header className="mb-2 flex flex-wrap items-center gap-1.5">
        <Binoculars className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{SHADOW_COPY}</p>
        <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px] text-muted-foreground">
          仅对比
        </Badge>
        {shadow.solverOperation ? (
          <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px]">
            {shadow.solverOperation}
          </Badge>
        ) : null}
      </header>

      {stale ? (
        <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          证据已变更，请重新 Evaluate。此 Shadow 结果勿当作当前解。
        </p>
      ) : null}

      {shadow.solverUnavailableReason ? (
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          Solver 不可用：{shadow.solverUnavailableReason}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {shadow.neptuneCandidateCount != null ? (
          <span>Neptune {shadow.neptuneCandidateCount}</span>
        ) : null}
        {shadow.shadowCandidateCount != null ? (
          <span>Shadow {shadow.shadowCandidateCount}</span>
        ) : null}
        {canary?.canaryStage ? <span>阶段 {canary.canaryStage}</span> : null}
        {canary?.authoritativeProviderId ? (
          <span>权威 {canary.authoritativeProviderId}</span>
        ) : null}
      </div>

      {candidates.length > 0 ? (
        <ul className="space-y-1.5">
          {candidates.map((candidate, index) => (
            <li
              key={candidate.candidateId ?? candidate.id ?? `shadow-${index}`}
              className="rounded-lg border border-border/50 bg-card/60 px-2.5 py-1.5 text-[11px]"
            >
              <span className="font-medium text-foreground">
                {candidateLabel(candidate, index)}
              </span>
              {candidate.generatorVersion ? (
                <span className="ml-2 text-muted-foreground">{candidate.generatorVersion}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">暂无 Shadow 观测候选</p>
      )}

      {canary?.mergedIntoRepairCandidates === true && canary.mergedCandidateIds?.length ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          已并入权威集（只读审计）：{canary.mergedCandidateIds.join('、')}
        </p>
      ) : null}
    </section>
  );
}

export interface OrtToolsPlanningShadowPanelProps {
  shadow: OrtToolsPlanningShadowAttachment;
  className?: string;
  enabled?: boolean;
}

/** Arrange / PlanProposal：并列展示 shadowChanges（不会写入） */
export function OrtToolsPlanningShadowPanel({
  shadow,
  className,
  enabled = true,
}: OrtToolsPlanningShadowPanelProps) {
  if (!enabled) return null;

  const stale = shadow.evidenceFreshness === 'STALE';
  const changes = shadow.shadowChanges ?? [];
  const lab = shadow.labCompare;

  return (
    <section
      className={cn(
        'rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2.5',
        stale && 'opacity-60',
        className,
      )}
      aria-label={SHADOW_COPY}
    >
      <header className="mb-2 flex flex-wrap items-center gap-1.5">
        <Binoculars className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{SHADOW_COPY}</p>
        <Badge variant="outline" className="h-4 rounded-full px-1.5 text-[9px] text-muted-foreground">
          对比稿 · 不会写入
        </Badge>
      </header>

      {stale ? (
        <p className="mb-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          证据已变更，请重新生成草案后再对比。
        </p>
      ) : null}

      {shadow.solverUnavailableReason ? (
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          Solver 不可用：{shadow.solverUnavailableReason}
        </p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {shadow.legacyChangeCount != null ? (
          <span>权威变更 {shadow.legacyChangeCount}</span>
        ) : null}
        {shadow.shadowChangeCount != null ? (
          <span>Shadow 变更 {shadow.shadowChangeCount}</span>
        ) : null}
        {shadow.dayIndex != null ? <span>Day {shadow.dayIndex}</span> : null}
      </div>

      {lab ? (
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          {lab.summary?.trim() ||
            [
              lab.orderConsistent == null
                ? null
                : lab.orderConsistent
                  ? '顺序一致'
                  : '顺序不一致',
              lab.distanceDeltaMeters != null
                ? `路程差 ${Math.round(lab.distanceDeltaMeters)} m`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') ||
            '含 labCompare 对比'}
        </p>
      ) : null}

      {changes.length > 0 ? (
        <ul className="space-y-1.5">
          {changes.map((change, index) => (
            <li
              key={`shadow-change-${index}`}
              className="rounded-lg border border-border/50 bg-card/60 px-2.5 py-1.5 text-[11px] text-muted-foreground"
            >
              {changeLabel(change, index)}
              {typeof change.dayIndex === 'number' || typeof change.day_index === 'number' ? (
                <span className="ml-2">
                  Day {String(change.dayIndex ?? change.day_index)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted-foreground">暂无 Shadow 对比变更</p>
      )}
    </section>
  );
}
