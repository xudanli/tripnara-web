/**
 * route_and_run：`conversation_context.locale`
 * - 英文 UI（语言标签以 `en` 开头）传 `en` 或 `en-US`，后端返回英文问卷与英文引导
 * - 中文及其他语言不传 `locale`，后端默认中文矩阵
 */
export function localeForAgentConversationContext(language: string | undefined): string | undefined {
  const raw = (language ?? '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (!lower.startsWith('en')) return undefined;
  if (lower === 'en-us' || lower.startsWith('en-us')) return 'en-US';
  return 'en';
}
