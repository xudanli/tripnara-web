/**
 * 澄清问题相关的工具函数
 */

import type { StructuredTravelInput } from '@/api/agent';
import type {
  ClarificationAnswer,
  ClarificationOptionItem,
  ClarificationQuestion,
} from '@/types/clarification';
import { labelForClarificationValue } from '@/lib/clarification-options';
import type { NLClarificationQuestion } from '@/types/trip';
import { normalizeClarificationQuestion } from '@/utils/nl-conversation-adapter';

/** 归一为 YYYY-MM-DD（用于 structured_travel_input） */
export function toDateOnlyIso(raw: string | undefined | null): string | undefined {
  if (raw == null || typeof raw !== 'string') return undefined;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * 澄清答案 → structured_travel_input（至少含 start_date 才返回，表示「已选日期」）
 */
export function buildStructuredTravelInputFromClarificationQuestions(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswer[]
): StructuredTravelInput | undefined {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const dateValues: string[] = [];
  let destination: string | undefined;

  for (const q of questions) {
    const a = byId.get(q.id);
    if (!a || a.value == null) continue;
    const qtext = q.question ?? '';

    if (q.type === 'date' && typeof a.value === 'string') {
      const iso = toDateOnlyIso(a.value);
      if (iso) dateValues.push(iso);
      continue;
    }

    if (q.type === 'text' && typeof a.value === 'string') {
      const v = a.value.trim();
      if (!v) continue;
      const maybeDate = toDateOnlyIso(v);
      if (maybeDate && /日期|出发|返程|出行/.test(qtext)) {
        dateValues.push(maybeDate);
        continue;
      }
      if (/目的地|去哪|城市|国家|地点|行程去哪/.test(qtext)) {
        destination = v;
      }
      continue;
    }

    if (q.type === 'multi_choice') {
      const vals = Array.isArray(a.value)
        ? a.value
        : typeof a.value === 'string'
          ? [a.value]
          : [];
      const v = vals.map(String).join('、').trim();
      if (!v) continue;
      if (/目的地|去哪|城市|国家|地点/.test(qtext)) destination = v;
      continue;
    }

    if (q.type === 'single_choice' && typeof a.value === 'string') {
      const v = a.value.trim();
      if (!v) continue;
      if (/目的地|去哪|城市|国家|地点/.test(qtext)) destination = v;
    }
  }

  if (dateValues.length === 0) return undefined;

  const out: StructuredTravelInput = {
    start_date: dateValues[0],
    ...(dateValues[1] ? { end_date: dateValues[1] } : {}),
    ...(destination ? { destination } : {}),
  };
  return out;
}

/** 合并行程摘要与澄清结构化字段；澄清优先。仅当存在 start_date 时返回（已选日期场景）。 */
export function mergeStructuredTravelInputs(
  base: StructuredTravelInput | undefined,
  override: StructuredTravelInput | undefined
): StructuredTravelInput | undefined {
  const destRaw = override?.destination ?? base?.destination;
  const sdRaw = override?.start_date ?? base?.start_date;
  const edRaw = override?.end_date ?? base?.end_date;

  const destination =
    destRaw != null && String(destRaw).trim() ? String(destRaw).trim() : undefined;
  const start_date = sdRaw ? toDateOnlyIso(String(sdRaw)) : undefined;
  const end_date = edRaw ? toDateOnlyIso(String(edRaw)) : undefined;

  if (!start_date) return undefined;

  const out: StructuredTravelInput = { start_date };
  if (end_date) out.end_date = end_date;
  if (destination) out.destination = destination;
  return out;
}

/** NL 对话结构 → Phase1 澄清卡片（ClarificationQuestionCard） */
export function nlQuestionToPhase1Clarification(q: NLClarificationQuestion): ClarificationQuestion {
  let type: ClarificationQuestion['type'] = 'text';
  if (q.inputType === 'single_choice' || q.inputType === 'boolean') type = 'single_choice';
  else if (q.inputType === 'multiple_choice') type = 'multi_choice';
  else if (q.inputType === 'number') type = 'number';
  else if (q.inputType === 'date') type = 'date';
  else type = 'text';

  const options = q.options
    ?.map((o) => (typeof o === 'string' ? o : String(o.label ?? o.value ?? '')))
    .filter(Boolean);

  return {
    id: q.id,
    question: q.text,
    type,
    options: options && options.length > 0 ? options : undefined,
    required: q.required !== false,
    placeholder: q.placeholder,
    hint: q.hint,
    default: q.default,
  };
}

/**
 * route_and_run / Agent：`payload.clarificationQuestions` 可能是 Phase1 或 NL 形态，统一为 ClarificationQuestion[]
 */
export function normalizeRouteRunClarificationQuestions(raw: unknown): ClarificationQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((item: unknown, idx: number): ClarificationQuestion | null => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;

      const qText =
        (typeof o.question === 'string' && o.question.trim()) ||
        (typeof o.text === 'string' && o.text.trim()) ||
        '';
      const phaseType = o.type;
      if (
        qText &&
        typeof phaseType === 'string' &&
        ['text', 'single_choice', 'multi_choice', 'date', 'number'].includes(phaseType)
      ) {
        const optsRaw = o.options;
        const optionItems: ClarificationOptionItem[] = [];
        const optionLabels: string[] = [];
        if (Array.isArray(optsRaw)) {
          for (const opt of optsRaw) {
            if (typeof opt === 'string' && opt.trim()) {
              optionItems.push({ value: opt.trim(), label: opt.trim() });
              optionLabels.push(opt.trim());
            } else if (opt && typeof opt === 'object') {
              const rec = opt as { label?: string; value?: string };
              const value = String(rec.value ?? rec.label ?? '').trim();
              const label = String(rec.label ?? rec.value ?? '').trim();
              if (value) {
                optionItems.push({ value, label: label || value });
                optionLabels.push(label || value);
              }
            }
          }
        }

        const metadata =
          o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
            ? (o.metadata as Record<string, unknown>)
            : undefined;

        const questionHtml =
          (typeof o.question_html === 'string' && o.question_html.trim()) ||
          (typeof o.questionHtml === 'string' && o.questionHtml.trim()) ||
          undefined;

        return {
          id: String(o.id ?? `clarify-${idx}`),
          question: qText,
          ...(questionHtml ? { question_html: questionHtml } : {}),
          type: phaseType as ClarificationQuestion['type'],
          options: optionLabels.length ? optionLabels : undefined,
          optionItems: optionItems.length ? optionItems : undefined,
          required: o.required !== false,
          placeholder: typeof o.placeholder === 'string' ? o.placeholder : undefined,
          hint: typeof o.hint === 'string' ? o.hint : undefined,
          default: o.default as ClarificationQuestion['default'],
          validation: o.validation as ClarificationQuestion['validation'],
          metadata,
        };
      }

      try {
        const nl = normalizeClarificationQuestion(item);
        const phase = nlQuestionToPhase1Clarification(nl);
        if (!phase.id?.trim()) phase.id = `clarify-${idx}`;
        return phase;
      } catch {
        return null;
      }
    })
    .filter((q): q is ClarificationQuestion => q != null && q.question.length > 0);
}

/**
 * 格式化澄清问题回答为文本（用于 conversation_context）
 */
export function formatClarificationAnswers(
  questions: ClarificationQuestion[],
  answers: ClarificationAnswer[]
): string {
  const answerTexts: string[] = [];

  answers.forEach((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) return;

    let answerText = '';
    if (question.type === 'multi_choice' && Array.isArray(answer.value)) {
      answerText = answer.value
        .map((v) => labelForClarificationValue(question, String(v)))
        .join('、');
    } else {
      answerText = labelForClarificationValue(question, String(answer.value ?? ''));
    }

    answerTexts.push(`${question.question}：${answerText}`);
  });

  return answerTexts.join('\n');
}

/**
 * 解析 clarificationMessage（向后兼容）为 ClarificationQuestion
 * 如果后端返回简单的字符串（Markdown 格式），解析为文本类型问题
 */
export function parseClarificationMessage(
  clarificationMessage: string
): ClarificationQuestion {
  return {
    id: 'fallback-1',
    question: clarificationMessage,
    type: 'text',
    required: true,
    placeholder: '请输入您的回答...',
  };
}
