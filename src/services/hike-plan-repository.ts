/**
 * HikePlan：按存储模式走云端 API 或本地 IndexedDB
 * - api：仅 `/api/hiking/hike-plans/*`（需登录）
 * - local：IndexedDB
 * - auto（默认）：已登录 → api，未登录 → local
 */

import axios from 'axios';
import { hikePlansApi } from '@/api/hike-plans';
import { hikePlanLocalStore } from '@/services/hike-plan-local-store';
import { hikePlanGpsStore } from '@/services/hike-plan-gps-store';
import {
  HikePlanAuthRequiredError,
  isHikePlanAuthError,
  isUserAuthenticated,
  resolveHikePlanStorageMode,
} from '@/lib/hike-plan-storage';
import type { CreateHikePlanRequest, GenerateHikeReviewRequest, GpsTrackResponse, HikePlanRecord, HikeReviewResponse, UpdateHikePlanPrepRequest, UpdateHikePlanRequest, UpdateOnTrailLiveStateRequest, UploadTrackPointsRequest } from '@/types/hike-plan';
import type { HikeReview } from '@/types/trail';
import { summarizeTrackPoints } from '@/lib/geo-track';
import { normalizeHikePlanPrep } from '@/lib/normalize-hike-plan-prep';

function getMode(): 'api' | 'local' {
  return resolveHikePlanStorageMode(isUserAuthenticated());
}

function assertApiAccess(): void {
  if (!isUserAuthenticated()) {
    throw new HikePlanAuthRequiredError();
  }
}

function rethrowApiAuth(err: unknown): never {
  if (isHikePlanAuthError(err)) throw new HikePlanAuthRequiredError();
  throw err;
}

function isNetworkFallbackError(err: unknown): boolean {
  if (err instanceof HikePlanAuthRequiredError) return false;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 401 || status === 403) return false;
    if (status === 404 || status === 501 || status === 502 || status === 503) return true;
    if (!err.response) return true;
    return false;
  }
  if (!err || typeof err !== 'object') return true;
  const msg = (err as Error).message ?? '';
  return /network|timeout|failed|fetch|不存在/i.test(msg);
}

function isHikePlanCreateFallbackError(err: unknown): boolean {
  if (!isNetworkFallbackError(err)) return false;
  if (!axios.isAxiosError(err)) return true;
  const data = err.response?.data;
  const message =
    typeof data === 'string'
      ? data
      : typeof data === 'object' && data
        ? JSON.stringify(data)
        : '';
  return /route direction.*not found|not found/i.test(message);
}

async function run<T>(
  apiFn: () => Promise<T>,
  localFn: () => Promise<T>
): Promise<T> {
  const mode = getMode();
  if (mode === 'api') {
    assertApiAccess();
    try {
      return await apiFn();
    } catch (err) {
      rethrowApiAuth(err);
    }
  }
  return localFn();
}

