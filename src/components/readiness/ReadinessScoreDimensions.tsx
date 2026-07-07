import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreData } from '@/api/readiness';

interface ReadinessScoreDimensionsProps {
  score: ScoreData;
  /** 无行程阻塞时，低分用 amber 而非 red */
  softenLowScores?: boolean;
  className?: string;
  /** 默认折叠，仅展示最弱维度摘要 */
  defaultCollapsed?: boolean;
}

type DimensionKey = keyof Pick<
  ScoreData,
  'evidenceCoverage' | 'scheduleFeasibility' | 'transportCertainty' | 'safetyRisk' | 'buffers'
>;

const DIMENSION_KEYS: DimensionKey[] = [
  'evidenceCoverage',
  'scheduleFeasibility',
  'transportCertainty',
  'safetyRisk',
  'buffers',
];

function barTone(value: number, softenLowScores: boolean): string {
  if (value >= 80) return 'bg-muted-foreground';
  if (value >= 60) return 'bg-muted0';
  return softenLowScores ? 'bg-foreground/60' : 'bg-muted-foreground';
}

function textTone(value: number, softenLowScores: boolean): string {
  if (value >= 80) return 'text-success';
  if (value >= 60) return 'text-warning';
  return softenLowScores ? 'text-warning' : 'text-error';
}

function DimensionRow({
  label,
  value,
  softenLowScores,
}: {
  label: string;
  value: number;
  softenLowScores: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[5rem] shrink-0 text-[11px] text-slate-600 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-200/90 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barTone(value, softenLowScores))}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          'w-8 shrink-0 text-right text-[11px] font-medium tabular-nums',
          textTone(value, softenLowScores),
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function ReadinessScoreDimensions({
  score,
  softenLowScores = false,
  className,
  defaultCollapsed = true,
}: ReadinessScoreDimensionsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const labels: Record<DimensionKey, string> = {
    evidenceCoverage: t('dashboard.readiness.page.drawer.score.evidence', '证据覆盖'),
    scheduleFeasibility: t('dashboard.readiness.page.drawer.score.schedule', '行程可行'),
    transportCertainty: t('dashboard.readiness.page.drawer.score.transport', '交通确定'),
    safetyRisk: t('dashboard.readiness.page.drawer.score.safety', '安全风险'),
    buffers: t('dashboard.readiness.page.drawer.score.buffers', '缓冲时间'),
  };

  const rows = DIMENSION_KEYS.map((key) => ({
    key,
    label: labels[key],
    value: Math.round(Math.max(0, Math.min(100, score[key] ?? 0))),
  })).sort((a, b) => a.value - b.value);

  const weakest = rows[0];
  const highlightWeakest = (weakest?.value ?? 0) < 70;

  return (
    <div className={cn('rounded-lg border border-slate-100 bg-slate-50/40 px-2.5 py-2', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <p className="text-xs text-slate-600 leading-snug">
          {t('dashboard.readiness.page.drawer.score.breakdownTitle', '分数构成')}
          {!expanded && weakest ? (
            <span className="ml-1 text-slate-800">
              · {weakest.label} {weakest.value}
              {highlightWeakest ? (
                <span className="text-slate-500">
                  {' '}
                  ({t('dashboard.readiness.page.drawer.score.weakestShort', '最弱项')})
                </span>
              ) : null}
            </span>
          ) : highlightWeakest && weakest ? (
            <span className="ml-1.5 text-slate-600">
              ·{' '}
              {t('dashboard.readiness.page.drawer.score.weakestHint', '主要受「{{label}}」影响', {
                label: weakest.label,
              })}
            </span>
          ) : null}
        </p>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="grid grid-cols-1 gap-1.5 mt-2 pt-2 border-t border-slate-100">
          {rows.map(({ key, label, value }) => (
            <DimensionRow
              key={key}
              label={label}
              value={value}
              softenLowScores={softenLowScores}
            />
          ))}
        </div>
      ) : weakest ? (
        <div className="mt-2">
          <DimensionRow
            label={weakest.label}
            value={weakest.value}
            softenLowScores={softenLowScores}
          />
        </div>
      ) : null}
    </div>
  );
}
