import { PREMIUM_STRESS_QUESTIONS, type PremiumStressQuestion } from '../constants/premium-stress-test';
import type { PremiumStressQuestionsResponse } from '@/types/odyssey-intake';

const WALLPAPER_GRADIENT_BY_ORDER = PREMIUM_STRESS_QUESTIONS.map((q) => q.wallpaperGradient);

/** 将 API 题目与本地 fallback 合并（保留 API id，UI/计分用 fallback 的 tag 与 deltas） */
export function normalizePremiumStressQuestions(
  raw: PremiumStressQuestionsResponse | unknown
): PremiumStressQuestion[] {
  const questions = extractQuestionsArray(raw);
  if (!questions.length) {
    return [...PREMIUM_STRESS_QUESTIONS].sort((a, b) => a.order - b.order);
  }

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const fallbackSorted = [...PREMIUM_STRESS_QUESTIONS].sort((a, b) => a.order - b.order);

  return sorted.map((q, index) => {
    const fb =
      fallbackSorted.find((f) => f.id === q.id) ??
      fallbackSorted[index] ??
      fallbackSorted[fallbackSorted.length - 1];

    return {
      id: q.id,
      order: q.order,
      title: q.title || fb?.title || '',
      scenario: q.scenario || fb?.scenario || '',
      wallpaperGradient:
        q.wallpaperGradient ?? fb?.wallpaperGradient ?? WALLPAPER_GRADIENT_BY_ORDER[index] ?? 'from-slate-950 to-muted',
      options: (q.options?.length ? q.options : fb?.options ?? []).map((opt, optIndex) => {
        const fbOpt = fb?.options.find((o) => o.id === opt.id) ?? fb?.options[optIndex];
        return {
          id: opt.id === 'A' || opt.id === 'B' ? opt.id : (fbOpt?.id ?? 'A'),
          label: opt.label || fbOpt?.label || '',
          tag: opt.tag ?? fbOpt?.tag ?? '',
          deltas: fbOpt?.deltas ?? {},
        };
      }),
    };
  });
}

function extractQuestionsArray(raw: unknown): PremiumStressQuestionsResponse['questions'] {
  return extractPremiumStressQuestionsPayload(raw);
}

/** 兼容 data 为数组 / { questions } / { items } 等多种后端形态 */
export function extractPremiumStressQuestionsPayload(
  raw: unknown
): PremiumStressQuestionsResponse['questions'] {
  if (Array.isArray(raw)) {
    return raw as PremiumStressQuestionsResponse['questions'];
  }
  if (!raw || typeof raw !== 'object') return [];

  const record = raw as Record<string, unknown>;
  const candidates = [record.questions, record.items, record.data];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as PremiumStressQuestionsResponse['questions'];
    }
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>;
      if (Array.isArray(nested.questions)) {
        return nested.questions as PremiumStressQuestionsResponse['questions'];
      }
    }
  }

  return [];
}

export function premiumStressQuestionsToApiResponse(): PremiumStressQuestionsResponse {
  return {
    questions: PREMIUM_STRESS_QUESTIONS.map((q) => ({
      id: q.id,
      order: q.order,
      title: q.title,
      scenario: q.scenario,
      options: q.options.map((o) => ({ id: o.id, label: o.label, tag: o.tag })),
    })),
  };
}

/** 用提交时的 questionId 顺序 + fallback 模板重建计分用题目（API id 作 key） */
export function rebuildQuestionsForScoring(questionIds: string[]): PremiumStressQuestion[] {
  const fallbackSorted = [...PREMIUM_STRESS_QUESTIONS].sort((a, b) => a.order - b.order);
  return questionIds.map((id, index) => {
    const fb = fallbackSorted.find((f) => f.id === id) ?? fallbackSorted[index];
    if (!fb) {
      return {
        id,
        order: index + 1,
        title: '',
        scenario: '',
        wallpaperGradient: WALLPAPER_GRADIENT_BY_ORDER[index] ?? 'from-slate-950 to-muted',
        options: [],
      };
    }
    return { ...fb, id };
  });
}
