/**
 * 澄清问题相关的工具函数
 */

import type { ClarificationQuestion, ClarificationAnswer } from '@/types/clarification';

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
      answerText = answer.value.join('、');
    } else {
      answerText = String(answer.value);
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
