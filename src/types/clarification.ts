/**
 * Structured clarification questions (Phase 1).
 *
 * Notes:
 * - For `date` questions, the user's answer is a `string` in ISO format: `YYYY-MM-DD`.
 * - For `validation.min/max` on `date`, use epoch milliseconds (number) for simple range checks.
 */

/**
 * Clarification question types supported by the frontend.
 */
export type ClarificationQuestionType =
  | 'text'
  | 'single_choice'
  | 'multi_choice'
  | 'date'
  | 'number';

export interface ClarificationQuestionValidation {
  /**
   * Min value:
   * - number: numeric min
   * - date: epoch milliseconds min (based on selected date converted to ms)
   */
  min?: number;
  /**
   * Max value:
   * - number: numeric max
   * - date: epoch milliseconds max
   */
  max?: number;
  /** Regex string for `text` */
  pattern?: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: ClarificationQuestionType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  hint?: string;
  default?: string | string[];
  validation?: ClarificationQuestionValidation;
}

export interface ClarificationAnswer {
  questionId: string;
  value: string | string[] | number | null;
}

