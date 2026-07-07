import { useCallback, useEffect, useRef, useState } from 'react';
import { dailyLoadApi } from '@/api/daily-load';
import { weatherHazardApi } from '@/api/weather-hazard';
import { isUnifiedDecisionGatewayEnabled } from '@/lib/decision-gateway.util';
import type {
  DailyLoadScanResponse,
  WeatherHazardPollResponse,
} from '@/types/unified-decision';

export interface UseProactiveDecisionScanOptions {
  tripId: string;
  /** 0-based TripDay 索引；默认扫描第 0 天 */
  dayIndices?: number[];
  enabled?: boolean;
  /** 检测到变化时是否 runFull（默认 false，仅探测） */
  runFull?: boolean;
}

export interface ProactiveDecisionScanResult {
  weather: WeatherHazardPollResponse[];
  dailyLoad: DailyLoadScanResponse | null;
  /** 任一 poll/scan 报告 changed 或 overloaded */
  hasDetection: boolean;
  /** runFull 后返回的 problemId（便于导航） */
  detectedProblemIds: string[];
  loading: boolean;
  error: string | null;
  scan: () => Promise<void>;
}

export function useProactiveDecisionScan({
  tripId,
  dayIndices = [0],
  enabled = true,
  runFull = false,
}: UseProactiveDecisionScanOptions): ProactiveDecisionScanResult {
  const [weather, setWeather] = useState<WeatherHazardPollResponse[]>([]);
  const [dailyLoad, setDailyLoad] = useState<DailyLoadScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  const scan = useCallback(async () => {
    if (!tripId || !isUnifiedDecisionGatewayEnabled()) return;
    try {
      setLoading(true);
      setError(null);
      const weatherResults = await Promise.all(
        dayIndices.map((dayIndex) =>
          weatherHazardApi.poll(tripId, { dayIndex, runFull }),
        ),
      );
      const loadResult = await dailyLoadApi.scan(tripId, { runFull });
      setWeather(weatherResults);
      setDailyLoad(loadResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '主动检测失败');
    } finally {
      setLoading(false);
    }
  }, [tripId, dayIndices, runFull]);

  useEffect(() => {
    if (!enabled || !tripId || !isUnifiedDecisionGatewayEnabled()) return;
    scannedRef.current = false;
  }, [enabled, tripId]);

  useEffect(() => {
    if (!enabled || !tripId || !isUnifiedDecisionGatewayEnabled()) return;
    if (scannedRef.current) return;
    scannedRef.current = true;
    void scan();
  }, [enabled, tripId, scan]);

  const detectedProblemIds = [
    ...weather
      .filter((w) => w.changed && w.problem?.problemId)
      .map((w) => w.problem!.problemId!),
    ...(dailyLoad?.overloaded && dailyLoad.problem?.problemId
      ? [dailyLoad.problem.problemId]
      : []),
  ];

  const hasDetection =
    weather.some((w) => w.changed === true) || dailyLoad?.overloaded === true;

  return {
    weather,
    dailyLoad,
    hasDetection,
    detectedProblemIds,
    loading,
    error,
    scan,
  };
}
