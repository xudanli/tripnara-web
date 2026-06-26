import type { FitAssessmentAnswer, FitQuestionDefinition } from '@/types/project-fit';
import { DEFAULT_FIT_QUESTIONS } from '@/types/project-fit';

function readString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

const INPUT_TYPES = new Set<FitQuestionDefinition['inputType']>([
  'boolean',
  'number',
  'scale',
  'currency',
]);

function normalizeInputType(raw: unknown): FitQuestionDefinition['inputType'] {
  const t = readString(raw)?.toLowerCase();
  if (t === 'currency_cents') return 'currency';
  if (t && INPUT_TYPES.has(t as FitQuestionDefinition['inputType'])) {
    return t as FitQuestionDefinition['inputType'];
  }
  if (t === 'bool') return 'boolean';
  return 'boolean';
}

/** GET fit-questionnaire → FitQuestionDefinition[] */
export function normalizeFitQuestionnaire(raw: unknown): FitQuestionDefinition[] {
  if (!raw || typeof raw !== 'object') return DEFAULT_FIT_QUESTIONS;

  const r = raw as Record<string, unknown>;
  const questionsRaw = r.questions ?? r.items;
  if (!Array.isArray(questionsRaw)) return DEFAULT_FIT_QUESTIONS;

  const normalized = questionsRaw
    .map((item): FitQuestionDefinition | null => {
      if (!item || typeof item !== 'object') return null;
      const q = item as Record<string, unknown>;
      const questionKey = readString(q.questionKey ?? q.key ?? q.id);
      if (!questionKey) return null;
      const label =
        readString(q.label ?? q.title ?? q.prompt) ?? questionKey;
      return {
        questionKey,
        label,
        description: readString(q.description ?? q.helpText) ?? undefined,
        inputType: normalizeInputType(q.inputType ?? q.answerType ?? q.type),
        sensitivityLevel:
          readString(q.sensitivityLevel)?.toUpperCase() as FitQuestionDefinition['sensitivityLevel'],
        scaleMin: typeof q.scaleMin === 'number' ? q.scaleMin : undefined,
        scaleMax: typeof q.scaleMax === 'number' ? q.scaleMax : undefined,
        required: q.required === true || q.required === 'true',
      };
    })
    .filter((q): q is FitQuestionDefinition => q != null);

  return normalized.length ? normalized : DEFAULT_FIT_QUESTIONS;
}

export function validateRequiredFitAnswers(
  questions: FitQuestionDefinition[],
  answers: FitAssessmentAnswer[]
): { valid: boolean; missingLabels: string[] } {
  const answerMap = new Map(answers.map((a) => [a.questionKey, a.answer]));
  const missingLabels: string[] = [];

  for (const q of questions) {
    if (!q.required) continue;
    const value = answerMap.get(q.questionKey);
    if (value == null || value === '') {
      missingLabels.push(q.label);
    }
  }

  return { valid: missingLabels.length === 0, missingLabels };
}

export function formatReassessmentReasons(reasons?: {
  ruleStale?: boolean;
  timeExpired?: boolean;
}): string[] {
  const lines: string[] = [];
  if (reasons?.ruleStale) lines.push('项目准入规则已更新，需重新评估');
  if (reasons?.timeExpired) lines.push('上次评估已过期');
  return lines;
}
