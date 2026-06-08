import type { EntryPoint } from '@/api/agent';

/** 右侧智能体对话：按行程/入口分桶，localStorage 轻量持久化 */

export const AGENT_CHAT_HISTORY = {
  STORAGE_KEY: 'agent-chat-history-v1',
  MAX_MESSAGES: 20,
  TTL_MS: 7 * 24 * 60 * 60 * 1000,
  MAX_BUCKETS: 12,
} as const;

export type AgentChatPersistedMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: string;
  [key: string]: unknown;
};

type HistoryBucket = {
  updatedAt: number;
  messages: AgentChatPersistedMessage[];
};

type HistoryStore = Record<string, HistoryBucket>;

export function buildAgentChatStorageKey(
  tripId: string | null | undefined,
  entryPoint?: EntryPoint
): string {
  const tid = tripId?.trim();
  if (tid) return `trip:${tid}`;
  if (entryPoint) return `entry:${entryPoint}`;
  return 'anon';
}

function readStore(): HistoryStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(AGENT_CHAT_HISTORY.STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HistoryStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: HistoryStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AGENT_CHAT_HISTORY.STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota or private mode */
  }
}

function pruneStore(store: HistoryStore): HistoryStore {
  const now = Date.now();
  const fresh = Object.entries(store).filter(
    ([, bucket]) =>
      now - bucket.updatedAt < AGENT_CHAT_HISTORY.TTL_MS && Array.isArray(bucket.messages)
  );
  if (fresh.length <= AGENT_CHAT_HISTORY.MAX_BUCKETS) {
    return Object.fromEntries(fresh);
  }
  fresh.sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  return Object.fromEntries(fresh.slice(0, AGENT_CHAT_HISTORY.MAX_BUCKETS));
}

export function serializeAgentChatMessages<T extends { timestamp: Date; status?: string }>(
  messages: T[]
): AgentChatPersistedMessage[] {
  return messages
    .filter((m) => m.status !== 'thinking')
    .slice(-AGENT_CHAT_HISTORY.MAX_MESSAGES)
    .map((m) => {
      const { timestamp, ...rest } = m as T & Record<string, unknown>;
      return {
        ...(rest as Record<string, unknown>),
        timestamp: timestamp.toISOString(),
      } as AgentChatPersistedMessage;
    });
}

export function loadAgentChatHistory(storageKey: string): AgentChatPersistedMessage[] | null {
  const store = pruneStore(readStore());
  const bucket = store[storageKey];
  if (!bucket?.messages?.length) return null;
  if (Date.now() - bucket.updatedAt > AGENT_CHAT_HISTORY.TTL_MS) {
    delete store[storageKey];
    writeStore(store);
    return null;
  }
  return bucket.messages;
}

export function saveAgentChatHistory(
  storageKey: string,
  messages: AgentChatPersistedMessage[]
): void {
  if (!messages.length) {
    clearAgentChatHistory(storageKey);
    return;
  }
  const store = pruneStore(readStore());
  store[storageKey] = {
    updatedAt: Date.now(),
    messages: messages.slice(-AGENT_CHAT_HISTORY.MAX_MESSAGES),
  };
  writeStore(pruneStore(store));
}

export function clearAgentChatHistory(storageKey: string): void {
  const store = readStore();
  if (!store[storageKey]) return;
  delete store[storageKey];
  writeStore(store);
}
