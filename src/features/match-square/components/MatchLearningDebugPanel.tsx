import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MATCH_LEARNING_WEIGHT_LABELS } from '@/types/match-learning';
import {
  useMatchLearningRuns,
  useMatchLearningWeights,
  useRunMatchLearningWeekly,
} from '../hooks/useMatchLearning';

/**
 * Dev / Staging 透明度面板 — 展示 Cron 产出的 Soft Weights（P3）
 * 生产环境默认不渲染；正常运行不依赖此组件。
 */
export function MatchLearningDebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const { data: weights, isLoading: weightsLoading } = useMatchLearningWeights();
  const { data: runsData, isLoading: runsLoading } = useMatchLearningRuns(expanded);
  const runWeekly = useRunMatchLearningWeekly();

  if (!import.meta.env.DEV) return null;

  const handleManualRun = async () => {
    try {
      const result = await runWeekly.mutateAsync();
      toast.success(`权重迭代完成 · v${result.version}`);
    } catch {
      toast.error('手动触发失败（生产环境可能已禁用 MATCH_LEARNING_MANUAL_RUN）');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card text-xs text-muted-foreground">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Cpu className="h-3.5 w-3.5" aria-hidden />
          Match Learning · Soft Weights（P3 Debug）
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <p>
            每周 Cron 从 Reputation OS 互评样本自迭代权重；列表契合度与申请 highlights 底层共用此版本。
          </p>

          {weightsLoading ? (
            <p>加载权重…</p>
          ) : weights ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="sm:col-span-2">
                版本 v{weights.version} · 上次运行{' '}
                {new Date(weights.lastRunAt).toLocaleString('zh-CN')}
              </p>
              {(Object.entries(weights.weights) as [keyof typeof weights.weights, number][]).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1.5"
                  >
                    <span>{MATCH_LEARNING_WEIGHT_LABELS[key]}</span>
                    <span className="tabular-nums font-medium font-mono-brand text-foreground">
                      {(value * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7" disabled={runWeekly.isPending} onClick={handleManualRun}>
              <Play className="mr-1 h-3 w-3" />
              {runWeekly.isPending ? '运行中…' : '手动 run-weekly（Staging）'}
            </Button>
          </div>

          {runsLoading ? (
            <p>加载审计…</p>
          ) : runsData?.runs?.length ? (
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {runsData.runs.slice(0, 5).map((run) => (
                <li key={run.id} className="rounded-md bg-muted/50 px-2 py-1">
                  <span className="text-foreground">{run.runAt.slice(0, 10)}</span>
                  {' · '}
                  v{run.previousVersion ?? '?'}→v{run.newVersion ?? '?'}
                  {' · '}
                  +{run.positiveAdjustments ?? 0}/−{run.negativeAdjustments ?? 0}
                  {run.notes ? ` · ${run.notes}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
