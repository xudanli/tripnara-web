/**
 * 自然语言对话适配器函数
 * 用于将后端返回的澄清问题格式转换为前端格式
 * 兼容新旧两种字段名（question/text, type/inputType）
 */

import type { NLClarificationQuestion, ConditionalInputField } from '@/types/trip';

/**
 * 适配器函数：将后端返回的澄清问题格式转换为前端格式
 * 兼容新旧两种字段名（question/text, type/inputType）
 * 透传 conditionalInputs，用于条件输入（日期选择、预算输入等）
 */
export function normalizeClarificationQuestion(
  q: any
): NLClarificationQuestion {
  // 字段名映射：question → text（向后兼容）
  const questionText = q.question || q.text || '';
  
  // 字段名映射：type → inputType（向后兼容）
  // 注意：后端可能返回 'multi_choice'，前端期望 'multiple_choice'
  let inputType = q.type || q.inputType || 'text';
  if (inputType === 'multi_choice') {
    inputType = 'multiple_choice';
  }
  
  const options = q.options || [];
  
  // 透传 conditionalInputs；若后端未提供，则根据选项语义注入 fallback
  let conditionalInputs: ConditionalInputField[] | undefined = q.conditionalInputs;
  if (!conditionalInputs?.length && Array.isArray(options)) {
    conditionalInputs = inferConditionalInputsFromOptions(options, q.metadata?.fieldName);
  }
  
  return {
    id: q.id,
    // 向后兼容：同时支持 question 和 text
    text: questionText,
    // 向后兼容：同时支持 type 和 inputType
    inputType: inputType as NLClarificationQuestion['inputType'],
    options,
    required: q.required !== undefined ? q.required : true,
    placeholder: q.placeholder,
    hint: q.hint,
    default: q.default,
    group: q.group,
    conditionalInputs,
    metadata: {
      category: q.metadata?.category,
      priority: q.metadata?.priority,
      // 🆕 新增字段
      isCritical: q.metadata?.isCritical,
      fieldName: q.metadata?.fieldName,
    },
  };
}

/**
 * 根据选项文本推断条件输入字段（后端未提供时使用）
 * 例如：「不准确,需要修改具体日期」→ date_range；「需要调整,我的总预算是____元」→ number
 */
function inferConditionalInputsFromOptions(
  options: any[],
  _fieldName?: string
): ConditionalInputField[] {
  const result: ConditionalInputField[] = [];
  
  for (const opt of options) {
    const s = (typeof opt === 'object' && opt !== null ? (opt.value ?? opt.label ?? '') : String(opt)).trim();
    if (!s) continue;
    // 日期相关：不准确/需要修改 + 日期
    if (/不准确|需要修改|修改.*日期/.test(s) && /日期|时间|天/.test(s)) {
      result.push({
        triggerValue: s,
        inputType: 'date_range',
        label: '请选择行程日期范围',
        required: true,
      });
    }
    // 预算相关：需要调整 + 预算/元
    if (/需要调整|不符合|调整/.test(s) && /预算|元|____/.test(s)) {
      result.push({
        triggerValue: s,
        inputType: 'number',
        label: '请输入总预算（元）',
        placeholder: '例如：15000',
        required: true,
        validation: { min: 1, max: 10000000 },
      });
    }
  }
  
  return result;
}

/**
 * 适配器函数：批量转换澄清问题
 */
export function normalizeClarificationQuestions(
  questions: any[]
): NLClarificationQuestion[] {
  if (!Array.isArray(questions)) {
    return [];
  }
  
  return questions
    .map(normalizeClarificationQuestion)
    .filter(q => q.text && q.text.trim().length > 0); // 过滤掉空问题
}

/**
 * 检查所有 Critical 字段是否已回答
 */
