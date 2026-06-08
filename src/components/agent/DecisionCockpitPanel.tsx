/**
 * `explain.decision_cockpit`（decision-cockpit@v1）只读展示。
 * Agent 气泡 compact；plan-studio 全宽。
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { agentApi } from '@/api/agent';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { WorldConstraintBanner } from '@/components/planning/WorldConstraintBanner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { hasDecisionCockpitUi, integrityBadgeLabelZh } from '@/lib/decision-cockpit';
import type {
  DecisionCockpitDto,
  DecisionCockpitIntegrityBadge,
} from '@/types/decision-cockpit';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  FlaskConical,
  Gauge,
  HelpCircle,
  Link2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from 'lucide-react';

function badgeStatusTone(status: string | undefined): 'pass' | 'warn' | 'fail' | 'neutral' {
  const s = (status ?? '').toLowerCase();
  if (s === 'pass' || s === 'ok' || s === 'verified') return 'pass';
  if (s === 'warn' || s === 'warning' || s === 'partial') return 'warn';
  if (s === 'fail' || s === 'failed' || s === 'drift') return 'fail';
  return 'neutral';
}

function BadgeStatusIcon({ tone }: { tone: ReturnType<typeof badgeStatusTone> }) {
  if (tone === 'pass') return <ShieldCheck className="h-3.5 w-3.5 text-green-700" />;
  if (tone === 'warn') return <ShieldQuestion className="h-3.5 w-3.5 text-amber-700" />;
  if (tone === 'fail') return <ShieldAlert className="h-3.5 w-3.5 text-red-700" />;
  return <ShieldQuestion className="h-3.5 w-3.5 text-muted-foreground" />;
}

function IntegrityBadgesRow({ badges }: { badges: DecisionCockpitIntegrityBadge[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => {
        const tone = badgeStatusTone(b.status);
        const label = b.label_zh?.trim() || integrityBadgeLabelZh(String(b.key));
        return (
          <Badge
            key={String(b.key)}
            variant="outline"
            className={cn(
              'gap-1.5 text-[11px] font-normal py-1 px-2',
              tone === 'pass' && 'border-green-200 bg-green-50 text-green-800',
              tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-900',
              tone === 'fail' && 'border-red-200 bg-red-50 text-red-800'
            )}
            title={b.summary_zh?.trim() || undefined}
          >
            <BadgeStatusIcon tone={tone} />
            <span>{label}</span>
          </Badge>
        );
      })}
    </div>
  );
}

function TraceTable({ rows }: { rows: NonNullable<DecisionCockpitDto['decision_trace_rows']> }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-[11px] h-8 w-[88px]">人格</TableHead>
            <TableHead className="text-[11px] h-8">阶段</TableHead>
            <TableHead className="text-[11px] h-8">结论</TableHead>
            <TableHead className="text-[11px] h-8 min-w-[140px]">说明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.persona}-${i}`} className="text-[11px]">
              <TableCell className="py-2 align-top">
                <div className="flex items-center gap-1.5">
                  <PersonaAvatar persona={row.persona} size={24} />
                  <span className="font-medium">{row.persona_label_zh ?? row.persona}</span>
                </div>
              </TableCell>
              <TableCell className="py-2 align-top text-muted-foreground">
                {row.phase ?? row.step ?? '—'}
              </TableCell>
              <TableCell className="py-2 align-top">
                {row.verdict ? (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {row.verdict}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="py-2 align-top leading-relaxed">
                {row.summary_zh ?? row.detail_zh ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RiskFactorCards({
  factors,
  compact,
}: {
  factors: NonNullable<DecisionCockpitDto['risk_factors']>;
  compact?: boolean;
}) {
  return (
    <ul className={cn('grid gap-2', !compact && 'sm:grid-cols-2')}>
      {factors.map((f, i) => (
        <li
          key={f.id ?? `${f.label_zh}-${i}`}
          className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-[11px]"
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="font-medium text-foreground">{f.label_zh ?? f.id ?? '风险因素'}</span>
            {f.severity ? (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {f.severity}
              </Badge>
            ) : null}
            {f.grounded ? (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                已 grounding
              </Badge>
            ) : null}
          </div>
          {f.detail_zh ? (
            <p className="text-muted-foreground leading-relaxed">{f.detail_zh}</p>
          ) : null}
          {f.source_refs?.length ? (
            <p className="mt-1 text-[10px] text-muted-foreground/80 font-mono truncate">
              {f.source_refs.join(' · ')}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CounterfactualBlock({
  items,
  apis,
}: {
  items: NonNullable<DecisionCockpitDto['counterfactuals']>;
  apis?: DecisionCockpitDto['apis'];
}) {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [liveAnswers, setLiveAnswers] = useState<Record<number, string>>({});

  const runApi = async (idx: number) => {
    const tripRunId = apis?.counterfactual?.trip_run_id?.trim();
    if (!tripRunId) {
      toast.error('缺少 counterfactual API 的 trip_run_id');
      return;
    }
    const item = items[idx];
    setLoadingIdx(idx);
    try {
      const payload = {
        ...(apis?.counterfactual?.payload ?? {}),
        hypothesis: item.question_zh,
        baseline_alternative_id: item.baseline_alternative_id,
        chosen_alternative_id: item.chosen_alternative_id,
      };
      const res = await agentApi.decisionReplayCounterfactual(tripRunId, payload);
      const text =
        typeof res.counterfactual_result === 'string'
          ? res.counterfactual_result
          : JSON.stringify(res.counterfactual_result, null, 2);
      setLiveAnswers((prev) => ({ ...prev, [idx]: text }));
    } catch (e) {
      toast.error('反事实分析失败', {
        description: e instanceof Error ? e.message : '请稍后重试',
      });
    } finally {
      setLoadingIdx(null);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((cf, i) => {
        const answer = liveAnswers[i] ?? cf.answer_zh;
        return (
          <div
            key={i}
            className="rounded-md border border-border/70 bg-background/80 px-3 py-2 text-[11px]"
          >
            <div className="flex items-start gap-2">
              <HelpCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-medium text-foreground leading-snug">{cf.question_zh}</p>
                {cf.baseline_alternative_id ? (
                  <p className="text-[10px] text-muted-foreground">
                    对照方案：{cf.baseline_alternative_id}
                    {cf.chosen_alternative_id ? ` · 当前：${cf.chosen_alternative_id}` : ''}
                  </p>
                ) : null}
                {answer ? (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
                ) : null}
                {apis?.counterfactual?.trip_run_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    disabled={loadingIdx === i}
                    onClick={() => void runApi(i)}
                  >
                    <FlaskConical className="h-3 w-3" />
                    {loadingIdx === i ? '分析中…' : '调用 counterfactual API'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface DecisionCockpitPanelProps {
  cockpit?: DecisionCockpitDto | null;
  className?: string;
  compact?: boolean;
  defaultOpen?: boolean;
}

export function DecisionCockpitPanel({
  cockpit,
  className,
  compact = false,
  defaultOpen = false,
}: DecisionCockpitPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (!hasDecisionCockpitUi(cockpit)) return null;

  const mc = cockpit!.monte_carlo;
  const mcLine =
    mc?.used && mc.total_samples
      ? `蒙特卡洛：后台约 ${mc.total_samples} 次抽样后推荐`
      : mc?.used
        ? '蒙特卡洛：已启用'
        : null;

  const body = (
    <div className={cn('space-y-3', compact ? 'text-xs' : 'text-sm')}>
      {cockpit!.integrity_badges?.length ? (
        <section aria-label="完整性徽章">
          {!compact ? (
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              完整性
            </p>
          ) : null}
          <IntegrityBadgesRow badges={cockpit!.integrity_badges} />
        </section>
      ) : null}

      {cockpit!.decision_trace_rows?.length ? (
        <section aria-label="三人格决策 trace">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            决策 trace
          </p>
          <TraceTable rows={cockpit!.decision_trace_rows} />
        </section>
      ) : null}

      {cockpit!.risk_factors?.length ? (
        <section aria-label="风险因素">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            风险因素（grounded）
          </p>
          <RiskFactorCards factors={cockpit!.risk_factors} compact={compact} />
        </section>
      ) : null}

      {cockpit!.counterfactuals?.length ? (
        <section aria-label="反事实">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
            若选 base 会怎样
          </p>
          <CounterfactualBlock items={cockpit!.counterfactuals} apis={cockpit!.apis} />
        </section>
      ) : null}

      {cockpit!.world_constraints ? (
        <WorldConstraintBanner materialization={cockpit!.world_constraints} className="mb-0" />
      ) : null}

      {mcLine ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Gauge className="h-3.5 w-3.5 shrink-0" />
          {mcLine}
        </p>
      ) : null}

      {cockpit!.apis?.counterfactual?.path ? (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono truncate">
          <Link2 className="h-3 w-3 shrink-0" />
          {cockpit!.apis.counterfactual.path}
        </p>
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <section className={cn('decision-cockpit-panel', className)} aria-label="决策驾驶舱">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-auto py-1.5 px-2 text-xs hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className={cn('w-3 h-3 transition-transform shrink-0', open && 'rotate-90')} />
                <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">决策驾驶舱</span>
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-2 pb-2">{body}</CollapsibleContent>
        </Collapsible>
      </section>
    );
  }

  return (
    <Card className={cn('decision-cockpit-panel border-border/70', className)}>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          决策驾驶舱
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">{body}</CardContent>
    </Card>
  );
}
