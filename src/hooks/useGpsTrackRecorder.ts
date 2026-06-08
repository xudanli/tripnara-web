import { useCallback, useEffect, useRef, useState } from 'react';
import { hikePlanRepository } from '@/services/hike-plan-repository';
import { hikePlanGpsStore } from '@/services/hike-plan-gps-store';
import {
  pointsToLineCoordinates,
  positionToTrackPoint,
  summarizeTrackPoints,
} from '@/lib/geo-track';
import { normalizeGpsTrackSummary } from '@/lib/on-trail-state';
import type { GpsTrackPointDto, GpsTrackSummary } from '@/types/hike-plan';
import type { LngLat } from '@/lib/map-geo';

const MIN_INTERVAL_MS = 4_000;
const FLUSH_EVERY_N = 5;

export type UseGpsTrackRecorderOptions = {
  /** track-points 上传成功后回调（用于拉取 live-state 偏航 events） */
  onTrackFlushed?: () => void;
};

export function useGpsTrackRecorder(
  hikePlanId: string | undefined,
  enabled: boolean,
  options?: UseGpsTrackRecorderOptions
) {
  const [recording, setRecording] = useState(false);
  const [points, setPoints] = useState<GpsTrackPointDto[]>([]);
  const [summary, setSummary] = useState<GpsTrackSummary>({
    pointCount: 0,
    distanceKm: 0,
    durationMin: 0,
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const bufferRef = useRef<GpsTrackPointDto[]>([]);
  const lastSampleAtRef = useRef(0);

  const lineCoordinates: LngLat[] = pointsToLineCoordinates(points);

  const loadTrack = useCallback(async () => {
    if (!hikePlanId) return;
    try {
      const track = await hikePlanRepository.getTrack(hikePlanId);
      setPoints(track.points);
      setSummary(normalizeGpsTrackSummary(track.summary));
    } catch {
      const local = await hikePlanGpsStore.getPoints(hikePlanId);
      setPoints(local);
      setSummary(summarizeTrackPoints(local));
    }
  }, [hikePlanId]);

  const flushBuffer = useCallback(async () => {
    if (!hikePlanId || bufferRef.current.length === 0) return;
    const batch = [...bufferRef.current];
    bufferRef.current = [];
    try {
      const res = await hikePlanRepository.uploadTrackPoints(hikePlanId, {
        points: batch,
        clientBatchId: crypto.randomUUID(),
      });
      setSummary(normalizeGpsTrackSummary(res.summary));
      await hikePlanRepository.syncPendingGps(hikePlanId);
      options?.onTrackFlushed?.();
    } catch (e) {
      setLastError((e as Error).message);
    }
  }, [hikePlanId, options?.onTrackFlushed]);

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSampleAtRef.current < MIN_INTERVAL_MS) return;
      lastSampleAtRef.current = now;
      const point = positionToTrackPoint(position);
      bufferRef.current.push(point);
      setPoints((prev) => {
        const next = [...prev, point];
        setSummary(summarizeTrackPoints(next));
        return next;
      });
      if (bufferRef.current.length >= FLUSH_EVERY_N) {
        void flushBuffer();
      }
    },
    [flushBuffer]
  );

  const startRecording = useCallback(() => {
    if (!hikePlanId || !navigator.geolocation) {
      setLastError('浏览器不支持定位');
      return;
    }
    setLastError(null);
    setRecording(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => setLastError(err.message),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 }
    );
  }, [hikePlanId, onPosition]);

  const stopRecording = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setRecording(false);
    void flushBuffer();
  }, [flushBuffer]);

  useEffect(() => {
    loadTrack();
  }, [loadTrack]);

  useEffect(() => {
    if (!enabled || !hikePlanId) {
      stopRecording();
      return;
    }
    startRecording();
    return () => stopRecording();
  }, [enabled, hikePlanId]); // eslint-disable-line react-hooks/exhaustive-deps -- start/stop on enabled toggle only

  useEffect(() => {
    if (!hikePlanId || !navigator.onLine) return;
    void hikePlanRepository.syncPendingGps(hikePlanId);
  }, [hikePlanId, recording]);

  return {
    recording,
    points,
    summary,
    lineCoordinates,
    lastError,
    startRecording,
    stopRecording,
    flushBuffer,
    reload: loadTrack,
  };
}