export function areAllCriticalFieldsAnswered(
  questions: NLClarificationQuestion[],
  answers: Record<string, string | string[] | number | boolean | null>
): boolean {
  const criticalQuestions = questions.filter(
    q => q.metadata?.isCritical === true
  );
  
  if (criticalQuestions.length === 0) {
    return true; // 没有 Critical 字段，视为已回答
  }
  
  return criticalQuestions.every(q => {
    const answer = answers[q.id];
    
    // 检查答案是否存在且非空
    if (answer === null || answer === undefined || answer === '') {
      return false;
    }
    
    // 对于多选类型，检查数组是否非空
    if (q.inputType === 'multiple_choice') {
      return Array.isArray(answer) && answer.length > 0;
    }
    
    return true;
  });
}

/**
 * 获取未回答的 Critical 字段列表
 */
export function getUnansweredCriticalFields(
  questions: NLClarificationQuestion[],
  answers: Record<string, string | string[] | number | boolean | null>
): NLClarificationQuestion[] {
  const criticalQuestions = questions.filter(
    q => q.metadata?.isCritical === true
  );
  
  return criticalQuestions.filter(q => {
    const answer = answers[q.id];
    
    // 检查答案是否存在且非空
    if (answer === null || answer === undefined || answer === '') {
      return true; // 未回答
    }
    
    // 对于多选类型，检查数组是否非空
    if (q.inputType === 'multiple_choice') {
      return !Array.isArray(answer) || answer.length === 0;
    }
    
    return false; // 已回答
  });
}

/**
 * 提取 Gate 预检查的替代方案
 * 
 * 注意：根据 API 文档，替代方案应该在后端响应中直接返回 `alternatives` 字段
 * 此函数用于从 `plannerResponseBlocks` 中提取替代方案（如果后端没有直接返回 alternatives）
 */
export function extractGateAlternatives(
  plannerResponseBlocks: any[]
): Array<{
  id: string;
  label: string;
  description: string;
  action?: string;
  actionParams?: Record<string, any>;
  buttonText?: string;
}> {
  if (!Array.isArray(plannerResponseBlocks)) {
    return [];
  }
  
  const alternatives: Array<{
    id: string;
    label: string;
    description: string;
    action?: string;
    actionParams?: Record<string, any>;
    buttonText?: string;
  }> = [];
  
  // 尝试从 list 类型的 block 中提取替代方案
  // 根据 API 文档，替代方案可能以 list 形式出现在 plannerResponseBlocks 中
  plannerResponseBlocks.forEach((block, index) => {
    if (block.type === 'list' && block.items && Array.isArray(block.items)) {
      // 假设 list 中的每个 item 是一个替代方案
      block.items.forEach((item: string, itemIndex: number) => {
        // 尝试解析替代方案文本（格式："选择中等风险活动：描述"）
        const parts = item.split('：');
        const label = parts[0]?.trim() || item;
        const description = parts[1]?.trim() || '';
        
        alternatives.push({
          id: `alt_${index}_${itemIndex}`,
          label,
          description,
          buttonText: '选择此方案',
        });
      });
    }
  });
  
  // 注意：根据 API 文档，后端应该直接返回 alternatives 数组
  // 此函数主要用于向后兼容或降级处理
  // 如果后端直接返回了 alternatives，应该直接使用，不需要调用此函数
  
  return alternatives;
}

/**
 * 检查是否有 Gate 预检查警告
 */
export function hasGateWarning(
  plannerResponseBlocks: any[]
): boolean {
  if (!Array.isArray(plannerResponseBlocks)) {
    return false;
  }
  
  return plannerResponseBlocks.some(
    block => block.type === 'highlight' && block.highlightType === 'warning'
  );
}

/**
 * 提取 Gate 警告消息
 */
export function extractGateWarningMessage(
  plannerResponseBlocks: any[]
): string | null {
  if (!Array.isArray(plannerResponseBlocks)) {
    return null;
  }
  
  const warningBlock = plannerResponseBlocks.find(
    block => block.type === 'highlight' && block.highlightType === 'warning'
  );
  
  return warningBlock?.highlightText || null;
}
