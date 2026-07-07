import type { IntercomMessage } from '@/lib/team-intercom.util';

const DB_NAME = 'tripnara-intercom';
const DB_VERSION = 2;
const STORE_MESSAGES = 'messages';
const STORE_OUTBOX = 'outbox';
const STORE_META = 'meta';

interface MessageRecord {
  tripId: string;
  messages: IntercomMessage[];
  updatedAt: string;
}

interface OutboxRecord {
  id: string;
  tripId: string;
  message: IntercomMessage;
  createdAt: string;
  attempts: number;
}

export interface CommsTripMeta {
  tripId: string;
  nextClientSeq: number;
  lastKnownServerSeq: number;
}

const DEFAULT_META: Omit<CommsTripMeta, 'tripId'> = {
  nextClientSeq: 1,
  lastKnownServerSeq: 0,
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        db.createObjectStore(STORE_MESSAGES, { keyPath: 'tripId' });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outbox = db.createObjectStore(STORE_OUTBOX, { keyPath: 'id' });
        outbox.createIndex('tripId', 'tripId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'tripId' });
      }
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(run(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          resolve(result);
        }
      })
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

function sessionStorageKey(tripId: string): string {
  return `execute-team-intercom:${tripId}`;
}

/** 首次打开时把 sessionStorage 历史迁移进 IndexedDB */
export async function migrateSessionStorageToIdb(tripId: string): Promise<void> {
  if (typeof sessionStorage === 'undefined') return;
  const raw = sessionStorage.getItem(sessionStorageKey(tripId));
  if (!raw) return;

  const existing = await loadIntercomMessagesAsync(tripId);
  if (existing.length > 0) return;

  try {
    const parsed = JSON.parse(raw) as IntercomMessage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      await saveIntercomMessagesAsync(tripId, parsed);
    }
  } catch {
    // ignore corrupt legacy data
  }
}

export async function loadIntercomMessagesAsync(tripId: string): Promise<IntercomMessage[]> {
  if (typeof indexedDB === 'undefined') {
    return loadIntercomMessagesFallback(tripId);
  }

  await migrateSessionStorageToIdb(tripId);

  const record = await withStore<MessageRecord | undefined>(STORE_MESSAGES, 'readonly', (store) =>
    store.get(tripId),
  );
  return record?.messages ?? [];
}

export async function saveIntercomMessagesAsync(
  tripId: string,
  messages: IntercomMessage[],
): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    saveIntercomMessagesFallback(tripId, messages);
    return;
  }

  const record: MessageRecord = {
    tripId,
    messages,
    updatedAt: new Date().toISOString(),
  };
  await withStore(STORE_MESSAGES, 'readwrite', (store) => store.put(record));
}

export async function getCommsTripMeta(tripId: string): Promise<CommsTripMeta> {
  if (typeof indexedDB === 'undefined') {
    return { tripId, ...DEFAULT_META };
  }

  const record = await withStore<CommsTripMeta | undefined>(STORE_META, 'readonly', (store) =>
    store.get(tripId),
  );
  return record ?? { tripId, ...DEFAULT_META };
}

export async function updateCommsTripMeta(
  tripId: string,
  patch: Partial<Pick<CommsTripMeta, 'nextClientSeq' | 'lastKnownServerSeq'>>,
): Promise<CommsTripMeta> {
  if (typeof indexedDB === 'undefined') {
    return { tripId, ...DEFAULT_META, ...patch };
  }

  const current = await getCommsTripMeta(tripId);
  const next: CommsTripMeta = { ...current, ...patch };
  await withStore(STORE_META, 'readwrite', (store) => store.put(next));
  return next;
}

/** 分配单调递增 clientSeq（同 trip 内） */
export async function allocateClientSeq(tripId: string): Promise<number> {
  const meta = await getCommsTripMeta(tripId);
  const seq = meta.nextClientSeq;
  await updateCommsTripMeta(tripId, { nextClientSeq: seq + 1 });
  return seq;
}

export async function enqueueOutboxMessage(tripId: string, message: IntercomMessage): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  const outboxId = message.clientId ?? message.id;
  const record: OutboxRecord = {
    id: outboxId,
    tripId,
    message: { ...message, clientId: outboxId },
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await withStore(STORE_OUTBOX, 'readwrite', (store) => store.put(record));
}

export async function listOutboxMessages(tripId: string): Promise<IntercomMessage[]> {
  if (typeof indexedDB === 'undefined') return [];

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, 'readonly');
    const store = tx.objectStore(STORE_OUTBOX);
    const index = store.index('tripId');
    const request = index.getAll(tripId);
    request.onsuccess = () => {
      const rows = (request.result as OutboxRecord[]) ?? [];
      resolve(rows.map((r) => r.message));
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeOutboxMessage(messageId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await withStore(STORE_OUTBOX, 'readwrite', (store) => store.delete(messageId));
}

function loadIntercomMessagesFallback(tripId: string): IntercomMessage[] {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntercomMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIntercomMessagesFallback(tripId: string, messages: IntercomMessage[]): void {
  try {
    sessionStorage.setItem(sessionStorageKey(tripId), JSON.stringify(messages));
  } catch {
    // ignore
  }
}
