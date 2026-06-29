import { useMemo, useState } from 'react';
import { Cloud, Compass, Gauge, Hotel, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DecisionCheckerEvidenceTab } from '@/components/plan-studio/workbench/decision-checker/DecisionCheckerEvidenceTab';
import type { JourneyMapInspectorBundle } from '../types-inspector';
import type { JourneyActivity } from '../types';
import type {
  JourneyInspectorActivityHeader,
  JourneyInspectorEvidenceCategory,
  JourneyInspectorEvidenceSourceRow,
  JourneyInspectorWeatherSnapshot,
  JourneyInspectorRouteEvidenceRow,
  JourneyInspectorActivitySourceRow,
  JourneyInspectorEvidenceConclusion,
  JourneyMapInspectorActivityContext,
} from '../types-inspector-view';
import {
  buildCoverageEvidenceDto,
  buildDemoEvidenceDto,
  filterEvidenceForActivity,
} from '../lib/journey-map-inspector.util';
import {
  buildInspectorActivitySource,
  buildInspectorEvidenceConclusion,
  buildInspectorEvidenceSources,
  buildInspectorRouteEvidence,
  buildInspectorWeatherSnapshot,
} from '../lib/build-inspector-view-model';
import {
  journeyMapFilterChipActive,
  journeyMapFilterChipIdle,
  journeyMapFocusRing,
  journeyMapStatLabel,
  journeyMapStatValue,
  workbenchCard,
} from '../journey-map-ui';
import { JourneyMapInspectorHeader } from './JourneyMapInspectorHeader';
import type { JourneyMapModel } from '../types';

const CATEGORY_LABELS: Record<JourneyInspectorEvidenceCategory, string> = {
  weather: '天气',
  road: '路况',
  activity: '活动信息',
  transport: '交通',
  other: '其他',
};

const CATEGORY_FILTERS: Array<JourneyInspectorEvidenceCategory | 'all'> = [
  'all',
  'weather',
  'road',
  'activity',
  'transport',
  'other',
];

export interface JourneyMapEvidencePanelProps {
  inspector: JourneyMapInspectorBundle;
  model: JourneyMapModel;
  activity: JourneyActivity;
  dayIndex: number;
  header: JourneyInspectorActivityHeader;
  usingDemo: boolean;
  bffContext?: JourneyMapInspectorActivityContext;
  skipDemoEnrichment?: boolean;
}

export function JourneyMapEvidencePanel({
  inspector,
  model,
  activity,
  dayIndex,
  header,
  usingDemo,
  bffContext,
  skipDemoEnrichment = false,
}: JourneyMapEvidencePanelProps) {
  const [category, setCategory] = useState<JourneyInspectorEvidenceCategory | 'all'>('all');
  const buildOpts = { skipDemoEnrichment };

  const sources = useMemo(
    () => buildInspectorEvidenceSources(inspector, bffContext, buildOpts),
    [inspector, bffContext, skipDemoEnrichment],
  );

  const weather = useMemo(
    () => buildInspectorWeatherSnapshot(activity, bffContext, buildOpts),
    [activity, bffContext, skipDemoEnrichment],
  );

  const routeEvidence = useMemo(
    () => buildInspectorRouteEvidence(activity, model, bffContext, buildOpts),
    [activity, model, bffContext, skipDemoEnrichment],
  );

  const activitySource = useMemo(
    () => buildInspectorActivitySource(activity, bffContext, buildOpts),
    [activity, bffContext, skipDemoEnrichment],
  );

  const conclusion = useMemo(
    () => buildInspectorEvidenceConclusion(inspector, activity, bffContext, buildOpts),
    [inspector, activity, bffContext, skipDemoEnrichment],
  );

  const filteredSources =
    category === 'all' ? sources : sources.filter((s) => s.category === category);

  const evidenceModel = useMemo(() => {
    if (inspector.evidence) {
      return filterEvidenceForActivity(inspector.evidence, activity, dayIndex);
    }
    if (inspector.coverage && inspector.evidenceSource === 'coverage') {
      return buildCoverageEvidenceDto(inspector.coverage, dayIndex);
    }
    if (usingDemo || inspector.evidenceSource === 'demo') {
      return buildDemoEvidenceDto(activity);
    }
    return null;
  }, [inspector, activity, dayIndex, usingDemo]);

  if (inspector.evidenceLoading) {
    return (
      <DecisionCheckerEvidenceTab
        model={{ items: [], summary: { high: 0, medium: 0, low: 0 } }}
        loading
      />
    );
  }

  return (
    <div>
      <JourneyMapInspectorHeader header={header} />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="证据类型筛选">
          {CATEGORY_FILTERS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors',
                journeyMapFocusRing,
                category === id ? journeyMapFilterChipActive : journeyMapFilterChipIdle,
              )}
            >
              {id === 'all' ? '全部' : CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>

        <section className={cn(workbenchCard, 'p-3')}>
          <p className="text-[11px] font-semibold text-foreground">数据来源概览</p>
          <ul className="mt-2 space-y-2">
            {filteredSources.map((row) => (
              <SourceRow key={row.id} row={row} />
            ))}
          </ul>
        </section>

        {weather ? <WeatherBlock snapshot={weather} /> : null}
        {routeEvidence ? <RouteBlock row={routeEvidence} /> : null}
        {activitySource ? <ActivitySourceBlock row={activitySource} /> : null}

        {evidenceModel ? (
          <section>
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">决策证据链</p>
            <DecisionCheckerEvidenceTab
              model={evidenceModel}
              unavailable={false}
              error={inspector.evidenceError}
            />
          </section>
        ) : null}

        {conclusion ? <ConclusionBlock conclusion={conclusion} /> : null}
      </div>
    </div>
  );
}

