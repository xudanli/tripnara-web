/**
 * route_and_run：VERIFY issues、narration、simplified_explanation、三人格门控并列层。
 * 不替代 answer_text，与之并列，避免仅靠气泡首句。
 */

import { useMemo } from 'react';
import type {
  DecisionLogEntry,
  OrchestrationResult,
  RouteRunSimplifiedExplanation,
  VerifyIssue,
} from '@/api/agent';
import type { RouteRunIntentModeOption } from '@/lib/suggested-operations';
import type { AgentPoiDayBlock } from '@/lib/agent-poi-payload';
import type { ItineraryDayItemsBlock } from '@/lib/agent-itinerary-item-display';
import type { TimelinePoiScheduleContext } from '@/utils/opening-hours-schedule-check';
import type { SafetySurfacePayloadV1 } from '@/lib/safety-surface-payload';
import {
  pickFeasibilityHeadline,
  shouldShowGuardianPersonasInUi,
} from '@/lib/route-run-render-policy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, AlertCircle, AlertTriangle, ChevronRight, Shield, Tag, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { cn } from '@/lib/utils';
import {
  resolveRouteRunGuardianGateView,
  type RouteRunExplainGuardianMirror,
} from '@/lib/route-run-guardian-gate';
import { GuardianViolationsAuditBlock } from '@/components/agent/GuardianViolationsAuditBlock';
import { AdvisoryIssuesPanel } from '@/components/agent/AdvisoryIssuesPanel';
import {
  detectRouteRunSparsePoiDraft,
  extractDayByDayParagraphsFromAnswerText,
  extractOrchestrationNarration,
  extractVerifyIssuesFromSamePayload,
  mergeRouteRunDecisionLogs,
  timelineEchoesVerifyIssueCodes,
  advisoryIssueDisplayText,
  type OrchestrationNarrationSlice,
} from '@/lib/route-run-contract-extract';

const PERSONA_HEADLINE: Record<string, string> = {
  ABU: 'Abu · 安全 / 可达',
  DR_DRE: 'Dr.Dre · 疲劳 / 节奏',
  NEPTUNE: 'Neptune · 替换与结构',
};

function iconForEvidenceTag(tag: string): LucideIcon {
  const t = tag.toLowerCase();
  if (t.includes('safety') || t.includes('risk')) return Shield;
  if (t.includes('reachability') || t.includes('reachable')) return AlertCircle;
  if (t.includes('fatigue') || t.includes('pacing') || t.includes('pace')) return Activity;
  if (t.includes('replace') || t.includes('segment') || t.includes('repair')) return Wrench;
  return Tag;
}

function formatStringListish(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === 'string' ? x.trim() : JSON.stringify(x)))
      .filter((s) => s.length > 0);
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

