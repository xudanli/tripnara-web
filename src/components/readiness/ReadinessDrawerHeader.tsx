import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ScoreBreakdownResponse,
  ReadinessCheckResult,
  RiskWarningsResponse,
} from '@/api/readiness';
import { gateStatusTokens as designTokens, spacingTokens } from '@/utils/design-tokens';
import {
  type GateStatus,
  type GateWarnReason,
  getReadinessDrawerStats,
} from '@/lib/readiness-drawer-stats';
import ReadinessScoreDimensions from '@/components/readiness/ReadinessScoreDimensions';
import ScoreGauge from '@/components/readiness/ScoreGauge';

export type ReadinessDrawerSection = 'blockers' | 'must' | 'should' | 'risks';

interface ReadinessDrawerHeaderProps {
  scoreBreakdown: ScoreBreakdownResponse | null;
  gateStatus: GateStatus;
  gateWarnReason?: GateWarnReason;
  readinessResult: ReadinessCheckResult | null;
  riskWarnings?: RiskWarningsResponse | null;
  packMustProgress?: { done: number; total: number; remaining: number };
  onNavigateToSection?: (section: ReadinessDrawerSection) => void;
}

const gateStatusTokens = {
  BLOCK: { ...designTokens.BLOCK, icon: AlertCircle },
  WARN: { ...designTokens.WARN, icon: AlertTriangle },
  PASS: { ...designTokens.PASS, icon: CheckCircle2 },
};

function StatTile({
  count,
  label,
  active,
  muted,
  badge,
  onClick,
}: {
  count: number;
  label: string;
  active?: boolean;
  muted?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  const clickable = !!onClick && (active || !!badge);
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? onClick : undefined}
      className={cn(
        'relative rounded-xl px-2 py-2.5 text-center transition-colors',
        muted
          ? 'bg-slate-50 text-slate-400'
          : active
            ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200/80'
            : 'bg-slate-50/80 text-slate-700 hover:bg-slate-100/90',
        clickable && 'cursor-pointer',
        !clickable && 'cursor-default',
      )}
    >
      {badge ? (
        <span className="absolute -top-1.5 -right-1 rounded-full bg-amber-500 px-1.5 py-px text-[9px] font-semibold text-white leading-none shadow-sm">
          {badge}
        </span>
      ) : null}
      <div className={cn('text-xl font-semibold tabular-nums leading-none', muted && 'font-normal')}>
        {count}
      </div>
      <div className="mt-1 text-[11px] leading-tight text-inherit opacity-90">{label}</div>
    </button>
  );
}

