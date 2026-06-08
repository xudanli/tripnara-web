import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLaugavegurPreview, useLaugavegurSnapshot } from '@/hooks/useHikingDemo';
import { useComputeStepsPlayback } from '@/hooks/useComputeStepsPlayback';
import {
  ComputeStepCard,
  DaySkeletonBar,
  HikingElevationChart,
  SupplyPoisSchematic,
  WeatherRiskPanel,
} from '@/components/hiking';
import { FitnessQuestionnaireDialog } from '@/components/fitness/FitnessQuestionnaireDialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  resolveLongestHikeForPreview,
  setStoredLongestHike,
} from '@/lib/hiking-longest-hike';
import { cn } from '@/lib/utils';
import { MapboxTrailMap } from '@/components/map';
import { polylineToCoordinates, supplyPoiMarkerColor } from '@/lib/map-geo';
import { isMapboxConfigured } from '@/lib/mapbox-token';

const LONGEST_HIKE_OPTIONS = [
  { value: 0, label: '0–2h' },
  { value: 1, label: '2–4h' },
  { value: 2, label: '4–6h' },
  { value: 3, label: '6–8h' },
  { value: 4, label: '8h+' },
];

export default function HikingLaugavegurDemoPage() {
  const [longestHike, setLongestHike] = useState(resolveLongestHikeForPreview);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);

  const snapshotQuery = useLaugavegurSnapshot(true);
  const previewQuery = useLaugavegurPreview(longestHike, true);

  const preview = previewQuery.data;
  const snapshot = snapshotQuery.data;

  const daySkeleton = preview?.daySkeleton ?? snapshot?.daySkeleton ?? [];
  const supplyPois = preview?.supplyPois ?? snapshot?.supplyPois ?? [];
  const polyline = preview?.polyline ?? snapshot?.polyline;

  const steps = preview?.computeSteps;
  const playback = useComputeStepsPlayback(steps);
  const playbackStartedRef = useRef(false);

  useEffect(() => {
    playbackStartedRef.current = false;
  }, [longestHike]);

  useEffect(() => {
    if (
      preview?.computeSteps?.length &&
      !playbackStartedRef.current &&
      !previewQuery.isFetching
    ) {
      playbackStartedRef.current = true;
      playback.run();
    }
  }, [preview?.computeSteps, previewQuery.isFetching]);

  const handleLongestHikeChange = (v: number) => {
    setLongestHike(v);
    setStoredLongestHike(v);
    playback.reset();
    playbackStartedRef.current = false;
    void previewQuery.refetch();
  };

  const showElevation = playback.reveal.elevation && preview?.elevationProfile;
  const showFitness = playback.reveal.fitness && preview?.fitnessMatch;
  const showWeather = playback.reveal.weather && preview?.weatherRisk;
  const showSupply = playback.finished || showWeather;

  const cachedFallback = steps?.some((s) => s.status === 'cached_fallback');

  const trailLineCoordinates = useMemo(() => {
    const fromPolyline = polylineToCoordinates(polyline ?? []);
    if (fromPolyline.length >= 2) return fromPolyline;
    const profile = preview?.elevationProfile;
    if (profile?.length) {
      return polylineToCoordinates(
        profile.map((p) => ({ lat: p.lat, lng: p.lng }))
      );
    }
    return [];
  }, [polyline, preview?.elevationProfile]);

  const supplyMarkers = useMemo(
    () =>
      supplyPois.map((p) => ({
        id: p.id,
        lng: p.lng,
        lat: p.lat,
        label: `${p.nameCN} (${p.subCategory})`,
        color: supplyPoiMarkerColor(p.subCategory),
      })),
    [supplyPois]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-3xl px-6 pt-14 pb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Laugavegur · Phase 1 Demo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          朗格迈维卢尔 · 4 日经典步道
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          剖面图 · 算力动效 · 2.5D 补给 — 无登录融资演示
        </p>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-6 pb-24">
        {/* 体能档位 */}
        <section className="flex flex-wrap items-center justify-center gap-2">
          <span className="w-full text-center text-xs text-muted-foreground sm:w-auto">
            最长单日徒步（与问卷一致）
          </span>
          {LONGEST_HIKE_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant={longestHike === opt.value ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => handleLongestHikeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setQuestionnaireOpen(true)}
          >
            完整问卷
          </Button>
        </section>

        {/* 首屏骨架（快照） */}
        {daySkeleton.length > 0 && !showFitness && (
          <section className="opacity-70">
            <DaySkeletonBar days={daySkeleton} />
          </section>
        )}

        {/* 算力卡片序列 */}
        {previewQuery.isLoading && (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {previewQuery.isError && (
          <p className="text-center text-sm text-red-600">
            {(previewQuery.error as Error)?.message ?? '预览加载失败'}
          </p>
        )}

        {steps && steps.length > 0 && (
          <section className="space-y-3">
            {steps.map((step, i) => (
              <ComputeStepCard
                key={step.id}
                step={step}
                active={playback.activeIndex === i}
                done={playback.finished || playback.activeIndex > i}
                progress={playback.activeIndex === i ? playback.stepProgress : 1}
              />
            ))}
          </section>
        )}

        {/* 海拔剖面 */}
        {showElevation && preview && (
          <section className="space-y-2">
            <HikingElevationChart
              points={preview.elevationProfile}
              dataSource={
                cachedFallback ? 'cached_fixture' : preview?.terrainSummary?.dataSource
              }
            />
            <p className="text-center text-[11px] text-muted-foreground">
              累计爬升 {preview.terrainSummary.cumulativeAscentM} m · 最大坡度{' '}
              {preview.terrainSummary.maxSlopePct}% · {preview.terrainSummary.difficulty}
            </p>
          </section>
        )}

        {/* 体能匹配 + 日节奏 */}
        {showFitness && preview && (
          <section className="space-y-4">
            <DaySkeletonBar
              days={preview.daySkeleton}
              verdicts={preview.fitnessMatch.dayPaceVerdict}
            />
          </section>
        )}

        {/* 天气避险 */}
        {showWeather && preview && (
          <section>
            <WeatherRiskPanel weatherRisk={preview.weatherRisk} />
          </section>
        )}

        {/* 路线地图 + 补给 */}
        {showSupply && (supplyPois.length > 0 || trailLineCoordinates.length >= 2) && (
          <section className={cn('space-y-4', !playback.finished && 'opacity-90')}>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                步道轨迹 · Mapbox
              </p>
              <MapboxTrailMap
                height={400}
                lineCoordinates={trailLineCoordinates}
                markers={supplyMarkers}
                mapStyle="outdoors"
                fitBounds
              />
            </div>
            {!isMapboxConfigured() && supplyPois.length > 0 && (
              <SupplyPoisSchematic pois={supplyPois} polyline={polyline} />
            )}
          </section>
        )}

        {playback.finished && previewQuery.isSuccess && (
          <div className="text-center">
            <Button type="button" variant="outline" size="sm" onClick={() => playback.run()}>
              重新播放动效
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          返回首页
        </Link>
        <span className="mx-2">·</span>
        <Link to="/login" className="underline-offset-4 hover:underline">
          登录后生成正式计划
        </Link>
      </footer>

      <FitnessQuestionnaireDialog
        open={questionnaireOpen}
        onOpenChange={setQuestionnaireOpen}
        onComplete={() => {
          setLongestHike(resolveLongestHikeForPreview());
          previewQuery.refetch();
        }}
      />
    </div>
  );
}
