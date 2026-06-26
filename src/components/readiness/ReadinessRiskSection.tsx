import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, Info } from 'lucide-react';
import type { EnhancedRisk, RiskWarningsResponse } from '@/api/readiness';
import type { TripDetail } from '@/types/trip';
import type { ReadinessPreparationTask } from '@/lib/readiness-preparation-tasks';
import RiskCard from './RiskCard';

const INITIAL_VISIBLE = 3;

interface ReadinessRiskSectionProps {
  risks: EnhancedRisk[];
  riskWarnings?: RiskWarningsResponse | null;
  trip?: TripDetail | null;
  preparationTasksById?: Map<string, ReadinessPreparationTask>;
  onToggleMitigation?: (taskId: string, completed: boolean) => void;
  onPoiNavigate?: () => void;
  onGoToTasks?: () => void;
  mitigationProgress?: { total: number; done: number; remaining: number };
}

export default function ReadinessRiskSection({
  risks,
  riskWarnings,
  trip,
  preparationTasksById,
  onToggleMitigation,
  onPoiNavigate,
  onGoToTasks,
  mitigationProgress,
}: ReadinessRiskSectionProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const [expanded, setExpanded] = useState(false);
  const [packSourcesOpen, setPackSourcesOpen] = useState(false);

  const grouped = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...risks].sort(
      (a, b) =>
        (order[a.severity as keyof typeof order] ?? 1) -
        (order[b.severity as keyof typeof order] ?? 1),
    );
  }, [risks]);

  if (risks.length === 0) return null;

  const visible = expanded ? grouped : grouped.slice(0, INITIAL_VISIBLE);
  const hiddenCount = grouped.length - INITIAL_VISIBLE;

  const severityCounts = grouped.reduce(
    (acc, r) => {
      const s = r.severity === 'high' ? 'high' : r.severity === 'low' ? 'low' : 'medium';
      acc[s] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return (
    <div className="space-y-3 mt-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {t('dashboard.readiness.page.drawer.risks.title', '目的地风险参考')}
          </h3>
          <div className="flex items-center gap-1.5">
            {mitigationProgress && mitigationProgress.remaining > 0 ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                {isZh
                  ? `${mitigationProgress.remaining} 项待办`
                  : `${mitigationProgress.remaining} pending`}
              </span>
            ) : mitigationProgress && mitigationProgress.total > 0 ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {isZh ? '任务已完成' : 'Tasks done'}
              </span>
            ) : null}
            <span className="text-xs text-slate-500 tabular-nums">{risks.length}</span>
          </div>
        </div>
        <p className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
          {t(
            'dashboard.readiness.page.drawer.risks.hint',
            '以下为目的地通用风险提示。应对措施会同步为行前任务，可在「任务」Tab 中分配队员。',
          )}
        </p>
        {(severityCounts.high > 0 || severityCounts.medium > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {severityCounts.high > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {isZh ? `高 ${severityCounts.high}` : `High ${severityCounts.high}`}
              </span>
            )}
            {severityCounts.medium > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {isZh ? `中 ${severityCounts.medium}` : `Medium ${severityCounts.medium}`}
              </span>
            )}
            {severityCounts.low > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200">
                {isZh ? `低 ${severityCounts.low}` : `Low ${severityCounts.low}`}
              </span>
            )}
          </div>
        )}
        {onGoToTasks ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-600"
            onClick={onGoToTasks}
          >
            {isZh ? '前往行前任务' : 'Open tasks'}
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        {visible.map((risk, index) => (
          <RiskCard
            key={risk.id ?? index}
            risk={risk}
            trip={trip}
            preparationTasksById={preparationTasksById}
            onToggleMitigation={onToggleMitigation}
            onPoiNavigate={onPoiNavigate}
            onGoToTasks={onGoToTasks}
          />
        ))}
      </div>

      {hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs text-slate-600 hover:text-slate-900"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 mr-1" />
              {t('dashboard.readiness.page.drawer.risks.collapse', '收起')}
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 mr-1" />
              {t('dashboard.readiness.page.drawer.risks.expand', '展开其余 {{count}} 条', {
                count: hiddenCount,
              })}
            </>
          )}
        </Button>
      )}

      {riskWarnings?.packSources && riskWarnings.packSources.length > 0 && (
        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-slate-900"
              onClick={() => setPackSourcesOpen((open) => !open)}
              aria-expanded={packSourcesOpen}
            >
              <span className="flex items-center gap-2">
                <span>📚</span>
                <span>{t('dashboard.readiness.page.allOfficialSources', '所有官方来源')}</span>
                <span className="font-normal text-muted-foreground text-xs">
                  ({riskWarnings.packSources.length})
                </span>
              </span>
              {packSourcesOpen ? (
                <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            {packSourcesOpen && (
              <ul className="space-y-2 mt-3">
                {riskWarnings.packSources.map((source, index) => (
                  <li key={source.sourceId || index} className="text-sm text-slate-700">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 mt-1">•</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-900">{source.authority}</span>
                          {source.title && (
                            <span className="text-slate-600">- {source.title}</span>
                          )}
                        </div>
                        {source.canonicalUrl && (
                          <a
                            href={source.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800 hover:underline mt-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{source.canonicalUrl}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