function KeyDecisionsBlock({ kd }: { kd: unknown }) {
  if (kd == null) return null;
  if (typeof kd === 'string' && kd.trim()) {
    return <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{kd}</p>;
  }
  if (Array.isArray(kd)) {
    const lines = kd.map((x) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object' && 'summary' in (x as object)) {
        const s = (x as { summary?: string }).summary;
        return typeof s === 'string' ? s : JSON.stringify(x);
      }
      return JSON.stringify(x);
    });
    return (
      <ul className="list-disc list-inside text-[11px] text-muted-foreground space-y-0.5">
        {lines.map((line, i) => (
          <li key={i} className="leading-snug">
            {line}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <details className="text-[10px]">
      <summary className="cursor-pointer text-foreground/80">key_decisions（结构化）</summary>
      <pre className="mt-1 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono">
        {JSON.stringify(kd, null, 2)}
      </pre>
    </details>
  );
}

function NarrationSliceBlock({
  narration,
  dayFromAnswerExtract,
  preferZhLabels,
}: {
  narration: OrchestrationNarrationSlice | null;
  /** 与 hasAny 对齐，避免重复解析 answer_text */
  dayFromAnswerExtract: string | null;
  preferZhLabels: boolean;
}) {
  const tips = formatStringListish(narration?.tips);
  const warnings = formatStringListish(narration?.warnings);
  const dbb = narration?.day_by_day_narrative;
  const zh = narration?.day_by_day_text_zh?.trim();
  const dbbStr = typeof dbb === 'string' && dbb.trim() ? dbb.trim() : '';
  const fromAnswer = dayFromAnswerExtract?.trim() ? dayFromAnswerExtract.trim() : '';
  const primaryDayByDay = zh || fromAnswer || dbbStr;
  const structuredDbb =
    dbb != null && typeof dbb !== 'string' ? dbb : null;

  return (
    <div className="space-y-2 text-[11px]">
      {narration?.user_friendly_summary ? (
        <div>
          <div className="font-medium text-foreground/90 mb-0.5">编排叙述 · 摘要</div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {narration.user_friendly_summary}
          </p>
        </div>
      ) : null}
      {primaryDayByDay || structuredDbb != null ? (
        <div>
          <div className="font-medium text-foreground/90 mb-0.5">按日叙述</div>
          {primaryDayByDay ? (
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{primaryDayByDay}</p>
          ) : structuredDbb != null ? (
            <p className="text-[10px] text-muted-foreground/90 leading-relaxed">
              {preferZhLabels
                ? '正文见上方气泡；结构化按日数据见下方折叠区。'
                : 'See answer bubble above; structured day-by-day data is in the foldout below.'}
            </p>
          ) : null}
          {structuredDbb != null ? (
            <details className="mt-1.5 text-[10px]">
              <summary className="cursor-pointer text-foreground/80 select-none">
                {preferZhLabels ? 'day_by_day_narrative（结构化 · 调试）' : 'day_by_day_narrative (structured · debug)'}
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded border bg-muted/25 p-2 font-mono leading-snug">
                {JSON.stringify(structuredDbb, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
      {tips.length > 0 ? (
        <div>
          <div className="font-medium text-foreground/90 mb-0.5">提示</div>
          <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <div>
          <div className="font-medium text-amber-900/90 dark:text-amber-100 mb-0.5">警告</div>
          <ul className="list-disc list-inside text-amber-800/90 dark:text-amber-200/90 space-y-0.5">
            {warnings.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function issuePrimaryLabel(issue: VerifyIssue): string {
  return advisoryIssueDisplayText(issue) || (typeof issue.code === 'string' ? issue.code : '') || '可执行性说明';
}

function routeInfeasibleFamily(issue: VerifyIssue): boolean {
  const code = (issue.code ?? '').toUpperCase();
  return code.includes('ROUTE_INFEASIBLE') || code.includes('INFEASIBLE');
}

export type RouteRunContractLayersProps = {
  orchestrationResult?: OrchestrationResult | null;
  decisionLog?: DecisionLogEntry[] | null;
  routeRunExplainMirror?: RouteRunExplainGuardianMirror | null;
  simplifiedExplanation?: RouteRunSimplifiedExplanation | null;
  timelineDayBlocks?: ItineraryDayItemsBlock[] | null;
  poiCardsByDay?: AgentPoiDayBlock[] | null;
  routeRunNoPoiPlanningFlag?: boolean;
  safetySurface?: SafetySurfacePayloadV1 | null;
  preferZhLabels?: boolean;
  debugUiDefaults?: boolean;
  /** 与气泡正文同源：从中抽取「第N天」段落，供按日叙述回退展示 */
  answerTextForDayNarration?: string;
  /** 规划跟进：与 suggested_operations 再跑 route_and_run 同源 */
  onSuggestedRouteRun?: (
    message: string,
    tripIdOverride?: string,
    intentModeFromSuggestedPayload?: RouteRunIntentModeOption
  ) => void;
  /** 改排 intake：隐藏三人格门控块，保留同轮 gate violations / verify_issues */
  suppressGuardianPersonas?: boolean;
  /** 开放世界稀疏区：勿展示「POI 较少请补全」类负面 copy */
  suppressSparseNegativeCopy?: boolean;
  /** 目的地 IANA 时区；用于 POI_CLOSED 与 timeline 计划时间对齐 */
  timezone?: string;
  /** 已落库行程 POI 计划时间（优先于 Agent timeline） */
  tripPoiSchedules?: TimelinePoiScheduleContext[] | null;
};

export function RouteRunContractLayers({
  orchestrationResult,
  decisionLog,
  routeRunExplainMirror,
  simplifiedExplanation,
  timelineDayBlocks,
  poiCardsByDay,
  routeRunNoPoiPlanningFlag,
  safetySurface,
  preferZhLabels = false,
  debugUiDefaults = false,
  answerTextForDayNarration,
  onSuggestedRouteRun,
  suppressGuardianPersonas = false,
  suppressSparseNegativeCopy = false,
  timezone,
  tripPoiSchedules,
}: RouteRunContractLayersProps) {
  const narration = useMemo(
    () => extractOrchestrationNarration(orchestrationResult ?? undefined),
    [orchestrationResult]
  );

  const dayFromAnswer = useMemo(
    () => extractDayByDayParagraphsFromAnswerText(answerTextForDayNarration ?? ''),
    [answerTextForDayNarration]
  );

  const mergedLog = useMemo(
    () => mergeRouteRunDecisionLogs(decisionLog, orchestrationResult?.decision_log ?? null),
    [decisionLog, orchestrationResult]
  );

  const verifyIssues = useMemo(
    () =>
      extractVerifyIssuesFromSamePayload({
        orchestrationResult,
        safetySurface,
        decisionLog,
        timelineDayBlocks,
        tripPoiSchedules,
        timezone,
      }),
    [orchestrationResult, safetySurface, decisionLog, timelineDayBlocks, tripPoiSchedules, timezone]
  );

  const feasibilityHeadline = useMemo(
    () =>
      pickFeasibilityHeadline({
        orchestrationResult,
        safety_surface: safetySurface ?? undefined,
      }),
    [orchestrationResult, safetySurface]
  );

  const hasTimeline = (timelineDayBlocks?.length ?? 0) > 0;

  const conflicts = verifyIssues.filter((i) => String(i.class ?? '').toUpperCase() === 'CONFLICT');
  const advisories = verifyIssues.filter((i) => String(i.class ?? '').toUpperCase() !== 'CONFLICT');
  const showFeasibilityBanner = Boolean(feasibilityHeadline?.trim());
  const showGuardianPersonas =
    shouldShowGuardianPersonasInUi(debugUiDefaults) && !suppressGuardianPersonas;

  const guardianView = useMemo(
    () => resolveRouteRunGuardianGateView(orchestrationResult ?? undefined, routeRunExplainMirror ?? undefined),
    [orchestrationResult, routeRunExplainMirror]
  );

  const sparseDraft =
    !suppressSparseNegativeCopy &&
    (detectRouteRunSparsePoiDraft({ poiCardsByDay: poiCardsByDay ?? undefined, timelineDayBlocks }) ||
      Boolean(routeRunNoPoiPlanningFlag));

  const issueCodes = verifyIssues
    .map((i) => (typeof i.code === 'string' ? i.code : ''))
    .filter(Boolean);
  const timelineEcho = timelineEchoesVerifyIssueCodes(timelineDayBlocks ?? undefined, issueCodes);

  const engineBadge =
    guardianView.source === 'llm_debate' && guardianView.is_simulated === false
      ? { label: '合议引擎', variant: 'default' as const }
      : guardianView.source === 'violation_projection_v1' && guardianView.is_simulated === true
        ? { label: '规则投影 · 未跑 LLM', variant: 'secondary' as const }
        : null;

  const hasGuardianBody =
    guardianView.rows.length > 0 ||
    Boolean(guardianView.debate_summary_zh?.trim()) ||
    (guardianView.verifyAuditViolations?.length ?? 0) > 0;

  const personaAtomsSummaryLabel = guardianView.projectionEvidenceAtomsVerifyAligned
    ? '审计原子（VERIFY 对齐）'
    : '审计原子';

  const replaceVerdict = guardianView.rows.some(
    (r) => r.personaKey === 'NEPTUNE' && String(r.verdict ?? '').toUpperCase() === 'REPLACE'
  );

  /** C 端 L1：叙述正文已在 answer_text 气泡展示，勿重复渲染编排 narration 切片（含调试折叠） */
  const showNarrationBlock =
    debugUiDefaults &&
    (narration != null || (!hasTimeline && dayFromAnswer != null));
  const showSimplifiedBlock =
    debugUiDefaults &&
    simplifiedExplanation &&
    (Boolean(simplifiedExplanation.summary?.trim()) || simplifiedExplanation.key_decisions != null);

  const hasAny =
    showFeasibilityBanner ||
    (!showFeasibilityBanner && conflicts.length > 0) ||
    advisories.length > 0 ||
    showNarrationBlock ||
    showSimplifiedBlock ||
    (showGuardianPersonas && hasGuardianBody) ||
    sparseDraft;

  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-2 min-w-0 break-words [overflow-wrap:anywhere]">
      {showFeasibilityBanner ? (
            <Alert
              variant="destructive"
              className="py-2 border-red-200/80 bg-red-50/50 dark:bg-red-950/25 dark:border-red-900/50"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold break-words [overflow-wrap:anywhere]">
                可执行性提示
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed space-y-2 break-words [overflow-wrap:anywhere]">
                <p>{feasibilityHeadline}</p>
                {onSuggestedRouteRun ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        onSuggestedRouteRun(
                          '请以更合适的车型或交通方式重新权衡本段动线，重点解决可执行性冲突。',
                          undefined,
                          'TRIP_PLANNING'
                        )
                      }
                    >
                      去改车型 / 交通
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        onSuggestedRouteRun(
                          '请在不推翻整体节奏的前提下，调整当日路线顺序或拆分活动，消除可执行性冲突。',
                          undefined,
                          'TRIP_PLANNING'
                        )
                      }
                    >
                      改路线 / 动线
                    </Button>
                  </div>
                ) : null}
              </AlertDescription>
            </Alert>
      ) : null}

      {!showFeasibilityBanner && conflicts.length > 0 ? (
        <div className="space-y-2">
          {conflicts.map((issue, idx) => (
            <Alert
              key={`c-${idx}-${issue.code ?? idx}`}
              variant="destructive"
              className="py-2 border-red-200/80 bg-red-50/50 dark:bg-red-950/25 dark:border-red-900/50"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold break-words [overflow-wrap:anywhere]">
                可执行性 · {typeof issue.code === 'string' && issue.code.trim() ? issue.code : 'CONFLICT'}
              </AlertTitle>
              <AlertDescription className="text-[11px] leading-relaxed space-y-2 break-words [overflow-wrap:anywhere]">
                <p>{issuePrimaryLabel(issue)}</p>
                {timelineEcho ? (
                  <p className="text-[10px] opacity-90">
                    时间轴条目中出现与上述校验码相关的缓冲/占位语义，可与本说明对照查看。
                  </p>
                ) : null}
                {onSuggestedRouteRun && routeInfeasibleFamily(issue) ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        onSuggestedRouteRun(
                          '请以更合适的车型或交通方式重新权衡本段动线，重点解决「路线不可行 / ROUTE_INFEASIBLE」类冲突。',
                          undefined,
                          'TRIP_PLANNING'
                        )
                      }
                    >
                      去改车型 / 交通
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        onSuggestedRouteRun(
                          '请在不推翻整体节奏的前提下，调整当日路线顺序或拆分活动，消除可执行性冲突。',
                          undefined,
                          'TRIP_PLANNING'
                        )
                      }
                    >
                      改路线 / 动线
                    </Button>
                  </div>
                ) : onSuggestedRouteRun ? (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() =>
                        onSuggestedRouteRun(
                          '请针对上述可执行性冲突给出修订方案，并在尽量保留已确认约束的前提下重排相关日程。',
                          undefined,
                          'TRIP_PLANNING'
                        )
                      }
                    >
                      发起规划修订
                    </Button>
                  </div>
                ) : null}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      {advisories.length > 0 ? (
        <AdvisoryIssuesPanel
          issues={advisories}
          showDraftHint={sparseDraft}
          debugUiDefaults={debugUiDefaults}
        />
      ) : null}

      {sparseDraft && advisories.length === 0 ? (
        <div
          className="rounded-md border border-dashed border-border/80 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground"
          role="status"
        >
          当前为草案级排期（POI 较少或未跑完整 POI 规划）：建议补充必去点、扩大检索范围，或再发一轮约束说明。
        </div>
      ) : null}

      {showNarrationBlock || showSimplifiedBlock ? (
        <div className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5 space-y-3">
          {showNarrationBlock ? (
            <NarrationSliceBlock
              narration={narration}
              dayFromAnswerExtract={hasTimeline ? null : dayFromAnswer}
              preferZhLabels={preferZhLabels}
            />
          ) : null}
          {showSimplifiedBlock && simplifiedExplanation?.summary?.trim() ? (
            <div>
              <div className="font-medium text-foreground/90 mb-0.5 text-[11px]">解释摘要</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {simplifiedExplanation.summary}
              </p>
            </div>
          ) : null}
          {showSimplifiedBlock && simplifiedExplanation?.key_decisions != null ? (
            <div>
              <div className="font-medium text-foreground/90 mb-0.5 text-[11px]">关键决策</div>
              <KeyDecisionsBlock kd={simplifiedExplanation.key_decisions} />
            </div>
          ) : null}
        </div>
      ) : null}

      {showGuardianPersonas && hasGuardianBody ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-foreground">三人格门控（结构化）</div>
            <div className="flex flex-wrap gap-1">
              {engineBadge ? (
                <Badge variant={engineBadge.variant} className="text-[10px] font-normal">
                  {engineBadge.label}
                </Badge>
              ) : null}
              {guardianView.source ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  source:{guardianView.source}
                </Badge>
              ) : null}
              {guardianView.is_simulated === true ? (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  规则投影
                </Badge>
              ) : null}
              {guardianView.fromExplainMirror ? (
                <Badge variant="outline" className="text-[10px] font-normal">
                  explain 镜像
                </Badge>
              ) : null}
            </div>
          </div>
          {guardianView.debate_summary_zh ? (
            <p className="text-[11px] text-muted-foreground border-l-2 border-primary/30 pl-2 leading-relaxed">
              <span className="font-medium text-foreground/85">合议摘要 · </span>
              {guardianView.debate_summary_zh}
            </p>
          ) : null}
          {replaceVerdict ? (
            <p className="text-[10px] text-amber-900/90 dark:text-amber-200/90 rounded bg-amber-100/40 dark:bg-amber-950/40 px-2 py-1">
              Neptune 为 REPLACE：请留意残余结构与替换风险（与门控 Prompt 契约一致）。
            </p>
          ) : null}
          {guardianView.projectionEvidenceAtomsVerifyAligned ? (
            <p className="text-[10px] text-muted-foreground border-l-2 border-primary/25 pl-2 leading-relaxed">
              规则投影（violation_projection_v1）：VERIFY 后各人格 <code className="text-[10px]">evidence_atoms</code>{' '}
              已与可执行性校验对齐；explain.guardian_personas 与 gate_result.guardian_results 为同源只读镜像。
            </p>
          ) : null}
          {guardianView.rows.length > 0 ? (
            <ul className="space-y-2">
              {guardianView.rows.map((row, idx) => {
                const personaLabel = PERSONA_HEADLINE[row.personaKey] ?? row.personaKey;
                return (
                  <li
                    key={`${row.personaKey}-${idx}`}
                    className="rounded-md border border-border/70 bg-background/70 px-2 py-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <PersonaAvatar persona={row.personaKey} size={28} className="mt-0.5" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium text-foreground text-[11px]">{personaLabel}</span>
                          {row.verdict ? (
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                              {row.verdict}
                            </Badge>
                          ) : null}
                        </div>
                        {row.evidenceLines.length > 0 ? (
                          <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
                            {row.evidenceLines.map((line, i) => (
                              <li key={i} className="leading-snug">
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {row.evidence_atoms.length > 0 ? (
                          <details className="text-[10px] text-muted-foreground">
                            <summary className="cursor-pointer select-none text-foreground/80">
                              {personaAtomsSummaryLabel} ({row.evidence_atoms.length})
                            </summary>
                            <ul className="mt-1 space-y-1 pl-1 border-l border-border/60">
                              {row.evidence_atoms.map((atom, j) => {
                                const tag = atom.tag?.trim();
                                const TIcon = tag ? iconForEvidenceTag(tag) : Tag;
                                const tip = [atom.tag, atom.violation_code, atom.text]
                                  .filter(Boolean)
                                  .join(' · ');
                                return (
                                  <li
                                    key={j}
                                    title={tip || undefined}
                                    className="flex flex-wrap items-start gap-1.5"
                                  >
                                    {tag ? (
                                      <span className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-muted/40 px-1 py-0">
                                        <TIcon className="w-3 h-3 shrink-0" />
                                        <span>{tag}</span>
                                      </span>
                                    ) : null}
                                    {atom.violation_code ? (
                                      <code className="rounded bg-muted px-1 py-0 font-mono text-[10px]">
                                        {atom.violation_code}
                                      </code>
                                    ) : null}
                                    {atom.text ? (
                                      <span className="min-w-0 leading-snug">{atom.text}</span>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {guardianView.verifyAuditViolations && guardianView.verifyAuditViolations.length > 0 ? (
            <GuardianViolationsAuditBlock
              entries={guardianView.verifyAuditViolations}
              className="border-t border-border/60 pt-2 mt-2 space-y-1.5"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
