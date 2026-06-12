/**
 * route_and_run 最终答复的展示用清洗。
 * - 气泡正文优先 `result.answer_html`
 * - `answer_text` 保留给 RAG 解析、截断摘要、改排兜底等逻辑
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

type RouteRunAnswerFields = {
  answer_text?: string | null;
  answer_html?: string | null;
  answerHtml?: string | null;
};

/** 气泡展示用 HTML（优先 answer_html） */
export function extractRouteRunAnswerHtml(result: RouteRunAnswerFields | undefined | null): string {
  if (!result) return '';
  const raw = result.answer_html ?? result.answerHtml;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : '';
}

/** 逻辑/解析用纯文本（优先 answer_text，无则从 HTML 剥离） */
export function extractRouteRunAnswerText(result: RouteRunAnswerFields | undefined | null): string {
  if (!result) return '';
  if (result.answer_text != null) return String(result.answer_text);
  const html = extractRouteRunAnswerHtml(result);
  return html ? stripHtmlToPlainText(html) : '';
}

export function stripHtmlToPlainText(html: string): string {
  if (!html?.trim()) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function stripUnsafeHtmlMarkup(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/** 展示前清洗 HTML：移除装配块与不安全标签 */
export function sanitizeRouteRunAnswerHtmlForDisplay(html: string): string {
  if (html == null || typeof html !== 'string') return '';
  let s = stripUnsafeHtmlMarkup(html)
    .replace(RE_CONSULTATION_UI_BLOCK, '')
    .replace(RE_SUGGESTED_OPS_BLOCK, '');
  return s.trim();
}

const HTML_TAG_RE =
  /<\/?(?:p|div|ul|ol|li|h[1-6]|table|thead|tbody|tr|th|td|br|strong|em|b|i|span|a|pre|code|blockquote|hr)\b[^>]*>/i;

/** 是否为可安全 innerHTML 的 HTML（非 Markdown 误写入 answer_html） */
export function looksLikeAnswerHtml(html: string): boolean {
  const t = html.trim();
  if (!t) return false;
  return HTML_TAG_RE.test(t);
}

/**
 * 拆分 route_and_run 答复：真 HTML → contentHtml；Markdown（含误写入 answer_html）→ content 走 Markdown 渲染。
 */
export function partitionRouteRunAnswerForMessage(
  result: RouteRunAnswerFields | undefined | null,
  options?: { skipHtml?: boolean }
): { content: string; contentHtml?: string } {
  let content = extractRouteRunAnswerText(result);
  if (options?.skipHtml) {
    return { content: sanitizeRouteRunAnswerTextForDisplay(content) };
  }

  const answerHtmlRaw = extractRouteRunAnswerHtml(result);
  let contentHtml: string | undefined;
  if (answerHtmlRaw) {
    const sanitizedHtml = sanitizeRouteRunAnswerHtmlForDisplay(answerHtmlRaw);
    if (looksLikeAnswerHtml(sanitizedHtml)) {
      contentHtml = sanitizedHtml;
    } else if (sanitizedHtml) {
      // 后端将 Markdown 写入 answer_html：回落 Markdown 通道
      content = sanitizedHtml;
    }
  }

  return {
    content: content ? sanitizeRouteRunAnswerTextForDisplay(content) : '',
    ...(contentHtml ? { contentHtml } : {}),
  };
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (v != null && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return undefined;
}

function pickRenderableAnswerHtml(raw: string | undefined | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const sanitized = sanitizeRouteRunAnswerHtmlForDisplay(raw.trim());
  return looksLikeAnswerHtml(sanitized) ? sanitized : undefined;
}

function extractClarificationDisplayBodyHtml(
  payload: Record<string, unknown> | undefined | null
): string | undefined {
  const display = asRecord(payload?.clarification_display ?? payload?.clarificationDisplay);
  const raw = display?.body_html ?? display?.bodyHtml;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

type AgentBubbleUiState = {
  current_step_detail?: string;
  current_step_detail_html?: string;
  currentStepDetail?: string;
  currentStepDetailHtml?: string;
};

/**
 * 智能体气泡正文：clarification_display.body_html → answer_html → ui_state.current_step_detail_html；
 * 短文案回落 ui_state.current_step_detail / answer_text。
 */
export function resolveAgentBubbleBodies(options: {
  result?: RouteRunAnswerFields | null;
  payload?: Record<string, unknown> | null;
  uiState?: AgentBubbleUiState | null;
  skipHtml?: boolean;
  /** true：气泡仅用 result 短 answer_html/text，不读 clarification_display 长文 */
  suppressClarificationProse?: boolean;
}): { content: string; contentHtml?: string } {
  const partitioned = partitionRouteRunAnswerForMessage(options.result, {
    skipHtml: options.skipHtml,
  });

  const shortDetail =
    (typeof options.uiState?.current_step_detail === 'string'
      ? options.uiState.current_step_detail.trim()
      : '') ||
    (typeof options.uiState?.currentStepDetail === 'string'
      ? options.uiState.currentStepDetail.trim()
      : '');

  if (options.suppressClarificationProse) {
    let content = partitioned.content;
    const contentHtml = partitioned.contentHtml;
    if (!content.trim() && shortDetail) {
      content = shortDetail;
    }
    return {
      content: content ? sanitizeRouteRunAnswerTextForDisplay(content) : '',
      ...(contentHtml ? { contentHtml } : {}),
    };
  }

  const clarificationBodyHtml = extractClarificationDisplayBodyHtml(options.payload);
  const uiHtmlRaw = options.uiState?.current_step_detail_html ?? options.uiState?.currentStepDetailHtml;

  const contentHtml =
    pickRenderableAnswerHtml(clarificationBodyHtml) ??
    partitioned.contentHtml ??
    pickRenderableAnswerHtml(typeof uiHtmlRaw === 'string' ? uiHtmlRaw : undefined);

  let content = partitioned.content;

  if (!contentHtml && clarificationBodyHtml) {
    content = content || sanitizeRouteRunAnswerTextForDisplay(clarificationBodyHtml);
  }
  if (!content.trim() && shortDetail) {
    content = shortDetail;
  }

  return {
    content: content ? sanitizeRouteRunAnswerTextForDisplay(content) : '',
    ...(contentHtml ? { contentHtml } : {}),
  };
}
