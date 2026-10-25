import { ortoolsShadowApi } from '@/api/ortools-shadow';
import type {
  OrtToolsShadowHealthData,
  OrtToolsShadowHealthSnapshot,
} from '@/types/ortools-shadow';

/** Health 缓存 TTL（文档建议 30–60s） */
export const ORTOOLS_SHADOW_HEALTH_TTL_MS = 45_000;

const emptySnapshot = (): OrtToolsShadowHealthSnapshot => ({
  loaded: false,
  data: null,
  error: null,
});

let snapshot: OrtToolsShadowHealthSnapshot = emptySnapshot();
let inflight: Promise<OrtToolsShadowHealthSnapshot> | null = null;

function isFresh(snap: OrtToolsShadowHealthSnapshot): boolean {
  if (!snap.loaded || snap.fetchedAt == null) return false;
  return Date.now() - snap.fetchedAt < ORTOOLS_SHADOW_HEALTH_TTL_MS;
}

export function getOrtToolsShadowHealthSnapshot(): OrtToolsShadowHealthSnapshot {
  return snapshot;
}

export function resetOrtToolsShadowHealthForTests(
  next?: OrtToolsShadowHealthSnapshot,
): void {
  snapshot = next ?? emptySnapshot();
  inflight = null;
}

export async function prefetchOrtToolsShadowHealth(
  options?: { force?: boolean },
): Promise<OrtToolsShadowHealthSnapshot> {
  if (!options?.force && isFresh(snapshot)) return snapshot;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await ortoolsShadowApi.getHealth();
      snapshot = {
        loaded: true,
        fetchedAt: Date.now(),
        data,
        error: null,
      };
      return snapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OR-Tools Shadow health 探活失败';
      snapshot = {
        loaded: true,
        fetchedAt: Date.now(),
        data: snapshot.data,
        error: message,
      };
      return snapshot;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function isOrtToolsShadowRepairEnabled(): boolean {
  return snapshot.data?.shadowRepairEnabled === true;
}

export function getOrtToolsShadowHealthData(): OrtToolsShadowHealthData | null {
  return snapshot.data;
}