function SourceRow({ row }: { row: JourneyInspectorEvidenceSourceRow }) {
  const Icon =
    row.category === 'weather'
      ? Cloud
      : row.category === 'road'
        ? Compass
        : row.category === 'activity'
          ? Gauge
          : row.category === 'transport'
            ? Hotel
            : Clock;

  return (
    <li className="flex items-center gap-2.5 text-[11px]">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{row.name}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">{row.updatedAtLabel}</span>
      {row.confidencePercent != null ? (
        <span className="shrink-0 tabular-nums text-nara-glacier-foreground">
          {row.confidencePercent}%
        </span>
      ) : null}
    </li>
  );
}

function WeatherBlock({ snapshot }: { snapshot: JourneyInspectorWeatherSnapshot }) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <p className="text-[11px] font-semibold text-foreground">天气窗口 · {snapshot.location}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        {snapshot.temperature ? (
          <span>
            <span className="text-muted-foreground">温度 </span>
            {snapshot.temperature}
          </span>
        ) : null}
        {snapshot.condition ? (
          <span>
            <span className="text-muted-foreground">天气 </span>
            {snapshot.condition}
          </span>
        ) : null}
        {snapshot.wind ? (
          <span>
            <span className="text-muted-foreground">风速 </span>
            {snapshot.wind}
          </span>
        ) : null}
        {snapshot.precipitation ? (
          <span>
            <span className="text-muted-foreground">降水 </span>
            {snapshot.precipitation}
          </span>
        ) : null}
      </div>
      {snapshot.hourly?.length ? (
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {snapshot.hourly.map((h) => (
            <div
              key={h.time}
              className="shrink-0 rounded-md border border-border/60 bg-muted/10 px-2 py-1.5 text-center text-[10px]"
            >
              <p className="font-medium text-foreground">{h.time}</p>
              <p className="mt-0.5 text-muted-foreground">{h.temp}</p>
              <p className="text-[9px] text-muted-foreground">{h.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RouteBlock({ row }: { row: JourneyInspectorRouteEvidenceRow }) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <p className="text-[11px] font-semibold text-foreground">路线证据</p>
      <p className="mt-1 text-xs font-medium text-foreground">{row.label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{row.provider}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
        {row.duration ? (
          <span>
            <span className={journeyMapStatLabel}>耗时 </span>
            <span className={journeyMapStatValue}>{row.duration}</span>
          </span>
        ) : null}
        {row.distance ? (
          <span>
            <span className={journeyMapStatLabel}>距离 </span>
            <span className={journeyMapStatValue}>{row.distance}</span>
          </span>
        ) : null}
        {row.statusLabel ? (
          <Badge variant="outline" className="h-5 border-nara-tundra-border text-[10px] text-nara-tundra-foreground">
            {row.statusLabel}
          </Badge>
        ) : null}
      </div>
    </section>
  );
}

function ActivitySourceBlock({ row }: { row: JourneyInspectorActivitySourceRow }) {
  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <p className="text-[11px] font-semibold text-foreground">活动信息来源</p>
      <p className="mt-1 text-xs font-medium text-foreground">
        {row.provider} · {row.activityName}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {row.statusLabel ? <span>{row.statusLabel}</span> : null}
        {row.hours ? <span>营业时间 {row.hours}</span> : null}
        {row.updatedAtLabel ? <span>更新 {row.updatedAtLabel}</span> : null}
      </div>
    </section>
  );
}

function ConclusionBlock({
  conclusion,
}: {
  conclusion: JourneyInspectorEvidenceConclusion;
}) {
  const badge =
    conclusion.verdict === 'executable'
      ? { label: '可执行', className: 'border-nara-tundra-border text-nara-tundra-foreground' }
      : conclusion.verdict === 'caution'
        ? { label: '需谨慎', className: 'border-gate-confirm-border text-gate-confirm-foreground' }
        : { label: '不可执行', className: 'border-gate-reject-border text-gate-reject-foreground' };

  return (
    <section className={cn(workbenchCard, 'p-3')}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">证据结论</p>
        <Badge variant="outline" className={cn('h-5 text-[10px]', badge.className)}>
          {badge.label}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{conclusion.text}</p>
    </section>
  );
}
