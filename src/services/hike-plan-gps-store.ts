import type { GpsTrackPointDto, GpsTrackSummary } from '@/types/hike-plan';
import { summarizeTrackPoints } from '@/lib/geo-track';

const DB_NAME = 'tripnara-hike-gps';
const POINTS = 'points';
const SYNC_QUEUE = 'sync_queue';
const DB_VERSION = 1;

type PointsRecord = {
  hikePlanId: string;
  points: GpsTrackPointDto[];
  summary: GpsTrackSummary;
  updatedAt: string;
};

type SyncBatch = {
  id: string;
  hikePlanId: string;
  points: GpsTrackPointDto[];
  createdAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(POINTS)) {
          db.createObjectStore(POINTS, { keyPath: 'hikePlanId' });
        }
        if (!db.objectStoreNames.contains(SYNC_QUEUE)) {
          db.createObjectStore(SYNC_QUEUE, { keyPath: 'id' });
        }
      };
    });
  }
  return dbPromise;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const req = fn(transaction.objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export const hikePlanGpsStore = {
  async getPoints(hikePlanId: string): Promise<GpsTrackPointDto[]> {
    const row = await tx<PointsRecord | undefined>(POINTS, 'readonly', (s) =>
      s.get(hikePlanId)
    );
    return row?.points ?? [];
  },

  async appendPoints(hikePlanId: string, incoming: GpsTrackPointDto[]): Promise<PointsRecord> {
    if (incoming.length === 0) {
      const row = await tx<PointsRecord | undefined>(POINTS, 'readonly', (s) =>
        s.get(hikePlanId)
      );
      return (
        row ?? {
          hikePlanId,
          points: [],
          summary: summarizeTrackPoints([]),
          updatedAt: new Date().toISOString(),
        }
      );
    }
    const existing = await this.getPoints(hikePlanId);
    const merged = [...existing, ...incoming];
    const deduped = merged.filter(
      (p, i, arr) =>
        arr.findIndex(
          (q) => q.recordedAt === p.recordedAt && q.lat === p.lat && q.lng === p.lng
        ) === i
    );
    const record: PointsRecord = {
      hikePlanId,
      points: deduped,
      summary: summarizeTrackPoints(deduped),
      updatedAt: new Date().toISOString(),
    };
    await tx(POINTS, 'readwrite', (s) => s.put(record));
    return record;
  },

  async getSummary(hikePlanId: string): Promise<GpsTrackSummary> {
    const row = await tx<PointsRecord | undefined>(POINTS, 'readonly', (s) =>
      s.get(hikePlanId)
    );
    return row?.summary ?? summarizeTrackPoints([]);
  },

  async enqueueSync(hikePlanId: string, points: GpsTrackPointDto[]): Promise<string> {
    const batch: SyncBatch = {
      id: crypto.randomUUID(),
      hikePlanId,
      points,
      createdAt: new Date().toISOString(),
    };
    await tx(SYNC_QUEUE, 'readwrite', (s) => s.put(batch));
    return batch.id;
  },

  async listPendingBatches(hikePlanId?: string): Promise<SyncBatch[]> {
    const all = await tx<SyncBatch[]>(SYNC_QUEUE, 'readonly', (s) => s.getAll());
    const list = all ?? [];
    return hikePlanId ? list.filter((b) => b.hikePlanId === hikePlanId) : list;
  },

  async removeBatch(batchId: string): Promise<void> {
    await tx(SYNC_QUEUE, 'readwrite', (s) => s.delete(batchId));
  },

  async replaceFromServer(hikePlanId: string, points: GpsTrackPointDto[]): Promise<void> {
    const record: PointsRecord = {
      hikePlanId,
      points,
      summary: summarizeTrackPoints(points),
      updatedAt: new Date().toISOString(),
    };
    await tx(POINTS, 'readwrite', (s) => s.put(record));
  },
};
