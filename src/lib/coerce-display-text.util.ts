/** 将后端/API 杂项值归一为可安全渲染的字符串 */
export function coerceDisplayText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(coerceDisplayText).filter(Boolean) as string[];
    return parts.length > 0 ? parts.join('；') : undefined;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested =
      coerceDisplayText(record.message) ||
      coerceDisplayText(record.messageCN) ||
      coerceDisplayText(record.description) ||
      coerceDisplayText(record.label) ||
      coerceDisplayText(record.text) ||
      coerceDisplayText(record.title);
    if (nested) return nested;
    if (typeof record.endpoint === 'string') {
      const endpoint = record.endpoint.trim();
      const bodyText = coerceDisplayText(record.body);
      if (endpoint && bodyText) return `${endpoint} · ${bodyText}`;
      if (endpoint) return endpoint;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
