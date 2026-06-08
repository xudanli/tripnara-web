/**
 * 编排进度卡片（展示 ui_state 与 orchestrationResult）
 * 用于规划工作台、Agent 等场景，当后端返回编排数据时展示
 */

import { useState } from 'react';
import type { OrchestrationResult, OrchestrationUiState } from '@/api/agent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Activity, AlertCircle, ChevronRight, Route as RouteIcon, Shield, Tag, Wrench } from 'lucide-react';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translateOrchestrationStepForUser } from '@/lib/agent-display-zh';
import {
  resolveRouteRunGuardianGateView,
  type RouteRunExplainGuardianMirror,
} from '@/lib/route-run-guardian-gate';
import { GuardianViolationsAuditBlock } from '@/components/agent/GuardianViolationsAuditBlock';
import { GateConstraintSinkAnchor } from '@/features/planning/components/GateConstraintSinkAnchor';
import type { ConstraintSinkUiAnchorV1 } from '@/contracts/memory-console-ui-state.v1';

export type { OrchestrationUiState, OrchestrationResult } from '@/api/agent';

const ORCHESTRATION_PHASE_LABELS: Record<string, string> = {
  INTAKE: '接收请求',
  STATE_UPDATE: '状态更新',
  RESEARCH: '调研中',
  GATE_EVAL: '评估可行性',
  CONTEXT_BUILD: '构建上下文',
  PLAN_GEN: '生成行程',
  OPTIMIZE: '优化中',
  VERIFY: '验证中',
  COMPLIANCE: '合规检查',
  REPAIR: '修复中',
  NARRATE: '生成说明',
  FEEDBACK: '反馈处理',
  DONE: '已完成',
  FAILED: '失败',
  TIMEOUT: '超时',
  HALLUCINATION_DETECTION: '幻觉检测',
};

interface OrchestrationProgressCardProps {
  ui_state?: OrchestrationUiState | null;
  orchestrationResult?: OrchestrationResult | null;
  /**
   * explain.guardian_personas 同源镜像：仅当 payload 未携带可渲染的 `gate_result.guardian_results` 时使用。
   */
  explainGuardianMirror?: RouteRunExplainGuardianMirror | null;
  /** constraint_sink 依据行（与 ledger_healing 独立） */
  constraintSinkAnchor?: ConstraintSinkUiAnchorV1 | null;
  onOpenEvidenceDrawer?: (opts: { tab: 'memory'; highlightPatchId?: string }) => void;
  /** 用户页：步骤名等枚举显示中文；调试页勿传或传 false */
  preferZhLabels?: boolean;
}

const PERSONA_HEADLINE: Record<string, string> = {
  ABU: 'Abu · 安全 / 可达',
  DR_DRE: 'Dr.Dre · 疲劳 / 节奏',
  NEPTUNE: 'Neptune · 替换与结构',
};

function iconForEvidenceTag(tag: string): LucideIcon {
  const t = tag.toLowerCase();
  if (t.includes('safety') || t.includes('risk')) return Shield;
  if (t.includes('reachability') || t.includes('reachable')) return RouteIcon;
  if (t.includes('fatigue') || t.includes('pacing') || t.includes('pace')) return Activity;
  if (t.includes('replace') || t.includes('segment') || t.includes('repair')) return Wrench;
  return Tag;
}

