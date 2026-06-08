import type { TrailOfflinePackRecord } from '@/types/trail-offline';
import { trailOfflineTileStore } from '@/services/trail-offline-tile-store';

const DB_NAME = 'tripnara-trail-offline';
const STORE_NAME = 'packs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('当前环境不支持 IndexedDB'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error('无法打开离线数据库'));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'routeDirectionId' });
        }
      };
    });
  }
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return getDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error('离线存储操作失败'));
        tx.onerror = () => reject(tx.error ?? new Error('离线事务失败'));
      })
  );
}

export const trailOfflineStore = {
  async save(pack: TrailOfflinePackRecord): Promise<void> {
    await withStore('readwrite', (store) => store.put(pack));
  },

  async get(routeDirectionId: number): Promise<TrailOfflinePackRecord | null> {
    const result = await withStore<TrailOfflinePackRecord | undefined>('readonly', (store) =>
      store.get(routeDirectionId)
    );
    return result ?? null;
  },

  async delete(routeDirectionId: number): Promise<void> {
    const pack = await this.get(routeDirectionId);
    const packKey = pack?.tileCache?.packKey ?? pack?.tileManifest?.packKey;
    if (packKey) {
      await trailOfflineTileStore.deletePack(packKey);
    }
    await withStore('readwrite', (store) => store.delete(routeDirectionId));
  },

  async list(): Promise<TrailOfflinePackRecord[]> {
    const all = await withStore<TrailOfflinePackRecord[]>('readonly', (store) => store.getAll());
    return (all ?? []).sort(
      (a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
    );
  },

  async has(routeDirectionId: number): Promise<boolean> {
    const pack = await this.get(routeDirectionId);
    return pack != null;
  },

  async count(): Promise<number> {
    const list = await this.list();
    return list.length;
  },
};
