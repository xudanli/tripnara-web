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

/** 单选项：提交用 value，展示用 label */
export interface ClarificationOptionItem {
  value: string;
  label: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  /** 澄清卡正文 HTML（优先于 question 纯文本，避免与气泡 answer_html 重复） */
  question_html?: string;
  type: ClarificationQuestionType;
  /** 展示用文案（legacy）；有 optionItems 时以 optionItems 为准 */
  options?: string[];
  /** 结构化选项（guardian_debate 等须用 value 回传 clarification_answers） */
  optionItems?: ClarificationOptionItem[];
  required: boolean;
  placeholder?: string;
  hint?: string;
  default?: string | string[];
  validation?: ClarificationQuestionValidation;
  /** route_and_run：presentation / user_intent_feasibility 等 */
  metadata?: Record<string, unknown>;
}

export interface ClarificationAnswer {
  questionId: string;
  value: string | string[] | number | null;
}

