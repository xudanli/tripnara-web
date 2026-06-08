import type { RouteDirection } from '@/types/places-routes';
import type { HikingTrailDetail } from '@/types/hiking-trail-detail';
import type {
  RouteDirectionReadinessResponse,
  RouteReadinessFactors,
} from '@/types/route-readiness';
import {
  computeTrailReadiness,
  type TrailReadinessResult,
} from '@/lib/trail-readiness-score';

function levelToStatus(level: string): TrailReadinessResult['status'] {
  const l = level.toLowerCase();
  if (l === 'ready' || l === 'go') return 'go';
  if (l === 'caution' || l === 'warn' || l === 'warning') return 'caution';
  return 'no-go';
}

function partitionBlockers(
  items: RouteDirectionReadinessResponse['blockers']
): { blockers: string[]; cautions: string[] } {
  const blockers: string[] = [];
  const cautions: string[] = [];
  for (const b of items ?? []) {
    const msg = b.messageZh || b.code;
    if (!msg) continue;
    const sev = (b.severity ?? '').toLowerCase();
    if (sev === 'error' || sev === 'critical' || sev === 'blocker') {
      blockers.push(msg);
    } else {
      cautions.push(msg);
    }
  }
  return { blockers, cautions };
}

function mapApiFactors(
  api: RouteReadinessFactors | undefined,
  local: TrailReadinessResult['factors']
): TrailReadinessResult['factors'] {
  if (!api) return local;
  const keys = ['season', 'weather', 'terrain', 'fitness'] as const;
  const out = { ...local };
  for (const key of keys) {
    const f = api[key];
    if (f) {
      out[key] = {
        label: f.label || local[key].label,
        score: Math.min(100, Math.max(0, f.score)),
        detailZh: f.detailZh,
      };
    }
  }
  return out;
}

/** 服务端 P2 结果覆盖本地 compute；失败时由调用方 fallback */
export function mapRouteReadinessToTrailResult(
  api: RouteDirectionReadinessResponse,
  trail: RouteDirection,
  hd?: HikingTrailDetail
): TrailReadinessResult {
  const local = computeTrailReadiness(trail, hd);
  const { blockers, cautions } = partitionBlockers(api.blockers);
  const status = levelToStatus(api.level);
  const score = Math.min(100, Math.max(0, api.score));

  const headlineZh =
    api.headlineZh ??
    (status === 'go'
      ? '可走指数良好，建议完成准备清单后出发'
      : status === 'caution'
        ? '存在需注意因素，建议查看风险与装备'
        : '不建议近期出发，请调整日期或路线');

  return {
    score,
    status,
    headlineZh,
    summaryZh: api.summaryZh ?? local.summaryZh,
    blockers: blockers.length ? blockers : local.blockers,
    cautions: cautions.length ? cautions : local.cautions,
    factors: mapApiFactors(api.factors, local.factors),
    factorsFromServer: Boolean(api.factors),
  };
}
