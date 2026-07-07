import { useEffect, useState } from 'react';
import { Check, ClipboardList, Lock, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SPLIT_MODE_LABELS } from '@/lib/decision-profiling-labels';
import { cn } from '@/lib/utils';
import { useSplitConsensus } from '@/hooks/useDecisionProfiling';
import type { SplitMechanismMode } from '@/types/trip-decision-profiling';
import { formatCurrency } from '@/utils/format';

interface SplitConsensusPanelProps {
  tripId: string;
  quizCompleted?: boolean;
  travelStyleCompleted?: boolean;
  moneyDnaCompleted?: boolean;
  teamCompletionRate?: number;
  onStartQuiz?: () => void;
}

export function SplitConsensusPanel({
  tripId,
  quizCompleted = false,
  travelStyleCompleted = false,
  moneyDnaCompleted = false,
  teamCompletionRate = 0,
  onStartQuiz,
}: SplitConsensusPanelProps) {
  const { user } = useAuth();
  const { data, loading, submitting, simulate, selectMode, confirm } = useSplitConsensus(tripId, {
    enabled: quizCompleted,
  });
  const [totalEstimate, setTotalEstimate] = useState(50000);
  const [activeMode, setActiveMode] = useState<SplitMechanismMode>('split_aa');

  useEffect(() => {
    if (data?.recommendedMode) setActiveMode(data.selectedMode ?? data.recommendedMode);
  }, [data?.recommendedMode, data?.selectedMode]);

  useEffect(() => {
    if (!data || data.lockedAt || data.simulation) return;
    simulate(totalEstimate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial simulation only
  }, [Boolean(data && !data.lockedAt && !data.simulation)]);

  if (!quizCompleted) {
    const nextStep = !travelStyleCompleted
      ? 'Travel Style 旅行风格'
      : !moneyDnaCompleted
        ? 'Money DNA 消费 DNA'
        : '决策风格调查';

    return (
      <div className="rounded-lg border border-gate-confirm-border bg-gate-confirm/40 px-4 py-4 space-y-3">
        <div className="flex gap-3">
          <ClipboardList className="h-5 w-5 shrink-0 text-gate-confirm-foreground mt-0.5" />
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-gate-confirm-foreground">需先完成决策风格调查</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              分摊推荐依赖你的 Travel Style 与 Money DNA。请先完成调查，再选方案并全员确认；锁定后将同步至预算
              Travel Wallet。
            </p>
            <p className="text-xs text-muted-foreground">
              下一步：<span className="font-medium text-foreground">{nextStep}</span>
            </p>
          </div>
        </div>
        {onStartQuiz ? (
          <Button type="button" size="sm" className="h-8 text-xs" onClick={onStartQuiz}>
            开始决策风格调查
          </Button>
        ) : null}
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-4">暂无法加载分摊共识</p>;
  }

  const teamSurveyLow = teamCompletionRate < 95;
  const locked = !!data.lockedAt;
  const simulation = data.simulation?.byMode[activeMode];
  const iConfirmed = data.confirmations.some(
    (c) => c.userId === user?.id && c.confirmedAt != null,
  );

  return (
    <div className="space-y-4">
      {teamSurveyLow && !locked ? (
        <div className="rounded-md border border-amber-200/80 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 space-y-2">
          <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
            团队调查进度 {Math.round(teamCompletionRate)}% — 建议全员完成后再锁定分摊
          </p>
          <Progress value={teamCompletionRate} className="h-1.5 max-w-xs" />
          <p className="text-[11px] text-muted-foreground">
            你已完成调查，可先模拟与选方案；锁定规则并同步预算前，最好等队友也完成 Money DNA。
          </p>
        </div>
      ) : null}

      {locked ? (
        <div className="flex items-center gap-2 rounded-md border border-gate-allow-border bg-gate-allow/50 dark:bg-gate-allow/20 px-3 py-2 text-sm">
          <Lock className="h-4 w-4 text-gate-allow-foreground shrink-0" />
          <span>
            已锁定：<strong>{SPLIT_MODE_LABELS[data.lockedMode ?? activeMode]}</strong>
            ，规则已同步至预算 Tab「付款与记账」
          </span>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          推荐方案：
          <span className="font-medium text-foreground ml-1">
            {SPLIT_MODE_LABELS[data.recommendedMode]}
          </span>
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {data.options.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            disabled={locked || submitting}
            onClick={() => {
              setActiveMode(opt.mode);
              if (!locked) void selectMode(opt.mode);
            }}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              (data.selectedMode ?? activeMode) === opt.mode
                ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                : 'hover:bg-muted/30',
              locked && 'cursor-default',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{opt.label}</span>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                契合 {opt.fitScore}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{opt.description}</p>
          </button>
        ))}
      </div>

      {!locked ? (
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              预估总花费
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(totalEstimate)}</span>
          </div>
          <Slider
            value={[totalEstimate]}
            min={10000}
            max={200000}
            step={5000}
            onValueChange={([v]) => {
              const next = v ?? 50000;
              setTotalEstimate(next);
              simulate(next);
            }}
          />
        </div>
      ) : null}

      {simulation && simulation.members.length > 0 ? (
        <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as SplitMechanismMode)}>
          <TabsList className="h-8 w-full">
            {data.options.map((opt) => (
              <TabsTrigger key={opt.mode} value={opt.mode} className="text-[10px] flex-1 px-1">
                {opt.mode === 'split_aa' ? 'AA' : opt.mode === 'hybrid' ? '混合' : opt.label.slice(0, 4)}
              </TabsTrigger>
            ))}
          </TabsList>
          {data.options.map((opt) => {
            const modeSim = data.simulation?.byMode[opt.mode];
            return (
              <TabsContent key={opt.mode} value={opt.mode} className="mt-3 space-y-2">
                {modeSim?.note ? (
                  <p className="text-xs text-muted-foreground">{modeSim.note}</p>
                ) : null}
                <ul className="space-y-1.5">
                  {modeSim?.members.map((m) => (
                    <li key={m.userId} className="flex justify-between text-sm">
                      <span>{m.displayName}</span>
                      <span className="font-medium tabular-nums">{formatCurrency(m.estimatedSpend)}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : null}

      {!locked ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">全员确认</p>
            <ul className="flex flex-wrap gap-2">
              {data.confirmations.map((c) => (
                <li key={c.userId}>
                  <Badge
                    variant={c.confirmedAt ? 'default' : 'outline'}
                    className="text-[10px] gap-1"
                  >
                    {c.confirmedAt ? <Check className="h-3 w-3" /> : null}
                    {c.displayName}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
          <Button
            type="button"
            disabled={!data.selectedMode || submitting || iConfirmed}
            onClick={() => void confirm()}
            className="w-full sm:w-auto"
          >
            {iConfirmed ? '你已确认' : '确认所选方案'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