export default function ReadinessDrawerHeader({
  scoreBreakdown,
  gateStatus,
  gateWarnReason,
  readinessResult,
  riskWarnings,
  packMustProgress,
  onNavigateToSection,
}: ReadinessDrawerHeaderProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language.startsWith('zh');

  const StatusIcon = gateStatusTokens[gateStatus].icon;
  const stats = getReadinessDrawerStats(readinessResult, scoreBreakdown, riskWarnings, {
    remainingPackMust: packMustProgress?.remaining,
  });
  const overall = scoreBreakdown?.score?.overall;
  const softenScore = stats.coverageBlockers === 0;

  const statusLabel =
    gateStatus === 'BLOCK'
      ? t('dashboard.readiness.page.drawer.status.block')
      : gateStatus === 'WARN'
        ? gateWarnReason === 'pack_must'
          ? t('dashboard.readiness.page.drawer.status.warnSafety', '建议完善安全准备')
          : gateWarnReason === 'low_score'
            ? t('dashboard.readiness.page.drawer.status.warnEvidence', '行程证据待补充')
            : t('dashboard.readiness.page.drawer.status.warn')
        : t('dashboard.readiness.page.drawer.status.pass');

  const scoreSubtitle =
    gateStatus === 'PASS'
      ? isZh
        ? '安全准备度良好'
        : 'Readiness looks good'
      : gateStatus === 'WARN' && gateWarnReason === 'pack_must'
        ? isZh
          ? '安全准备度：中等，请完善打包与衣物准备'
          : 'Moderate readiness — finish safety prep'
        : isZh
          ? '仍有待完善项，请查看下方清单'
          : 'Items below still need attention';

  const { displayBlockers: blockers, displayMust: must, displayShould: should, displayRisks: risks, mustIsPackSafety } =
    stats;
  const safetyAllDone =
    mustIsPackSafety && packMustProgress != null && packMustProgress.total > 0 && packMustProgress.remaining === 0;

  const isPlanningPhase = scoreBreakdown?.readinessPhase === 'planning';
  const planningPhaseHint =
    scoreBreakdown?.phaseHint ||
    (isPlanningPhase && scoreBreakdown?.daysUntilStart != null
      ? isZh
        ? `行程尚早（${scoreBreakdown.daysUntilStart} 天后出发）。分数仅反映当前可准备的项；路况与逐日天气将在出发前 14 天内纳入。`
        : `Trip starts in ${scoreBreakdown.daysUntilStart} days. Score reflects prep you can do now; live road/weather count within 14 days of departure.`
      : '');

  const weakestKey = scoreBreakdown?.score
    ? (
        [
          ['transportCertainty', t('dashboard.readiness.page.drawer.score.transport', '交通确定')],
          ['evidenceCoverage', t('dashboard.readiness.page.drawer.score.evidence', '证据覆盖')],
          ['scheduleFeasibility', t('dashboard.readiness.page.drawer.score.schedule', '行程可行')],
          ['safetyRisk', t('dashboard.readiness.page.drawer.score.safety', '安全风险')],
          ['buffers', t('dashboard.readiness.page.drawer.score.buffers', '缓冲时间')],
        ] as const
      )
        .map(([key, label]) => ({
          label,
          value: Math.round(Math.max(0, Math.min(100, (scoreBreakdown.score as any)[key] ?? 0))),
        }))
        .sort((a, b) => a.value - b.value)[0]
    : null;

  return (
    <div className="flex-shrink-0 border-b border-slate-200 bg-white">
      <div className={cn(spacingTokens.drawerPadding, 'pt-4 pb-3')}>
        <div className="flex items-start gap-4">
          {overall !== undefined ? (
            <ScoreGauge score={overall} size={80} className="shrink-0" />
          ) : null}

          <div className="flex-1 min-w-0 pt-0.5 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {overall !== undefined ? (
                <span className="text-lg font-bold text-slate-900 tabular-nums">
                  {overall}
                  <span className="text-sm font-normal text-slate-500">{isZh ? ' 分' : ' pts'}</span>
                </span>
              ) : null}
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  gateStatusTokens[gateStatus].bg,
                  gateStatusTokens[gateStatus].text,
                )}
              >
                <StatusIcon className={cn('h-3 w-3', gateStatusTokens[gateStatus].iconColor)} />
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{scoreSubtitle}</p>
            {isPlanningPhase && planningPhaseHint ? (
              <p className="text-[11px] text-slate-400 leading-relaxed">{planningPhaseHint}</p>
            ) : null}
            {weakestKey && weakestKey.value < 80 ? (
              <p className="text-xs text-slate-500">
                {isZh ? '主要薄弱项：' : 'Weakest: '}
                <span className="font-medium text-slate-700">
                  {weakestKey.label} {weakestKey.value}
                  {isZh ? ' 分' : ''}
                </span>
              </p>
            ) : null}
          </div>
        </div>

        {scoreBreakdown?.score ? (
          <ReadinessScoreDimensions
            score={scoreBreakdown.score}
            softenLowScores={softenScore}
            className="mt-3 border-0 bg-transparent px-0 py-0"
            defaultCollapsed
          />
        ) : null}
      </div>

      <div className={cn(spacingTokens.drawerPadding, 'pb-3')}>
        <div className="grid grid-cols-4 gap-1.5">
          <StatTile
            count={blockers}
            label={t('dashboard.readiness.page.blockers', '阻塞')}
            muted={blockers === 0}
            active={blockers > 0}
            onClick={() => onNavigateToSection?.('blockers')}
          />
          <StatTile
            count={must}
            label={
              mustIsPackSafety
                ? t('dashboard.readiness.page.drawer.stats.mustSafety', '安全准备')
                : t('dashboard.readiness.page.must', '必须')
            }
            active={must > 0 && !safetyAllDone}
            muted={must === 0 || safetyAllDone}
            badge={
              mustIsPackSafety && packMustProgress && packMustProgress.remaining > 0
                ? isZh
                  ? `${packMustProgress.remaining}待办`
                  : `${packMustProgress.remaining}`
                : undefined
            }
            onClick={() => onNavigateToSection?.('must')}
          />
          <StatTile
            count={should}
            label={t('dashboard.readiness.page.should', '建议')}
            muted
            active={should > 0}
            onClick={() => onNavigateToSection?.('should')}
          />
          <StatTile
            count={risks}
            label={t('dashboard.readiness.page.drawer.stats.risksLabel', '风险')}
            active={risks > 0}
            onClick={() => onNavigateToSection?.('risks')}
          />
        </div>
      </div>
    </div>
  );
}
