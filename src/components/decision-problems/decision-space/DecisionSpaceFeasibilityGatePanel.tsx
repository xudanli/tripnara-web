import { useMemo } from 'react';
import {
  AlertCircle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEvidenceFreshness } from '@/lib/decision-problem-display.util';
import type {
  DecisionProblemAssertion,
  DecisionProblemDetail,
  DecisionProblemSummary,
} from '@/types/decision-problem';
import type { GatewayDecisionProblemDetailResult } from '@/lib/unified-gateway-response.util';
import {
  type FeasibilityGateCheckView,
  type FeasibilityTabView,
} from '@/lib/fixtures/decision-space-checker-tabs.fixtures';
import { DecisionCheckerEmpty } from '@/components/plan-studio/workbench/decision-checker/decision-checker-ui';

const GATE_CHECKS = [
  { id: 'time', label: '时间冲突' },
  { id: 'hours', label: '营业时间' },
  { id: 'booking', label: '预约影响' },
  { id: 'driving', label: '驾驶与休息限制' },
  { id: 'member', label: '成员硬约束' },
  { id: 'freshness', label: '数据新鲜度' },
] as const;

const EXEC_ICONS = {
  time: CalendarClock,
  route: Route,
  notify: Bell,
} as const;

function resolveGateStatus(
  key: string,
  assertions: DecisionProblemAssertion[] | undefined,
  problem?: DecisionProblemSummary | null,
): FeasibilityGateCheckView['status'] {
  const related = (assertions ?? []).filter((assertion) => {
    const text = `${assertion.message ?? ''} ${assertion.conclusion ?? ''}`.toLowerCase();
    if (key === 'time') return text.includes('时间') || text.includes('缓冲');
    if (key === 'booking') return text.includes('预约') || text.includes('预订');
    if (key === 'hours') return text.includes('营业');
    if (key === 'driving') return text.includes('驾驶') || text.includes('休息');
    if (key === 'member') return text.includes('成员');
    if (key === 'freshness') return Boolean(problem?.evidenceValidUntil);
    return false;
  });

  if (related.some((assertion) => assertion.passed === false)) return 'fail';
  if (related.some((assertion) => assertion.nature === 'RISK')) return 'warn';
  if (key === 'freshness' && problem?.evidenceValidUntil) return 'pass';
  if (related.length > 0) return 'pass';
  return 'pass';
}

function buildFeasibilityView(input: {
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  problem?: DecisionProblemSummary | null;
  selectedActionAllowed?: boolean;
  blockedReason?: string | null;
  optionLetter?: string;
  optionTitle?: string;
}): FeasibilityTabView | null {
  const assertions = input.detail?.assertions;
  const hasData = Boolean(assertions?.length || input.problem?.evidenceValidUntil);
  if (!hasData) return null;

  const gateChecks = GATE_CHECKS.map((check) => ({
    id: check.id,
    label: check.label,
    status: resolveGateStatus(check.id, assertions, input.problem),
  }));

  const canWrite = input.selectedActionAllowed !== false && !input.blockedReason;
  const validUntilLabel = formatEvidenceFreshness(input.problem?.evidenceValidUntil);

  return {
    optionLetter: input.optionLetter ?? 'A',
    optionTitle: input.optionTitle ?? '当前方案',
    canWrite,
    gateChecks,
    validUntilLabel: validUntilLabel ?? undefined,
    validityHint: input.problem?.evidenceValidUntil
      ? '若关键证据过期或路况显著变化，将重新触发决策。'
      : undefined,
    executionSummary: [],
    finalConclusion: canWrite ? '最终结论：可执行' : '最终结论：需确认',
    finalSubtext: canWrite
      ? '风险可控，满足所有约束与门禁条件。'
      : input.blockedReason ?? '仍有未满足的门禁条件。',
  };
}