export function OrchestrationProgressCard({
  ui_state,
  orchestrationResult,
  explainGuardianMirror,
  constraintSinkAnchor,
  onOpenEvidenceDrawer,
  preferZhLabels = false,
}: OrchestrationProgressCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const steps = ui_state?.steps;
  const hasSteps = Boolean(steps && steps.length > 0);

  const hasUiState =
    ui_state &&
    (ui_state.phase ||
      ui_state.progress_percent != null ||
      ui_state.message ||
      ui_state.current_step_detail ||
      ui_state.estimated_time_remaining_ms != null ||
      hasSteps);

  const guardianView = resolveRouteRunGuardianGateView(
    orchestrationResult ?? undefined,
    explainGuardianMirror ?? undefined
  );
  const legacyGate = orchestrationResult?.gate_result;
  const legacyHasSurface = Boolean(
    (typeof legacyGate?.reason === 'string' && legacyGate.reason.trim()) ||
      (typeof legacyGate?.result === 'string' && legacyGate.result.trim()) ||
      (legacyGate?.warnings?.length ?? 0) > 0 ||
      (legacyGate?.recommendations?.length ?? 0) > 0 ||
      (legacyGate?.violations?.length ?? 0) > 0
  );
  const hasGuardianStructured =
    guardianView.rows.length > 0 ||
    Boolean(guardianView.debate_summary_zh?.trim()) ||
    (guardianView.verifyAuditViolations?.length ?? 0) > 0;
  const hasGateSection = hasGuardianStructured || legacyHasSurface;
  const hasConstraintSink = Boolean(constraintSinkAnchor);
  const hasContent = hasUiState || hasGateSection || hasConstraintSink;

  const engineBadge =
    guardianView.source === 'llm_debate' && guardianView.is_simulated === false
      ? { label: '合议引擎', variant: 'default' as const }
      : guardianView.source === 'violation_projection_v1' && guardianView.is_simulated === true
        ? { label: '规则投影 · 未跑 LLM', variant: 'secondary' as const }
        : null;

  const hasDebatePerf =
    guardianView.debate_latency_ms != null ||
    guardianView.debate_shadow_wait_ms != null ||
    guardianView.debate_overlapping_latency_saved_estimate_ms != null ||
    guardianView.debate_shadow_triggered_at != null;

  const personaAtomsSummaryLabel = guardianView.projectionEvidenceAtomsVerifyAligned
    ? '审计原子（VERIFY 对齐）'
    : '审计原子';

  if (!hasContent) return null;

  const phaseStr = ui_state?.phase != null ? String(ui_state.phase) : '';
  const displayMessage = ui_state?.message ?? ui_state?.current_step_detail;
  const progress =
    ui_state?.progress_percent ?? (phaseStr === 'DONE' ? 100 : undefined);
  const etaMs = ui_state?.estimated_time_remaining_ms;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
        >
          <span className="flex items-center gap-1.5">
            <ChevronRight
              className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')}
            />
            <span>
              {phaseStr
                ? ORCHESTRATION_PHASE_LABELS[phaseStr] ?? phaseStr
                : '编排进度'}
              {progress != null && ` · ${progress}%`}
            </span>
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <div className="bg-muted/50 rounded-md p-2.5 space-y-2 text-xs">
          {displayMessage && (
            <p className="text-muted-foreground">{displayMessage}</p>
          )}
          {etaMs != null && etaMs > 0 && (
            <p className="text-muted-foreground">
              预计剩余：{(etaMs / 1000).toFixed(1)}s
            </p>
          )}
          {progress != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>进度</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {hasSteps && (
            <div className="border-t pt-2 mt-2 space-y-1.5">
              <div className="font-medium text-foreground">执行步骤</div>
              <ul className="space-y-1.5">
                {steps!.map((s, i) => {
                  const ok = s.success !== false;
                  return (
                    <li
                      key={s.step_id ? `${s.step_id}-${i}` : `step-${i}`}
                      className="flex flex-col gap-0.5 rounded border border-border/60 bg-background/50 px-2 py-1.5"
                    >
                      <div className="flex justify-between gap-2">
                        <span
                          className="font-medium text-foreground min-w-0"
                          title={s.step_name ? String(s.step_name) : undefined}
                        >
                          {(s.step_display_zh && s.step_display_zh.trim()) ||
                            translateOrchestrationStepForUser(s.step_name, preferZhLabels)}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 text-[11px]',
                            ok ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                          {ok ? '成功' : '失败'}
                        </span>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                        {s.skill_name ? (
                          <span>{preferZhLabels ? '技能' : 'skill'}: {s.skill_name}</span>
                        ) : null}
                        {s.action_name ? (
                          <span>{preferZhLabels ? '动作' : 'action'}: {s.action_name}</span>
                        ) : null}
                        {s.duration_ms != null ? <span>{s.duration_ms}ms</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {hasGateSection && (
            <div className="border-t pt-2 mt-2 space-y-2">
              <div className="font-medium">Gate 评估</div>
              {(engineBadge ||
                guardianView.source != null ||
                guardianView.is_simulated != null ||
                (guardianView.fromExplainMirror && hasGuardianStructured)) && (
                <div className="flex flex-wrap items-center gap-1">
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
                  {guardianView.is_simulated === true && guardianView.source !== 'violation_projection_v1' ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      规则投影
                    </Badge>
                  ) : null}
                  {guardianView.fromExplainMirror && hasGuardianStructured ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      explain 镜像
                    </Badge>
                  ) : null}
                </div>
              )}
              {guardianView.debate_summary_zh ? (
                <p className="text-muted-foreground text-[11px] leading-relaxed border-l-2 border-primary/25 pl-2">
                  {guardianView.debate_summary_zh}
                </p>
              ) : null}
              {guardianView.projectionEvidenceAtomsVerifyAligned ? (
                <p className="text-muted-foreground text-[10px] leading-relaxed border-l-2 border-primary/25 pl-2">
                  规则投影：VERIFY 后各人格 evidence_atoms 已与可执行性校验对齐（explain 与 gate_result 同源镜像）。
                </p>
              ) : null}
              {hasDebatePerf ? (
                <details className="group/debperf text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer select-none text-foreground/80 list-none [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-0.5">
                      <ChevronRight className="w-3 h-3 shrink-0 transition-transform group-open/debperf:rotate-90" />
                      辩论性能（估计）
                    </span>
                  </summary>
                  <div className="pl-2 mt-1 space-y-0.5 font-mono border-l border-border/50">
                    {guardianView.debate_latency_ms != null ? (
                      <div>debate_latency_ms: {guardianView.debate_latency_ms}</div>
                    ) : null}
                    {guardianView.debate_shadow_wait_ms != null ? (
                      <div>debate_shadow_wait_ms: {guardianView.debate_shadow_wait_ms}</div>
                    ) : null}
                    {guardianView.debate_overlapping_latency_saved_estimate_ms != null ? (
                      <div>
                        overlap_saved_est_ms:{' '}
                        {guardianView.debate_overlapping_latency_saved_estimate_ms}
                      </div>
                    ) : null}
                    {guardianView.debate_shadow_triggered_at != null ? (
                      <div>debate_shadow_triggered_at: {guardianView.debate_shadow_triggered_at}</div>
                    ) : null}
                  </div>
                </details>
              ) : null}
              {guardianView.rows.length > 0 ? (
                <ul className="space-y-2">
                  {guardianView.rows.map((row, idx) => {
                    const personaLabel =
                      PERSONA_HEADLINE[row.personaKey] ?? row.personaKey;
                    return (
                      <li
                        key={`${row.personaKey}-${idx}`}
                        className="rounded-md border border-border/70 bg-background/60 px-2 py-1.5"
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
                  className="space-y-1.5"
                />
              ) : null}
              {legacyGate &&
              (legacyGate.reason ||
                legacyGate.result ||
                (legacyGate.warnings?.length ?? 0) > 0 ||
                (legacyGate.recommendations?.length ?? 0) > 0) ? (
                <div className="text-muted-foreground space-y-1">
                  {(legacyGate.reason && legacyGate.reason.trim()) ||
                  (legacyGate.result && legacyGate.result.trim()) ? (
                    <div>{legacyGate.reason ?? legacyGate.result}</div>
                  ) : null}
                  {legacyGate.warnings && legacyGate.warnings.length > 0 ? (
                    <ul className="list-disc list-inside text-amber-600">
                      {legacyGate.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                  {legacyGate.recommendations && legacyGate.recommendations.length > 0 ? (
                    <ul className="list-disc list-inside text-blue-700/90">
                      {legacyGate.recommendations.map((w, i) => (
                        <li key={`r-${i}`}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <GateConstraintSinkAnchor
                anchor={constraintSinkAnchor}
                onOpenEvidenceDrawer={onOpenEvidenceDrawer}
              />
            </div>
          )}
          {!hasGateSection && hasConstraintSink ? (
            <GateConstraintSinkAnchor
              anchor={constraintSinkAnchor}
              onOpenEvidenceDrawer={onOpenEvidenceDrawer}
            />
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
