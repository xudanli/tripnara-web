/**
 * 自然语言对话适配器函数
 * 用于将后端返回的澄清问题格式转换为前端格式
 * 兼容新旧两种字段名（question/text, type/inputType）
 * 兼容 options 两种格式：string[] 与 { value, label }[]
 */

import type {
  NLClarificationQuestion,
  ConditionalInputField,
  ClarificationOption,
} from '@/types/trip';

/**
 * 获取条件输入字段在 questionAnswers 中的存储 key
 * 后端合并到 partialParams.preferences 时使用
 */
export function getConditionalInputStorageKey(
  questionId: string,
  fieldKey: string,
  conditionalInput: ConditionalInputField
): string {
  if (conditionalInput.paramKey) {
    return `${questionId}_${conditionalInput.paramKey}`;
  }
  return `${fieldKey}_${conditionalInput.triggerValue}`;
}

/** 从 answer 提取用于 trigger 匹配的字符串（含 options 的 value/label） */
function getMatchableStrings(answer: any, options?: (string | { value?: string; label?: string })[]): string[] {
  const result: string[] = [];
  if (answer === null || answer === undefined) return result;
  if (typeof answer === 'string' && answer.trim()) {
    result.push(answer.trim());
    const opt = options?.find((o) => (typeof o === 'object' ? o?.value : o) === answer || (typeof o === 'object' ? o?.label : o) === answer);
    if (opt && typeof opt === 'object' && opt.label && opt.label !== answer) result.push(opt.label.trim());
    return result;
  }
  if (typeof answer === 'number') {
    result.push(String(answer));
    return result;
  }
  if (typeof answer === 'boolean' && options?.length) {
    const normalized = options.map((o: any) => (typeof o === 'object' ? o.value ?? o.label : o)).filter(Boolean);
    result.push(answer ? String(normalized[0]) : String(normalized[1] ?? normalized[0]));
    return result;
  }
  if (Array.isArray(answer)) {
    answer.forEach((v) => {
      if (typeof v === 'string' && v.trim()) result.push(v.trim());
      else if (typeof v === 'object' && v !== null) {
        const val = (v as any).value;
        const lbl = (v as any).label;
        if (val) result.push(String(val).trim());
        if (lbl && String(lbl).trim() !== String(val ?? '').trim()) result.push(String(lbl).trim());
        if (!val && !lbl) result.push(String(v).trim());
      }
    });
    return result;
  }
  if (typeof answer === 'object' && answer !== null) {
    const val = (answer as any).value;
    const lbl = (answer as any).label;
    if (val) result.push(String(val).trim());
    if (lbl && String(lbl).trim() !== String(val ?? '').trim()) result.push(String(lbl).trim());
    if (!val && !lbl) result.push(String(answer).trim());
  }
  return result;
}

function valueMatchesTrigger(sel: string, triggerValue: string): boolean {
  if (!triggerValue?.trim()) return false;
  const t = triggerValue.trim();
  if (t === sel) return true;
  if (sel.includes(t) || t.includes(sel)) return true;
  const normalize = (str: string) => str.replace(/[,，。、\s]/g, '').toLowerCase().trim();
  const nT = normalize(t);
  const nSel = normalize(sel);
  if (nT === nSel || nSel.includes(nT) || nT.includes(nSel)) return true;
  const keyPhrases = ['需要修改', '需要调整', '不准确', '不符合'];
  if (keyPhrases.some((p) => sel.includes(p) && t.includes(p))) return true;
  return false;
}

/**
 * 获取被触发的条件输入（与 NLClarificationQuestionCard 相同的匹配逻辑）
 * 用于 allQuestionsAnswered 检查，避免 option value 与 triggerValue 不匹配时误判
 */
export function getTriggeredConditionalInputs(
  question: NLClarificationQuestion,
  answer: string | string[] | number | boolean | null
): ConditionalInputField[] {
  if (!question.conditionalInputs?.length) return [];
  const matchable = getMatchableStrings(answer, question.options);
  if (matchable.length === 0) return [];
  return question.conditionalInputs.filter((ci) => {
    const triggerValue = ci.triggerValue?.trim();
    if (!triggerValue) return false;
    return matchable.some((sel) => valueMatchesTrigger(sel, triggerValue));
  });
}

/**
 * 标准化 options 为统一格式（供展示使用）
 * 后端可能返回 string[] 或 { value, label }[]
 */
/**
 * 标准化后端返回的条件输入字段（支持 snake_case）
 * 后端可能返回 trigger_value、input_type、param_key 等，统一转为前端格式
 */
function normalizeConditionalInputField(ci: any): ConditionalInputField {
  const triggerValue = ci.triggerValue ?? ci.trigger_value ?? '';
  let inputType = (ci.inputType ?? ci.input_type ?? 'text') as string;
  if (inputType === 'multi_choice') inputType = 'multiple_choice';
  if (inputType === 'textarea') inputType = 'text';
  const options = ci.options ?? ci.options_list;
  return {
    triggerValue: String(triggerValue).trim(),
    inputType: inputType as ConditionalInputField['inputType'],
    label: ci.label,
    placeholder: ci.placeholder,
    required: ci.required,
    validation: ci.validation,
    hint: ci.hint,
    paramKey: ci.paramKey ?? ci.param_key,
    submitLabel: ci.submitLabel ?? ci.submit_label,
    ...(Array.isArray(options) && options.length > 0 ? { options } : {}),
  };
}