export interface DecisionSpaceFeasibilityGatePanelProps {
  detail?: DecisionProblemDetail | GatewayDecisionProblemDetailResult | null;
  problem?: DecisionProblemSummary | null;
  selectedActionAllowed?: boolean;
  blockedReason?: string | null;
  optionLetter?: string;
  optionTitle?: string;
  /** decision-inspector.feasibility 已适配的视图 */
  inspectorView?: FeasibilityTabView | null;
  tabEmpty?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

/** 决策检查器 · 可执行性 Tab */
export function DecisionSpaceFeasibilityGatePanel({
  detail,
  problem,
  selectedActionAllowed = true,
  blockedReason,
  optionLetter = 'A',
  optionTitle,
  inspectorView,
  tabEmpty = false,
  emptyMessage,
  loading = false,
  className,
}: DecisionSpaceFeasibilityGatePanelProps) {
  const view = useMemo(
    () => {
      if (tabEmpty) return null;
      return (
        inspectorView ??
        buildFeasibilityView({
          detail,
          problem,
          selectedActionAllowed,
          blockedReason,
          optionLetter,
          optionTitle,
        })
      );
    },
    [
      tabEmpty,
      inspectorView,
      detail,
      problem,
      selectedActionAllowed,
      blockedReason,
      optionLetter,
      optionTitle,
    ],
  );

  if (loading && !view && !tabEmpty) {
    return <DecisionCheckerEmpty>正在加载可执行性…</DecisionCheckerEmpty>;
  }

  if (tabEmpty || !view) {
    return (
      <DecisionCheckerEmpty className={className}>
        {emptyMessage ?? '尚未选定具体方案，暂无法评估写入可行性。'}
      </DecisionCheckerEmpty>
    );
  }

  if (!view.gateChecks.length) {
    return <DecisionCheckerEmpty>可执行性检查待后端返回 assertions 后展示。</DecisionCheckerEmpty>;
  }

  return (
    <div className={cn('space-y-2 rounded-lg border border-border/60 bg-card p-2', className)}>
      <div className="rounded-md border border-gate-allow-border/50 bg-gate-allow/10 px-2 py-1.5">
        <div className="flex items-start gap-1.5">
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-snug text-foreground">
              {view.headline ??
                (view.canWrite ? '当前方案可以安全写入行程' : '当前方案仍需确认')}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              方案 {view.optionLetter}
              {view.optionTitle ? ` · ${view.optionTitle}` : ''}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-1">
        <h3 className="text-[11px] font-semibold text-foreground">门禁检查</h3>
        <ul className="divide-y divide-border/30 rounded-md border border-border/60">
          {view.gateChecks.map((check) => {
            const passed = check.status === 'pass';
            const Icon = passed ? CheckCircle2 : AlertCircle;
            const tone = passed
              ? 'text-gate-allow-foreground'
              : check.status === 'warn'
                ? 'text-gate-confirm-foreground'
                : 'text-gate-reject-foreground';
            return (
              <li
                key={check.id}
                className="flex items-center justify-between gap-2 px-2 py-1"
              >
                <span className="text-[10px] text-foreground">{check.label}</span>
                <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium', tone)}>
                  <Icon className="h-3 w-3" />
                  {passed ? '通过' : check.status === 'warn' ? '需关注' : '未通过'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {view.validUntilLabel ? (
        <div className="rounded-md border border-gate-confirm-border/50 bg-gate-confirm/10 px-2 py-1.5">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-gate-confirm-foreground" />
            <div className="min-w-0">
              <p className="text-[10px] font-medium leading-snug text-foreground">
                判断有效至 {view.validUntilLabel}
              </p>
              {view.validityHint ? (
                <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">
                  {view.validityHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {view.executionSummary.length > 0 ? (
        <section className="space-y-1">
          <h3 className="text-[11px] font-semibold text-foreground">执行摘要</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {view.executionSummary.map((item) => {
              const Icon = EXEC_ICONS[item.id as keyof typeof EXEC_ICONS] ?? CalendarClock;
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-border/50 bg-muted/5 px-1.5 py-1.5 text-center"
                >
                  <Icon className="mx-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <p className="mt-0.5 text-[8px] text-muted-foreground">{item.label}</p>
                  <p className="text-[11px] font-semibold leading-tight text-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <footer className="rounded-md border border-gate-allow-border/50 bg-gate-allow/10 px-2 py-1.5">
        <div className="flex items-start gap-1.5">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-gate-allow-foreground" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold leading-snug text-foreground">
              {view.finalConclusion}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {view.finalSubtext}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
