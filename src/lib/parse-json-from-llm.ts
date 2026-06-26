/**
 * 解析 LLM 返回的 JSON（常带 ```json 代码块或前后说明文字）。
 */

export function extractJsonCandidatesFromLlmText(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const candidates: string[] = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());

  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace?.[0]) candidates.unshift(brace[0]);

  const bracket = trimmed.match(/\[[\s\S]*\]/);
  if (bracket?.[0]) candidates.unshift(bracket[0]);

  return candidates;
}

/** 从 LLM 文本中解析 JSON；全部候选失败时抛出最后一次 parse 错误 */
export function parseJsonFromLlmText<T = unknown>(raw: string): T {
  const candidates = extractJsonCandidatesFromLlmText(raw);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error('LLM 响应不是合法 JSON');
}

/** 后端 JSON.parse 失败且内容含 markdown fence 时的典型错误 */
export function isLlmMarkdownJsonParseError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /Unexpected token ['`]/.test(message) ||
    /is not valid JSON/i.test(message) ||
    message.includes('```json')
  );
}

export function mapLlmMarkdownJsonParseErrorUserMessage(): string {
  return '智能体返回了带代码块格式的 JSON，服务端解析失败。请重试；若仍失败需后端在 JSON.parse 前剥离 ```json 包裹。';
}
