import type {
  CreateHikePlanRequest,
  HikePlanPrepData,
  HikePlanRecord,
  HikePlanStatus,
  OnTrailLiveStateDto,
  UpdateHikePlanPrepRequest,
  UpdateHikePlanRequest,
} from '@/types/hike-plan';
import type { HikeReview, PrepChecklist, PrepPermit, PrepTransport } from '@/types/trail';
import type { TrailEvent } from '@/types/trail';

const DB_NAME = 'tripnara-hike-plans';
const PLANS = 'plans';
const PREP = 'prep';
const LIVE = 'live';
const REVIEWS = 'reviews';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PLANS)) {
          db.createObjectStore(PLANS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PREP)) {
          db.createObjectStore(PREP, { keyPath: 'hikePlanId' });
        }
        if (!db.objectStoreNames.contains(LIVE)) {
          db.createObjectStore(LIVE, { keyPath: 'hikePlanId' });
        }
        if (!db.objectStoreNames.contains(REVIEWS)) {
          db.createObjectStore(REVIEWS, { keyPath: 'hikePlanId' });
        }
      };
    });
  }
  return dbPromise;
}

async function txStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

export function defaultPrepChecklist(): PrepChecklist[] {
  return [
    {
      id: 'essential',
      category: 'essential',
      items: [
        { id: '1', name: '地图和指南针', required: true, checked: false },
        { id: '2', name: 'GPS设备/手机', required: true, checked: false },
        { id: '3', name: '头灯/手电筒', required: true, checked: false },
        { id: '4', name: '急救包', required: true, checked: false },
      ],
    },
    {
      id: 'clothing',
      category: 'clothing',
      items: [
        { id: '5', name: '防水外套', required: true, checked: false, reason: '预计有降水' },
        { id: '6', name: '保暖层', required: true, checked: false },
      ],
    },
    {
      id: 'safety',
      category: 'safety',
      items: [
        { id: '8', name: '口哨', required: true, checked: false },
        { id: '9', name: '救生毯', required: true, checked: false },
      ],
    },
  ];
}

export function defaultPrepPermits(): PrepPermit[] {
  return [
    {
      id: '1',
      name: '国家公园许可',
      required: true,
      obtained: false,
      bookingUrl: 'https://example.com/permits',
    },
  ];
}

export function defaultPrepTransport(): PrepTransport {
  return {
    type: 'drive',
    toTrailhead: { method: '自驾', estimatedDuration: 120 },
    fromTrailhead: { method: '自驾' },
  };
}