export const hikePlanRepository = {
  create: async (body: CreateHikePlanRequest) => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        return await hikePlansApi.create(body);
      } catch (err) {
        rethrowApiAuth(err);
        if (isHikePlanCreateFallbackError(err)) {
          return hikePlanLocalStore.create(body);
        }
        throw err;
      }
    }
    return hikePlanLocalStore.create(body);
  },

  list: (params?: { status?: string; routeDirectionId?: number }) =>
    run(() => hikePlansApi.list(params), () => {
      return hikePlanLocalStore.list().then((rows) => {
        if (params?.status) rows = rows.filter((r) => r.status === params.status);
        if (params?.routeDirectionId != null) {
          rows = rows.filter((r) => r.routeDirectionId === params.routeDirectionId);
        }
        return rows;
      });
    }),

  getById: (id: string) =>
    run(
      () => hikePlansApi.getById(id),
      () =>
        hikePlanLocalStore.get(id).then((p) => {
          if (!p) throw new Error('HikePlan 不存在');
          return p;
        })
    ),

  update: (id: string, body: UpdateHikePlanRequest) =>
    run(() => hikePlansApi.update(id, body), () => hikePlanLocalStore.update(id, body)),

  start: (id: string) =>
    run(() => hikePlansApi.start(id), () => hikePlanLocalStore.start(id)),

  complete: (id: string) =>
    run(() => hikePlansApi.complete(id), () => hikePlanLocalStore.complete(id)),

  getPrep: (id: string) =>
    run(
      () => hikePlansApi.getPrep(id).then((p) => normalizeHikePlanPrep(p, id)),
      () => hikePlanLocalStore.getPrep(id).then((p) => normalizeHikePlanPrep(p, id))
    ),

  updatePrep: (id: string, body: UpdateHikePlanPrepRequest) =>
    run(
      () => hikePlansApi.updatePrep(id, body).then((p) => normalizeHikePlanPrep(p, id)),
      () => hikePlanLocalStore.updatePrep(id, body).then((p) => normalizeHikePlanPrep(p, id))
    ),

  /** 仅 API 模式；从路线最新 hikingDetail 刷新 prep 模板（保留勾选/许可状态） */
  refreshPrepTemplate: async (id: string) => {
    assertApiAccess();
    try {
      const prep = await hikePlansApi.refreshPrepTemplate(id);
      return normalizeHikePlanPrep(prep, id, { useDefaultsWhenEmpty: false });
    } catch (err) {
      rethrowApiAuth(err);
    }
  },

  getLiveState: (id: string) =>
    run(() => hikePlansApi.getLiveState(id), () => hikePlanLocalStore.getLiveState(id)),

  updateLiveState: (id: string, body: UpdateOnTrailLiveStateRequest) =>
    run(
      () => hikePlansApi.updateLiveState(id, body),
      async () => {
        const cur = await hikePlanLocalStore.getLiveState(id);
        return hikePlanLocalStore.updateLiveState(id, { ...cur, ...body });
      }
    ),

  appendEvent: async (id: string, event: Parameters<typeof hikePlanLocalStore.appendEvent>[1]) => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        const live = await hikePlansApi.getLiveState(id);
        await hikePlansApi.updateLiveState(id, {
          events: [...(live.events ?? []), event],
        });
        return hikePlansApi.getLiveState(id);
      } catch (err) {
        rethrowApiAuth(err);
      }
    }
    return hikePlanLocalStore.appendEvent(id, event);
  },

  uploadTrackPoints: async (id: string, body: UploadTrackPointsRequest) => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      await hikePlanGpsStore.appendPoints(id, body.points);
      try {
        const res = await hikePlansApi.uploadTrackPoints(id, body);
        return res;
      } catch (err) {
        if (isHikePlanAuthError(err)) throw new HikePlanAuthRequiredError();
        if (isNetworkFallbackError(err)) {
          await hikePlanGpsStore.enqueueSync(id, body.points);
          const summary = await hikePlanGpsStore.getSummary(id);
          const points = await hikePlanGpsStore.getPoints(id);
          return {
            accepted: body.points.length,
            totalPoints: points.length,
            summary,
          };
        }
        throw err;
      }
    }
    await hikePlanGpsStore.appendPoints(id, body.points);
    const summary = await hikePlanGpsStore.getSummary(id);
    const points = await hikePlanGpsStore.getPoints(id);
    return {
      accepted: body.points.length,
      totalPoints: points.length,
      summary,
    };
  },

  getTrack: async (id: string): Promise<GpsTrackResponse> => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        const remote = await hikePlansApi.getTrack(id);
        await hikePlanGpsStore.replaceFromServer(id, remote.points);
        return remote;
      } catch (err) {
        rethrowApiAuth(err);
      }
    }
    const points = await hikePlanGpsStore.getPoints(id);
    return {
      hikePlanId: id,
      points,
      summary: summarizeTrackPoints(points),
    };
  },

  syncPendingGps: async (hikePlanId: string) => {
    if (getMode() !== 'api') return;
    assertApiAccess();
    const batches = await hikePlanGpsStore.listPendingBatches(hikePlanId);
    for (const batch of batches) {
      try {
        await hikePlansApi.uploadTrackPoints(hikePlanId, {
          points: batch.points,
          clientBatchId: batch.id,
        });
        await hikePlanGpsStore.removeBatch(batch.id);
      } catch (err) {
        if (isHikePlanAuthError(err)) throw new HikePlanAuthRequiredError();
        break;
      }
    }
  },

  getReview: async (id: string): Promise<HikeReviewResponse> => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        return await hikePlansApi.getReview(id);
      } catch (err) {
        rethrowApiAuth(err);
      }
    }
    const review = await hikePlanLocalStore.getReview(id);
    if (!review) throw new Error('复盘尚未生成');
    return { hikePlanId: id, review };
  },

  generateReview: async (id: string, body?: GenerateHikeReviewRequest) => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        return await hikePlansApi.generateReview(id, body);
      } catch (err) {
        rethrowApiAuth(err);
      }
    }
    const plan = await hikePlanLocalStore.get(id);
    const track = await hikePlanGpsStore.getPoints(id);
    const summary = summarizeTrackPoints(track);
    const review: HikeReview = {
      id: crypto.randomUUID(),
      hikePlanId: id,
      trailId: String(plan?.routeDirectionId ?? ''),
      completedDate: plan?.completedAt ?? new Date().toISOString(),
      actualDistanceKm: summary.distanceKm,
      actualDurationMin: summary.durationMin,
      actualElevationGainedM: summary.elevationGainM ?? 0,
      elevationEvents: [],
      insights: [
        {
          id: '1',
          category: 'rhythm',
          title: '节奏概览（本地生成）',
          description: `基于 GPS ${summary.pointCount} 点，约 ${summary.distanceKm.toFixed(1)} km / ${summary.durationMin} 分钟`,
        },
      ],
      anchorRules: [],
      status: 'generated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await hikePlanLocalStore.saveReview(id, review);
    return { hikePlanId: id, review };
  },

  updateReview: async (id: string, review: Partial<HikeReview>) => {
    const mode = getMode();
    if (mode === 'api') {
      assertApiAccess();
      try {
        return await hikePlansApi.updateReview(id, review);
      } catch (err) {
        rethrowApiAuth(err);
      }
    }
    const existing = await hikePlanLocalStore.getReview(id);
    const merged = { ...existing!, ...review, updatedAt: new Date().toISOString() } as HikeReview;
    await hikePlanLocalStore.saveReview(id, merged);
    return { hikePlanId: id, review: merged };
  },
};

/** 从 URL 参数解析：UUID 为 planId，纯数字为 routeDirectionId（需创建计划） */
export function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

export async function resolveOrCreateHikePlanId(
  param: string,
  opts?: { routeDirectionName?: string; nameCN?: string }
): Promise<{ hikePlanId: string; plan: HikePlanRecord; created: boolean }> {
  if (isUuidLike(param)) {
    const plan = await hikePlanRepository.getById(param);
    return { hikePlanId: param, plan, created: false };
  }
  const routeDirectionId = Number(param);
  if (!Number.isFinite(routeDirectionId)) {
    throw new Error('无效的 HikePlan 或路线 ID');
  }
  const existing = await hikePlanRepository.list({
    routeDirectionId,
    status: 'planning',
  });
  const active = existing.find(
    (p) => p.status === 'planning' || p.status === 'ready' || p.status === 'in_progress'
  );
  if (active) {
    return { hikePlanId: active.id, plan: active, created: false };
  }
  const plan = await hikePlanRepository.create({
    routeDirectionId,
    routeDirectionName: opts?.routeDirectionName,
    nameCN: opts?.nameCN,
    plannedDate: new Date().toISOString().slice(0, 10),
  });
  return { hikePlanId: plan.id, plan, created: true };
}
