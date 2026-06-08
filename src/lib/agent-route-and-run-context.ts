import type { ConversationContext } from '@/api/agent';

/**
 * route_and_run 多轮对话上下文（`conversation_context`）
 *
 * - **recent_messages**：仅给后端作短窗摘要；每轮 append「用户/助手」行后随请求提交。
 * - **车型/酒店/航班等传感器与 intent 升格**：必须只解析「本轮用户原话」（`request.message`），
 *   禁止把 `recent_messages` 拼进 `looksLikeCarRentalSearchRequest` 等启发式。
 * - **长期偏好 / 行程事实**：依赖 `user_id` + `trip_id` + `context_type: active_trip_summary`
 *   触发服务端记忆层与行程注入，不靠聊天串替代。
 * - **NL 建行程**：走 trips `nl-conversation` + `NLConversationContext`，与 agent 会话模型分离。
 */

export const ROUTE_AND_RUN_RECENT_MESSAGES_MAX = 10;

const USER_LINE_MAX_CHARS = 800;
const ASSISTANT_LINE_MAX_CHARS = 400;

export type RecentMessageSource = {
  role: 'user' | 'assistant';
  content: string;
  status?: string;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** 助手气泡可能含判决书 Markdown / 长 timeline 摘要，写入 recent 时截断 */
export function summarizeAssistantContentForRecent(content: string): string {
  const flat = normalizeWhitespace(content);
  if (!flat) return '';
  if (flat.length <= ASSISTANT_LINE_MAX_CHARS) return flat;
  return `${flat.slice(0, ASSISTANT_LINE_MAX_CHARS - 1)}…`;
}

function summarizeUserContentForRecent(content: string): string {
  const flat = normalizeWhitespace(content);
  if (!flat) return '';
  if (flat.length <= USER_LINE_MAX_CHARS) return flat;
  return `${flat.slice(0, USER_LINE_MAX_CHARS - 1)}…`;
}

/** 连续相同 role+content 只保留一条，避免重复用户句浪费 token */
export function dedupeConsecutiveRecentMessages(
  messages: RecentMessageSource[]
): RecentMessageSource[] {
  const out: RecentMessageSource[] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.role === m.role &&
      normalizeWhitespace(prev.content) === normalizeWhitespace(m.content)
    ) {
      continue;
    }
    out.push(m);
  }
  return out;
}

export function formatRecentMessageLine(message: RecentMessageSource): string | null {
  if (message.status === 'thinking') return null;
  const raw = message.content?.trim() ?? '';
  if (!raw) return null;
  const body =
    message.role === 'user'
      ? summarizeUserContentForRecent(raw)
      : summarizeAssistantContentForRecent(raw);
  if (!body) return null;
  return message.role === 'user' ? `用户: ${body}` : `助手: ${body}`;
}

/**
 * 构建 `conversation_context.recent_messages`。
 * @param history 发送前已有消息（不含本轮 thinking）
 * @param currentUser 本轮用户消息（须在 history 之后 append，避免漏掉最新一句）
 */
export function buildRecentMessagesForRouteAndRun(
  history: RecentMessageSource[],
  currentUser?: RecentMessageSource | null
): string[] {
  let merged = dedupeConsecutiveRecentMessages(
    history.filter((m) => m.status !== 'thinking')
  );
  const currentTrimmed = currentUser?.content?.trim();
  if (currentTrimmed) {
    const last = merged[merged.length - 1];
    const isDup =
      last?.role === 'user' &&
      normalizeWhitespace(last.content) === normalizeWhitespace(currentTrimmed);
    if (!isDup) {
      merged = [...merged, { role: 'user', content: currentTrimmed }];
    }
  }
  merged = dedupeConsecutiveRecentMessages(merged);

  const lines: string[] = [];
  for (const m of merged) {
    const line = formatRecentMessageLine(m);
    if (line) lines.push(line);
  }
  return lines.slice(-ROUTE_AND_RUN_RECENT_MESSAGES_MAX);
}

export type BuildRouteAndRunConversationContextParams = {
  history: RecentMessageSource[];
  /** 本轮用户原话（与 `request.message` 对齐） */
  currentUserContent?: string;
  locale?: string;
  timezone?: string;
  /** 有绑定行程时传 `active_trip_summary`，配合 `trip_id` 触发服务端摘要/记忆 */
  contextType?: string;
};

export function buildRouteAndRunConversationContext(
  params: BuildRouteAndRunConversationContextParams
): ConversationContext {
  const recent_messages = buildRecentMessagesForRouteAndRun(
    params.history,
    params.currentUserContent?.trim()
      ? { role: 'user', content: params.currentUserContent.trim() }
      : null
  );

  return {
    ...(recent_messages.length > 0 ? { recent_messages } : {}),
    ...(params.locale ? { locale: params.locale } : {}),
    ...(params.timezone ? { timezone: params.timezone } : {}),
    ...(params.contextType?.trim() ? { context_type: params.contextType.trim() } : {}),
  };
}