export const hikePlanLocalStore = {
  async list(): Promise<HikePlanRecord[]> {
    const all = await txStore<HikePlanRecord[]>(PLANS, 'readonly', (s) => s.getAll());
    return (all ?? []).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async get(id: string): Promise<HikePlanRecord | null> {
    const row = await txStore<HikePlanRecord | undefined>(PLANS, 'readonly', (s) => s.get(id));
    return row ?? null;
  },

  async create(body: CreateHikePlanRequest): Promise<HikePlanRecord> {
    const id = crypto.randomUUID();
    const ts = nowIso();
    const plan: HikePlanRecord = {
      id,
      routeDirectionId: body.routeDirectionId,
      routeDirectionName: body.routeDirectionName,
      nameCN: body.nameCN,
      tripId: body.tripId,
      plannedDate: body.plannedDate ?? ts.slice(0, 10),
      plannedStartTime: body.plannedStartTime,
      status: 'planning',
      createdAt: ts,
      updatedAt: ts,
    };
    await txStore(PLANS, 'readwrite', (s) => s.put(plan));
    const prep: HikePlanPrepData = {
      hikePlanId: id,
      checklist: defaultPrepChecklist(),
      permits: defaultPrepPermits(),
      transport: defaultPrepTransport(),
    };
    await txStore(PREP, 'readwrite', (s) => s.put(prep));
    return plan;
  },

  async update(id: string, body: UpdateHikePlanRequest): Promise<HikePlanRecord> {
    const existing = await this.get(id);
    if (!existing) throw new Error('本地 HikePlan 不存在');
    const updated: HikePlanRecord = {
      ...existing,
      ...body,
      updatedAt: nowIso(),
    };
    await txStore(PLANS, 'readwrite', (s) => s.put(updated));
    return updated;
  },

  async setStatus(id: string, status: HikePlanStatus): Promise<HikePlanRecord> {
    const patch: UpdateHikePlanRequest = { status };
    if (status === 'in_progress') {
      const p = await this.get(id);
      return this.update(id, {
        ...patch,
        ...(p?.startedAt ? {} : {}),
      }).then(async (plan) => {
        const withStart = { ...plan, startedAt: plan.startedAt ?? nowIso() };
        await txStore(PLANS, 'readwrite', (s) => s.put(withStart));
        return withStart;
      });
    }
    if (status === 'completed') {
      const p = await this.get(id);
      const withEnd = {
        ...p!,
        status,
        completedAt: nowIso(),
        updatedAt: nowIso(),
      };
      await txStore(PLANS, 'readwrite', (s) => s.put(withEnd));
      return withEnd;
    }
    return this.update(id, patch);
  },

  async start(id: string): Promise<HikePlanRecord> {
    const p = await this.get(id);
    if (!p) throw new Error('本地 HikePlan 不存在');
    const updated = {
      ...p,
      status: 'in_progress' as const,
      startedAt: p.startedAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    await txStore(PLANS, 'readwrite', (s) => s.put(updated));
    return updated;
  },

  async complete(id: string): Promise<HikePlanRecord> {
    return this.setStatus(id, 'completed');
  },

  async getPrep(id: string): Promise<HikePlanPrepData> {
    const row = await txStore<HikePlanPrepData | undefined>(PREP, 'readonly', (s) =>
      s.get(id)
    );
    if (row) return row;
    const prep: HikePlanPrepData = {
      hikePlanId: id,
      checklist: defaultPrepChecklist(),
      permits: defaultPrepPermits(),
      transport: defaultPrepTransport(),
    };
    await txStore(PREP, 'readwrite', (s) => s.put(prep));
    return prep;
  },

  async updatePrep(id: string, body: UpdateHikePlanPrepRequest): Promise<HikePlanPrepData> {
    const current = await this.getPrep(id);
    const merged: HikePlanPrepData = {
      hikePlanId: id,
      checklist: body.checklist ?? current.checklist,
      permits: body.permits ?? current.permits,
      transport: body.transport ?? current.transport,
    };
    await txStore(PREP, 'readwrite', (s) => s.put(merged));
    if (
      body.checklistCompleted != null ||
      body.permitsObtained != null ||
      body.transportArranged != null ||
      body.offlinePackDownloaded != null
    ) {
      await this.update(id, {
        checklistCompleted: body.checklistCompleted,
        permitsObtained: body.permitsObtained,
        transportArranged: body.transportArranged,
        offlinePackDownloaded: body.offlinePackDownloaded,
      });
    }
    return merged;
  },

  async getLiveState(id: string): Promise<OnTrailLiveStateDto> {
    const row = await txStore<OnTrailLiveStateDto | undefined>(LIVE, 'readonly', (s) =>
      s.get(id)
    );
    if (row) return row;
    return {
      hikePlanId: id,
      distanceCompletedKm: 0,
      elevationGainedM: 0,
      timeElapsedMin: 0,
      events: [],
    };
  },

  async updateLiveState(
    id: string,
    patch: Partial<OnTrailLiveStateDto>
  ): Promise<OnTrailLiveStateDto> {
    const current = await this.getLiveState(id);
    const merged = { ...current, ...patch, hikePlanId: id };
    await txStore(LIVE, 'readwrite', (s) => s.put(merged));
    return merged;
  },

  async appendEvent(id: string, event: TrailEvent): Promise<OnTrailLiveStateDto> {
    const live = await this.getLiveState(id);
    return this.updateLiveState(id, {
      events: [...(live.events ?? []), event],
    });
  },

  async saveReview(hikePlanId: string, review: HikeReview): Promise<void> {
    await txStore(REVIEWS, 'readwrite', (s) => s.put({ hikePlanId, review }));
  },

  async getReview(hikePlanId: string): Promise<HikeReview | null> {
    const row = await txStore<{ hikePlanId: string; review: HikeReview } | undefined>(
      REVIEWS,
      'readonly',
      (s) => s.get(hikePlanId)
    );
    return row?.review ?? null;
  },
};
