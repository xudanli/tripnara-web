/**
 * 粗判正文是否像 Markdown（用于在 task_type 未命中时仍渲染表格/标题等）。
 */
export function looksLikeMarkdown(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (/^#{1,6}\s/m.test(t)) return true;
  if (/\n\|[^\n]*\|/.test(t) || /^\|[^\n]*\|/.test(t)) return true;
  if (/^>\s/m.test(t)) return true;
  if (/^(\s*[-*+]\s+\S)/m.test(t)) return true;
  if (/^(\s*\d+\.\s+\S)/m.test(t)) return true;
  if (/\*\*[^*\n]{2,}\*\*/.test(t)) return true;
  if (/```[\s\S]*```/.test(t)) return true;
  return false;
}
