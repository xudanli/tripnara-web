import { sessionsApi } from '@/api/planning-assistant-v2';

/** 与 `usePlanningSessionV2` 共用 */
export const PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY = 'planning-assistant-v2-session';

/**
 * 清除 Redis 侧会话状态（含 CLARIFYING_HOTEL_DATES 等 phase）并创建新 session。
 * 规划工作台「清空对话」须调用，仅清 localStorage 不够。
 */
export async function resetPlanningAssistantV2Session(userId?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const oldId = localStorage.getItem(PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY)?.trim();
  if (oldId) {
    try {
      await sessionsApi.delete(oldId);
    } catch (e) {
      console.warn('[resetPlanningAssistantV2Session] DELETE session failed', e);
    }
    localStorage.removeItem(PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY);
  }

  try {
    const created = await sessionsApi.create(userId ? { userId } : {});
    localStorage.setItem(PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY, created.sessionId);
    return created.sessionId;
  } catch (e) {
    console.warn('[resetPlanningAssistantV2Session] create session failed', e);
    return null;
  }
}

/** 读取当前 v2 会话 ID（localStorage，同步） */
export function getPlanningAssistantV2SessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY)?.trim();
  if (!id || id === 'undefined') return null;
  return id;
}

function generateClientPlanningSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pa2-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function persistPlanningAssistantV2SessionId(sessionId: string): string {
  const trimmed = sessionId.trim();
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLANNING_ASSISTANT_V2_SESSION_STORAGE_KEY, trimmed);
  }
  return trimmed;
}

/** 获取或创建 v2 会话（不清 Redis，日常发 chat / route_and_run 用） */
export async function ensurePlanningAssistantV2Session(userId?: string): Promise<string> {
  const existing = getPlanningAssistantV2SessionId();
  if (existing) return existing;

  if (typeof window !== 'undefined') {
    try {
      const created = await sessionsApi.create(userId ? { userId } : {});
      return persistPlanningAssistantV2SessionId(created.sessionId);
    } catch (e) {
      console.warn('[ensurePlanningAssistantV2Session] create failed, using client UUID', e);
    }
  }

  const fallback = generateClientPlanningSessionId();
  return persistPlanningAssistantV2SessionId(fallback);
}
