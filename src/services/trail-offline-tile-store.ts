import type { TileCoord } from '@/lib/offline-tile-math';

const DB_NAME = 'tripnara-trail-offline-tiles';
const STORE_NAME = 'tiles';
const DB_VERSION = 1;

export type CachedOfflineTile = {
  key: string;
  packKey: string;
  z: number;
  x: number;
  y: number;
  format: 'raster' | 'vector';
  contentType: string;
  data: ArrayBuffer;
  cachedAt: string;
};

function tileKey(packKey: string, z: number, x: number, y: number): string {
  return `${packKey}/${z}/${x}/${y}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('当前环境不支持 IndexedDB'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error ?? new Error('无法打开瓦片数据库'));
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('packKey', 'packKey', { unique: false });
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
        req.onerror = () => reject(req.error ?? new Error('瓦片存储操作失败'));
        tx.onerror = () => reject(tx.error ?? new Error('瓦片事务失败'));
      })
  );
}

export const trailOfflineTileStore = {
  async put(tile: CachedOfflineTile): Promise<void> {
    await withStore('readwrite', (store) => store.put(tile));
  },

  async get(
    packKey: string,
    coord: TileCoord
  ): Promise<CachedOfflineTile | null> {
    const key = tileKey(packKey, coord.z, coord.x, coord.y);
    const result = await withStore<CachedOfflineTile | undefined>('readonly', (store) =>
      store.get(key)
    );
    return result ?? null;
  },

  async countForPack(packKey: string): Promise<number> {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('packKey');
      const req = index.count(IDBKeyRange.only(packKey));
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => reject(req.error ?? new Error('统计瓦片失败'));
    });
  },

  async statsForPack(
    packKey: string
  ): Promise<{ tileCount: number; bytesCached: number }> {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('packKey');
      const req = index.openCursor(IDBKeyRange.only(packKey));
      let tileCount = 0;
      let bytesCached = 0;
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve({ tileCount, bytesCached });
          return;
        }
        const row = cursor.value as CachedOfflineTile;
        tileCount += 1;
        bytesCached += row.data?.byteLength ?? 0;
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error('读取瓦片统计失败'));
    });
  },

  async deletePack(packKey: string): Promise<void> {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('packKey');
      const req = index.openCursor(IDBKeyRange.only(packKey));
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      req.onerror = () => reject(req.error ?? new Error('删除瓦片失败'));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('删除瓦片事务失败'));
    });
  },
};
