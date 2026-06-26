import { journeyAssistantApi } from '@/api/assistant';
import { WISH_CATEGORY_LABELS, importanceLevel } from '@/lib/wishlist-model';
import type { WishCategory } from '@/types/trip-wishes';

const WISH_CATEGORY_VALUES = Object.keys(WISH_CATEGORY_LABELS) as WishCategory[];

export interface WishAgentOptimizeResult {
  text: string;
  category: WishCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  /** 仅优化了文案，分类/权重沿用推断失败时的兜底 */
  partial?: boolean;
}

function buildOptimizePrompt(rawText: string): string {
  const categoryList = WISH_CATEGORY_VALUES.map(
    (v) => `${v}（${WISH_CATEGORY_LABELS[v]}）`,
  ).join('、');

  return [
    '你是 TripNARA 心愿单助手。用户在规划行程，请把下面这句口语化偏好改写为清晰、可执行的心愿表述。',
    '只输出 JSON，不要 markdown 代码块，不要解释。',
    '格式：{"text":"...","category":"activities","importance":3}',
    `category 必须是以下 value 之一：${WISH_CATEGORY_VALUES.join(' | ')}`,
    `可选分类说明：${categoryList}`,
    'importance 为 1-5 整数，表示用户在意程度。',
    'text 不超过 200 字，保留用户原意，不要添加用户未表达的需求。',
    '',
    `用户原文：${rawText.trim()}`,
  ].join('\n');
}

function isWishCategory(value: unknown): value is WishCategory {
  return typeof value === 'string' && WISH_CATEGORY_VALUES.includes(value as WishCategory);
}

export function parseWishAgentOptimizePayload(raw: string): WishAgentOptimizeResult | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());
  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace?.[0]) candidates.unshift(brace[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        text?: unknown;
        category?: unknown;
        importance?: unknown;
      };
      const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
      if (!text) continue;
      const category = isWishCategory(parsed.category) ? parsed.category : 'activities';
      const importance = importanceLevel(
        typeof parsed.importance === 'number'
          ? parsed.importance
          : Number(parsed.importance) || 3,
      );
      return { text, category, importance };
    } catch {
      /* try next */
    }
  }

  return null;
}

function extractAssistantText(response: {
  message?: string;
  messageCN?: string;
  sections?: Array<{ content?: string; contentCN?: string }>;
}): string {
  if (response.messageCN?.trim()) return response.messageCN.trim();
  if (response.message?.trim()) return response.message.trim();
  const section = response.sections?.find((s) => s.contentCN || s.content);
  return section?.contentCN?.trim() || section?.content?.trim() || '';
}

export async function optimizeWishWithJourneyAgent(params: {
  tripId: string;
  userId: string;
  rawText: string;
  fallbackCategory?: WishCategory;
}): Promise<WishAgentOptimizeResult> {
  const { tripId, userId, rawText, fallbackCategory = 'activities' } = params;
  const response = await journeyAssistantApi.chat({
    tripId,
    userId,
    message: buildOptimizePrompt(rawText),
    language: 'zh',
  });

  const assistantText = extractAssistantText(response);
  if (!assistantText) {
    throw new Error('AI 未返回可用内容');
  }

  const parsed = parseWishAgentOptimizePayload(assistantText);
  if (parsed) return parsed;

  return {
    text: assistantText.replace(/^["'「]|["'」]$/g, '').trim(),
    category: fallbackCategory,
    importance: 3,
    partial: true,
  };
}