/**
 * 标准化 options 为统一格式（供展示使用）
 * 后端可能返回 string[] 或 { value, label }[]
 */
export function normalizeOptions(
  opt: string | { value?: string; label?: string } | null | undefined
): ClarificationOption {
  if (opt == null) return { value: '', label: '' };
  if (typeof opt === 'string') return { value: opt, label: opt };
  return {
    value: opt.value ?? opt.label ?? String(opt),
    label: opt.label ?? opt.value ?? String(opt),
  };
}

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
  
  // type === 'boolean' 且未配置 options 时，自动补充默认选项
  const DEFAULT_BOOLEAN_OPTIONS = [
    { value: 'true', label: '是' },
    { value: 'false', label: '否' },
  ] as const;
  let options: (string | { value: string; label: string })[] = Array.isArray(q.options) ? q.options : [];
  if (inputType === 'boolean' && options.length === 0) {
    options = [...DEFAULT_BOOLEAN_OPTIONS];
  }
  
  // 透传 conditionalInputs（支持 camelCase 与 snake_case）；若后端未提供，才根据选项语义推断 fallback
  const rawConditionalInputs = q.conditionalInputs ?? q.conditional_inputs;
  let conditionalInputs: ConditionalInputField[] | undefined;
  if (Array.isArray(rawConditionalInputs) && rawConditionalInputs.length > 0) {
    conditionalInputs = rawConditionalInputs.flatMap((ci: any) => {
      const normalized = normalizeConditionalInputField(ci);
      // 智能升级：若后端返回 text 类型，但 triggerValue 可解析出结构化选项，则改用单选/多选（可能拆成多字段）
      if (normalized.inputType === 'text' && Array.isArray(options)) {
        const optTexts = options.map((o: any) => (typeof o === 'object' ? o.value ?? o.label : o)).filter(Boolean);
        const triggerText = [normalized.triggerValue, ...optTexts].join(' ');
        if (/补充|点击补充/.test(triggerText) && /偏好|信息|活动|节奏|兴趣|住宿/.test(triggerText)) {
          const parsed = parseStructuredOptionsFromLabel(normalized.triggerValue);
          if (parsed) {
            // 展开时不应继承 submitLabel：仅当后端显式为该条件输入提供 submitLabel 时才渲染独立提交按钮；否则只显示主按钮「确认并继续」
            const { submitLabel: _s, ...rest } = normalized;
            if ('fields' in parsed) {
              return parsed.fields.map((f) => ({
                ...rest,
                triggerValue: normalized.triggerValue,
                inputType: (f.multiple ? 'multiple_choice' : 'single_choice') as ConditionalInputField['inputType'],
                label: f.label,
                options: f.options,
                paramKey: f.paramKey,
              }));
            }
            if ('options' in parsed && parsed.options.length >= 2) {
              return [{
                ...rest,
                inputType: (parsed.multiple ? 'multiple_choice' : 'single_choice') as ConditionalInputField['inputType'],
                label: parsed.label,
                options: parsed.options,
                paramKey: parsed.paramKey,
              }];
            }
          }
        }
      }
      return [normalized];
    });
  } else if (Array.isArray(options)) {
    conditionalInputs = inferConditionalInputsFromOptions(options, q.metadata?.fieldName);
  } else {
    conditionalInputs = undefined;
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

/** 常见偏好类别的细分子选项（类别名 → 可选项） */
const PREFERENCE_SUB_OPTIONS: Record<string, string[]> = {
  徒步强度: ['轻松', '中等', '高强度'],
  美食: ['中餐', '西餐', '海鲜', '当地特色', '无特别要求'],
  住宿风格: ['经济型', '舒适型', '精品酒店', '民宿', '青旅'],
  餐饮: ['中餐', '西餐', '海鲜', '当地特色', '无特别要求'],
};

/**
 * 从选项文本解析括号内的子选项，用于生成 single_choice / multiple_choice
 * 例如："补充旅行节奏偏好 (紧凑/悠闲)" → { single_choice, options: ["紧凑","悠闲","适中"] }
 *      "补充偏好信息 (如徒步强度、美食、住宿风格)" → 拆成多个字段，或展平为多选
 */
function parseStructuredOptionsFromLabel(
  text: string
): { label: string; options: string[]; multiple: boolean; paramKey: string } | { fields: Array<{ label: string; options: string[]; multiple: boolean; paramKey: string }> } | null {
  const match = text.match(/[（(]([^)）]+)[)）]/);
  if (!match) return null;
  const inner = match[1].trim();
  const items = inner
    .replace(/^如\s*/, '')
    .split(/[/、,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length < 2) return null;

  const isPace = /节奏|紧凑|悠闲/.test(text);
  const isInterest = /兴趣|徒步|摄影|美食|运动/.test(text);
  const isAccommodation = /住宿|酒店|民宿|旅馆/.test(text);

  // 混合类别（如徒步强度、美食、住宿风格）：拆成多个条件输入，每个有细分子选项
  const expanded = items.map((item) => {
    const sub = PREFERENCE_SUB_OPTIONS[item];
    if (sub) return { item, options: sub };
    return { item, options: [item] };
  });
  const isMixedCategory = items.length >= 2 && expanded.some((e) => e.item in PREFERENCE_SUB_OPTIONS);
  if (isMixedCategory) {
    const fields = expanded
      .filter((e) => e.item in PREFERENCE_SUB_OPTIONS)
      .map((e) => ({
        label: `请选择${e.item}`,
        options: PREFERENCE_SUB_OPTIONS[e.item]!,
        multiple: e.item === '美食' || e.item === '餐饮' || e.item === '住宿风格',
        paramKey: e.item === '徒步强度' ? 'hiking_intensity' : e.item === '美食' || e.item === '餐饮' ? 'cuisine' : 'accommodation_style',
      }));
    if (fields.length >= 1) return { fields };
  }

  let options = items;
  let label = '请选择';
  let paramKey = 'preference';
  let multiple = true;

  if (isPace) {
    if (!options.includes('适中')) options = [...options, '适中'];
    label = '请选择旅行节奏';
    paramKey = 'pace';
    multiple = false;
  } else if (isInterest) {
    label = '请选择主要兴趣（可多选）';
    paramKey = 'interests';
    multiple = true;
  } else if (isAccommodation) {
    label = '请选择住宿类型偏好（可多选）';
    paramKey = 'accommodation';
    multiple = true;
  } else {
    label = '请选择（可多选）';
    paramKey = 'other';
  }

  return { label, options, multiple, paramKey };
}

/**
 * 根据选项文本推断条件输入字段（后端未提供时使用）
 * 例如：「不准确,需要修改具体日期」→ date_range；「需要调整,我的总预算是__元」→ number
 */
function inferConditionalInputsFromOptions(
  options: any[],
  _fieldName?: string
): ConditionalInputField[] {
  const result: ConditionalInputField[] = [];
  
  for (const opt of options) {
    // triggerValue = 表单实际存储的值（value ?? label）；推断时同时检查 value 和 label（后端可能 value="other", label="补充偏好信息"）
    const raw = typeof opt === 'object' && opt !== null ? opt : { value: String(opt), label: String(opt) };
    const triggerVal = (raw.value ?? raw.label ?? '').toString().trim();
    const labelVal = (raw.label ?? raw.value ?? '').toString().trim();
    const textForInfer = [triggerVal, labelVal].filter(Boolean).join(' ');
    if (!triggerVal && !labelVal) continue;
    // 日期相关：不准确/需要修改 + 日期
    if (/不准确|需要修改|修改.*日期/.test(textForInfer) && /日期|时间|天/.test(textForInfer)) {
      result.push({
        triggerValue: triggerVal,
        inputType: 'date_range',
        label: '请选择行程日期范围',
        required: true,
      });
    }
    // 预算相关：需要调整 + 预算/元
    if (/需要调整|不符合|调整/.test(textForInfer) && /预算|元|__/.test(textForInfer)) {
      result.push({
        triggerValue: triggerVal,
        inputType: 'number',
        label: '请输入总预算（元）',
        placeholder: '例如：15000',
        required: true,
        validation: { min: 1, max: 10000000 },
      });
    }
    // 旅行偏好相关：从选项文本解析结构化子选项，避免统一用文本框
    if (/补充|点击补充/.test(textForInfer) && /偏好|信息|活动|节奏|兴趣|住宿/.test(textForInfer)) {
      const parsed = parseStructuredOptionsFromLabel(textForInfer);
      if (parsed) {
        if ('fields' in parsed) {
          for (const f of parsed.fields) {
            result.push({
              triggerValue: triggerVal,
              inputType: f.multiple ? 'multiple_choice' : 'single_choice',
              label: f.label,
              options: f.options,
              required: true,
              paramKey: f.paramKey,
            });
          }
        } else {
          result.push({
            triggerValue: triggerVal,
            inputType: parsed.multiple ? 'multiple_choice' : 'single_choice',
            label: parsed.label,
            options: parsed.options,
            required: true,
            paramKey: parsed.paramKey,
          });
        }
      } else {
        // 无法解析时兜底为文本框
        result.push({
          triggerValue: triggerVal,
          inputType: 'text',
          label: '请描述您的旅行偏好',
          placeholder: '例如：喜欢户外徒步、节奏偏悠闲、对美食感兴趣',
          hint: '可描述偏好的活动类型、旅行节奏、餐饮偏好等，帮助我们优化行程',
          paramKey: 'other',
        });
      }
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
 * 从 plannerResponseBlocks 中提取 summary_card 的 summary 数据
 * 用于展示：杭州 3 天、千岛湖 1 天；必含景点：西湖、苏堤...
 */
export function extractSummaryFromBlocks(plannerResponseBlocks: any[] | undefined) {
  const summaryBlock = plannerResponseBlocks?.find((b: any) => b.type === 'summary_card');
  return summaryBlock?.summary ?? null;
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
