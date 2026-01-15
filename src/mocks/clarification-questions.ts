import type { ClarificationQuestion } from '@/types/clarification';

export const mockClarificationQuestions: ClarificationQuestion[] = [
  {
    id: 'question-1',
    question: '请选择您的出行日期',
    type: 'date',
    required: true,
    hint: '建议选择 1 个月后的日期，以便提前预订',
    validation: {
      min: Date.now() + 24 * 60 * 60 * 1000, // tomorrow
      max: Date.now() + 365 * 24 * 60 * 60 * 1000 * 2, // 2 years
    },
  },
  {
    id: 'question-2',
    question: '同行人数',
    type: 'single_choice',
    required: true,
    options: ['1人', '2人', '3-4人', '5人以上'],
    hint: '这将影响住宿和交通安排',
  },
  {
    id: 'question-3',
    question: '您的主要兴趣（可多选）',
    type: 'multi_choice',
    required: false,
    options: ['极光', '冰川', '温泉', '文化', '美食', '户外运动'],
    hint: '帮助我们为您推荐合适的景点和活动',
    default: ['温泉', '美食'],
  },
  {
    id: 'question-4',
    question: '总预算（人民币）',
    type: 'number',
    required: true,
    placeholder: '例如：100000',
    hint: '包含机票、住宿、餐饮、活动等所有费用',
    validation: {
      min: 100,
      max: 1_000_000,
    },
  },
  {
    id: 'question-5',
    question: '其他需求或偏好（可选）',
    type: 'text',
    required: false,
    placeholder: '例如：希望体验当地文化、偏好安静的住宿环境等',
    hint: '任何其他需要特别说明的需求',
  },
];

