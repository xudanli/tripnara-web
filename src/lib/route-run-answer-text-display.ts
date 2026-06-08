/**
 * route_and_run 最终 `result.answer_text` 的展示用清洗。
 * 与装配器同思路：去掉尚未从正文剥离的 UI 块标记，避免气泡泄漏整坨 JSON。
 * 仅用于 UI 副本；调试请用原始 `answer_text`。
 */

/** <<<CONSULTATION_UI_JSON>>> ... <<<END_CONSULTATION_UI_JSON>>> */
const RE_CONSULTATION_UI_BLOCK =
  /<<<CONSULTATION_UI_JSON>>>[\s\S]*?<<<END_CONSULTATION_UI_JSON>>>/gi;

/** <<<SUGGESTED_OPS_JSON>>> ... <<<END_SUGGESTED_OPS_JSON>>> */
const RE_SUGGESTED_OPS_BLOCK =
  /<<<SUGGESTED_OPS_JSON>>>[\s\S]*?<<<END_SUGGESTED_OPS_JSON>>>/gi;

/**
 * 展示前清洗：移除装配块；压缩多余空行。
 * 对 TIMEOUT/FAILED 等占位短串原样返回（由调用方跳过亦可）。
 */
export function sanitizeRouteRunAnswerTextForDisplay(text: string): string {
  if (text == null || typeof text !== 'string') return '';
  let s = text
    .replace(RE_CONSULTATION_UI_BLOCK, '')
    .replace(RE_SUGGESTED_OPS_BLOCK, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
