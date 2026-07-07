/**
 * 自然语言对话场景的澄清问题卡片
 * 
 * 与 src/components/trips/ClarificationQuestionCard.tsx 不同，
 * 这个组件专门为 NL 对话场景设计，更简洁，更突出
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { HelpCircle, CalendarIcon } from 'lucide-react';
import { cn, toDateOnly } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { NLClarificationQuestion, ConditionalInputField } from '@/types/trip';
import { getConditionalInputStorageKey as getStorageKey } from '@/utils/nl-conversation-adapter';
import CriticalFieldIndicator from './CriticalFieldIndicator';

interface NLClarificationQuestionCardProps {
  question: NLClarificationQuestion;
  value: string | string[] | number | boolean | null;
  onChange: (value: string | string[] | number | boolean | null) => void;
  onAnswer?: (questionId: string, value: string | string[] | number | boolean | null) => void;
  /** 条件输入字段的初始值，key 为 questionId_paramKey 或 fieldKey_triggerValue */
  conditionalInputAnswers?: Record<string, any>;
  /** 当 conditionalInput 有 submitLabel 时，点击提交按钮后调用：PUT 答案并 POST 继续对话 */
  onConditionalSubmit?: (question: NLClarificationQuestion, answers: Record<string, string | string[] | number | boolean | null>) => void | Promise<void>;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** 获取条件输入字段的 state key（内部去重用，paramKey 优先以支持同 triggerValue 多字段） */
function getConditionalInputStateKey(conditionalInput: ConditionalInputField): string {
  return conditionalInput.paramKey || conditionalInput.triggerValue;
}

export function NLClarificationQuestionCard({
  question,
  value,
  onChange,
  onAnswer,
  conditionalInputAnswers,
  onConditionalSubmit,
  error,
  disabled,
  className,
}: NLClarificationQuestionCardProps) {
  const fieldKey = question.metadata?.fieldName || question.id;

  // 🆕 HCI优化：条件输入字段状态管理
  const [conditionalInputValues, setConditionalInputValues] = useState<Record<string, any>>({});
  const [conditionalInputErrors, setConditionalInputErrors] = useState<Record<string, string>>({});

  // 从 questionAnswers 初始化条件输入字段的值（支持刷新/恢复场景）
  useEffect(() => {
    if (!conditionalInputAnswers || !question.conditionalInputs?.length) return;
    const initial: Record<string, any> = {};
    question.conditionalInputs.forEach((ci) => {
      const storageKey = getStorageKey(question.id, fieldKey, ci);
      const stateKey = getConditionalInputStateKey(ci);
      const v = conditionalInputAnswers[storageKey];
      if (v !== undefined && v !== null) {
        initial[stateKey] = v;
      }
    });
    if (Object.keys(initial).length > 0) {
      setConditionalInputValues((prev) => ({ ...prev, ...initial }));
    }
  }, [question.id, question.conditionalInputs, fieldKey, conditionalInputAnswers]);

  // 🆕 检查当前选中的选项是否触发条件输入字段
  const getTriggeredConditionalInputs = (currentValue?: string | string[] | number | boolean | null): ConditionalInputField[] => {
    if (!question.conditionalInputs || question.conditionalInputs.length === 0) {
      return [];
    }

    // 🆕 使用传入的 currentValue，如果没有则使用组件的 value
    const valueToCheck = currentValue !== undefined ? currentValue : value;

    // 获取当前选中的值（需要标准化处理，与选项值匹配）
    // 支持 single_choice、boolean、multiple_choice（多选时 value 为 string[]）
    let selectedValues: string[] = [];
    if (question.inputType === 'single_choice' || question.inputType === 'boolean') {
      let s = '';
      if (typeof valueToCheck === 'string') {
        s = valueToCheck.trim();
      } else if (typeof valueToCheck === 'boolean') {
        const options = question.options || ['是', '否'];
        const normalizedOptions = options.map((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            return opt.value ?? opt.label ?? String(opt);
          }
          return String(opt);
        });
        s = valueToCheck ? normalizedOptions[0] : (normalizedOptions[1] || normalizedOptions[0]);
      } else if (typeof valueToCheck === 'object' && valueToCheck !== null) {
        s = String((valueToCheck as any).value ?? (valueToCheck as any).label ?? valueToCheck).trim();
      }
      if (s) selectedValues = [s];
    } else if (question.inputType === 'multiple_choice' && Array.isArray(valueToCheck)) {
      selectedValues = valueToCheck
        .map((v) => (typeof v === 'string' ? v : String((v as any)?.value ?? (v as any)?.label ?? v)))
        .filter(Boolean)
        .map((s) => s.trim());
    }
    const ____selectedValue = selectedValues.join(','); // 用于日志；匹配时逐个检查

    // 🐛 调试日志：检查匹配情况
    console.log('[NLClarificationQuestionCard] 检查条件输入字段:', {
      questionId: question.id,
      questionText: question.text?.substring(0, 50),
      inputType: question.inputType,
      currentValue: valueToCheck,
      selectedValues,
      hasConditionalInputs: question.conditionalInputs?.length > 0,
      conditionalInputs: question.conditionalInputs,
      triggerValues: question.conditionalInputs?.map(ci => ci.triggerValue),
      options: question.options,
    });

    if (selectedValues.length === 0) {
      return [];
    }

    // 🆕 改进的匹配逻辑：更健壮的匹配方式（支持多选：任一选中项匹配即触发）
    const normalizeString = (str: string): string => {
      return str
        .replace(/[,，。、\s]/g, '')
        .toLowerCase()
        .trim();
    };

    const valueMatchesTrigger = (sel: string, triggerValue: string): boolean => {
      if (triggerValue === sel) return true;
      if (sel.includes(triggerValue) || triggerValue.includes(sel)) return true;
      const nTrigger = normalizeString(triggerValue);
      const nSel = normalizeString(sel);
      if (nTrigger === nSel || nSel.includes(nTrigger) || nTrigger.includes(nSel)) return true;
      const keyPhrases = ['需要修改', '需要调整', '不准确', '不符合'];
      if (keyPhrases.some((p) => sel.includes(p) && triggerValue.includes(p))) return true;
      return false;
    };

    const matched = question.conditionalInputs.filter((conditionalInput) => {
      const triggerValue = conditionalInput.triggerValue?.trim();
      if (!triggerValue) return false;
      const match = selectedValues.some((sel) => valueMatchesTrigger(sel, triggerValue));
      if (match) {
        console.log('[NLClarificationQuestionCard] 条件输入匹配:', { triggerValue, selectedValues });
      }
      return match;
    });
    
    console.log('[NLClarificationQuestionCard] 匹配结果:', { matchedCount: matched.length, matched });
    return matched;
  };

  const handleChange = (newValue: string | string[] | number | boolean | null) => {
    onChange(newValue);
    // 🆕 使用 fieldName 而不是 questionId（如果存在）
    const fieldKey = question.metadata?.fieldName || question.id;
    onAnswer?.(fieldKey, newValue);

    // 如果选项改变，清除不再触发的条件输入字段的值
    const triggeredInputs = getTriggeredConditionalInputs(newValue);
    const newTriggeredKeys = new Set(triggeredInputs.map((ci) => getConditionalInputStateKey(ci)));
    setConditionalInputValues((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (!newTriggeredKeys.has(key)) {
          delete updated[key];
        }
      });
      return updated;
    });
  };

  // 🆕 处理条件输入字段的值变化
  const handleConditionalInputChange = (
    conditionalInput: ConditionalInputField,
    inputValue: any
  ) => {
    const stateKey = getConditionalInputStateKey(conditionalInput);
    setConditionalInputValues((prev) => ({
      ...prev,
      [stateKey]: inputValue,
    }));

    // 验证条件输入字段
    const validationError = validateConditionalInput(conditionalInput, inputValue);
    setConditionalInputErrors((prev) => {
      if (validationError) {
        return { ...prev, [stateKey]: validationError };
      } else {
        const updated = { ...prev };
        delete updated[stateKey];
        return updated;
      }
    });

    // 通知父组件：key 为 questionId_paramKey 或 fieldKey_triggerValue（向后兼容）
    const storageKey = getStorageKey(question.id, fieldKey, conditionalInput);
    onAnswer?.(storageKey, inputValue);
  };

  // 🆕 验证条件输入字段
  const validateConditionalInput = (
    conditionalInput: ConditionalInputField,
    inputValue: any
  ): string | null => {
    // 日期范围验证
    if (conditionalInput.inputType === 'date_range') {
      if (conditionalInput.required) {
        if (!inputValue || typeof inputValue !== 'object') {
          return '请选择日期范围';
        }
        const rangeValue = inputValue as { startDate?: string; endDate?: string };
        if (!rangeValue.startDate || !rangeValue.endDate) {
          return '请选择完整的日期范围';
        }
        if (new Date(rangeValue.startDate) > new Date(rangeValue.endDate)) {
          return '开始日期不能晚于结束日期';
        }
      }
      return null;
    }

    // single_choice / multiple_choice 必填验证
    if (conditionalInput.inputType === 'single_choice' || conditionalInput.inputType === 'multiple_choice') {
      if (conditionalInput.required) {
        const isEmpty = conditionalInput.inputType === 'single_choice'
          ? (inputValue == null || inputValue === '')
          : (!Array.isArray(inputValue) || inputValue.length === 0);
        if (isEmpty) return '请至少选择一项';
      }
      return null;
    }

    // 其他类型的必填验证
    if (conditionalInput.required) {
      if (!inputValue || inputValue === '') {
        return '此字段为必填项';
      }
    }

    if (!conditionalInput.validation || !inputValue) {
      return null;
    }

    const { min, max, pattern } = conditionalInput.validation;

    if (conditionalInput.inputType === 'number') {
      const numValue = Number(inputValue);
      if (isNaN(numValue)) {
        return '请输入有效的数字';
      }
      if (min !== undefined && numValue < min) {
        return `最小值不能小于 ${min}`;
      }
      if (max !== undefined && numValue > max) {
        return `最大值不能大于 ${max}`;
      }
    }

    if (pattern && typeof inputValue === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(inputValue)) {
        return '格式不正确';
      }
    }

    return null;
  };

  const renderInput = () => {
    switch (question.inputType) {
      case 'boolean': {
        const options = question.options || ['是', '否'];
        // 🐛 处理 options 可能是对象数组的情况
        const normalizedOptions = options.map((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            return {
              value: opt.value ?? opt.label ?? String(opt),
              label: opt.label ?? opt.value ?? String(opt),
              original: opt
            };
          }
          return {
            value: String(opt),
            label: String(opt),
            original: opt
          };
        });
        
        const selected = typeof value === 'boolean' 
          ? (value ? normalizedOptions[0].value : normalizedOptions[1]?.value ?? normalizedOptions[0].value)
          : typeof value === 'string' 
            ? value 
            : typeof value === 'object' && value !== null
              ? (value as any).value ?? (value as any).label ?? String(value)
              : null;
        
        return (
          <div className="flex gap-2">
            {normalizedOptions.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChange(opt.value === normalizedOptions[0].value)}
                  disabled={disabled}
                  className={cn(
                    "flex-1",
                    isSelected && "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                  )}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        );
      }
      
      case 'single_choice': {
        const options = question.options || [];
        // 🐛 处理 options 可能是对象数组的情况（如 {value, label}）
        const normalizedOptions = options.map((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            // 如果是对象，提取 value 和 label
            return {
              value: opt.value ?? opt.label ?? String(opt),
              label: opt.label ?? opt.value ?? String(opt),
              original: opt
            };
          }
          return {
            value: String(opt),
            label: String(opt),
            original: opt
          };
        });
        
        // 获取当前选中的值（可能是字符串或对象）
        let selectedValue = '';
        if (typeof value === 'string') {
          selectedValue = value;
        } else if (typeof value === 'object' && value !== null) {
          // 如果是对象，提取 value
          selectedValue = (value as any).value ?? (value as any).label ?? String(value);
        }
        
        if (normalizedOptions.length <= 4) {
          // 使用按钮组
          return (
            <div className="flex flex-wrap gap-2">
              {normalizedOptions.map((opt) => {
                const isSelected = selectedValue === opt.value;
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleChange(opt.value)}
                    disabled={disabled}
                    className={cn(
                      isSelected && "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                    )}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          );
        } else {
          // 使用单选组
          return (
            <RadioGroup value={selectedValue} onValueChange={(v) => handleChange(v)} className="space-y-2">
              {normalizedOptions.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem id={`${question.id}-${opt.value}`} value={opt.value} disabled={disabled} />
                  <Label htmlFor={`${question.id}-${opt.value}`} className="font-normal cursor-pointer">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          );
        }
      }
      
      case 'multiple_choice': {
        const options = question.options || [];
        // 🐛 处理 options 可能是对象数组的情况（如 {value, label}）
        const normalizedOptions = options.map((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            return {
              value: opt.value ?? opt.label ?? String(opt),
              label: opt.label ?? opt.value ?? String(opt),
              original: opt
            };
          }
          return {
            value: String(opt),
            label: String(opt),
            original: opt
          };
        });
        
        // 获取当前选中的值数组（可能是字符串数组或对象数组）
        const selectedArray = Array.isArray(value) ? value : [];
        const selectedValues = selectedArray.map((v: any) => {
          if (typeof v === 'object' && v !== null) {
            return v.value ?? v.label ?? String(v);
          }
          return String(v);
        });
        
        return (
          <div className="space-y-2">
            {normalizedOptions.map((opt) => {
              const isSelected = selectedValues.includes(opt.value);
              return (
                <Button
                  key={opt.value}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newSelected = isSelected
                      ? selectedValues.filter(v => v !== opt.value)
                      : [...selectedValues, opt.value];
                    handleChange(newSelected);
                  }}
                  disabled={disabled}
                  className={cn(
                    "w-full justify-start",
                    isSelected && "bg-slate-900 hover:bg-slate-800 border-slate-900 text-white"
                  )}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        );
      }
      
      case 'text': {
        const textValue = typeof value === 'string' ? value : '';
        const useTextarea = question.text.length > 50 || (question.hint && question.hint.length > 30);
        
        return useTextarea ? (
          <Textarea
            value={textValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={question.hint}
            disabled={disabled}
            rows={3}
            className="resize-none"
          />
        ) : (
          <Input
            value={textValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={question.hint}
            disabled={disabled}
          />
        );
      }
      
      case 'number': {
        const numValue = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
        return (
          <Input
            type="number"
            value={numValue}
            onChange={(e) => {
              const num = e.target.value ? Number(e.target.value) : null;
              handleChange(num);
            }}
            placeholder={question.hint}
            disabled={disabled}
          />
        );
      }
      
      case 'date': {
        const dateValue = typeof value === 'string' ? toDateOnly(value) || value : '';
        return (
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
          />
        );
      }
      
      default:
        return null;
    }
  };

  // 🆕 构建并提交条件输入答案（含主问题 + 已触发的条件输入）
  const handleConditionalSubmit = (conditionalInput: ConditionalInputField) => {
    if (!onConditionalSubmit) return;
    const stateKey = getConditionalInputStateKey(conditionalInput);
    const inputValue = conditionalInputValues[stateKey];
    const err = validateConditionalInput(conditionalInput, inputValue);
    if (err) {
      setConditionalInputErrors((prev) => ({ ...prev, [stateKey]: err }));
      return;
    }
    const answers: Record<string, string | string[] | number | boolean | null> = {};
    if (value !== null && value !== undefined && value !== '') {
      answers[fieldKey] = value;
    }
    const triggered = getTriggeredConditionalInputs(value);
    triggered.forEach((ci) => {
      const sk = getConditionalInputStateKey(ci);
      const v = conditionalInputValues[sk];
      if (v !== null && v !== undefined) {
        const storageKey = getStorageKey(question.id, fieldKey, ci);
        answers[storageKey] = v;
      }
    });
    onConditionalSubmit(question, answers);
  };

  // HCI优化：渲染条件输入字段（同一 triggerValue 可对应多个字段，用 paramKey 区分）
  const renderConditionalInput = (conditionalInput: ConditionalInputField) => {
    const stateKey = getConditionalInputStateKey(conditionalInput);
    const inputValue = conditionalInputValues[stateKey];
    const inputError = conditionalInputErrors[stateKey];
    // 仅当存在 submitLabel 时渲染独立提交按钮；否则仅显示主按钮「确认并继续」
    const showSubmitButton = Boolean(conditionalInput.submitLabel?.trim?.() && onConditionalSubmit);

    switch (conditionalInput.inputType) {
      case 'text': {
        const textValue = typeof inputValue === 'string' ? inputValue : '';
        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请输入'}
              {conditionalInput.required && (
                <span className="text-gate-reject-foreground ml-1">*</span>
              )}
            </Label>
            <div className={cn('flex gap-2', showSubmitButton && 'items-end')}>
              <Input
                value={textValue}
                onChange={(e) => handleConditionalInputChange(conditionalInput, e.target.value)}
                placeholder={conditionalInput.placeholder}
                disabled={disabled}
                className={cn(inputError && 'border-gate-reject-border', showSubmitButton && 'flex-1')}
              />
              {showSubmitButton && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConditionalSubmit(conditionalInput)}
                  disabled={disabled}
                  className="shrink-0"
                >
                  {conditionalInput.submitLabel}
                </Button>
              )}
            </div>
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-gate-reject-foreground" role="alert">{inputError}</p>
            )}
          </div>
        );
      }

      case 'number': {
        const numValue = typeof inputValue === 'number' ? String(inputValue) : typeof inputValue === 'string' ? inputValue : '';
        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请输入数字'}
              {conditionalInput.required && (
                <span className="text-gate-reject-foreground ml-1">*</span>
              )}
            </Label>
            <div className={cn('flex gap-2', showSubmitButton && 'items-end')}>
              <Input
                type="number"
                value={numValue}
                onChange={(e) => {
                  const num = e.target.value ? Number(e.target.value) : null;
                  handleConditionalInputChange(conditionalInput, num);
                }}
                placeholder={conditionalInput.placeholder}
                disabled={disabled}
                className={cn(inputError && 'border-gate-reject-border', showSubmitButton && 'flex-1')}
              />
              {showSubmitButton && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConditionalSubmit(conditionalInput)}
                  disabled={disabled}
                  className="shrink-0"
                >
                  {conditionalInput.submitLabel}
                </Button>
              )}
            </div>
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-gate-reject-foreground" role="alert">{inputError}</p>
            )}
          </div>
        );
      }

      case 'date': {
        const dateValue = typeof inputValue === 'string' ? toDateOnly(inputValue) || inputValue : '';
        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请选择日期'}
              {conditionalInput.required && (
                <span className="text-gate-reject-foreground ml-1">*</span>
              )}
            </Label>
            <div className={cn('flex gap-2', showSubmitButton && 'items-end')}>
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => handleConditionalInputChange(conditionalInput, e.target.value)}
                disabled={disabled}
                className={cn(inputError && 'border-gate-reject-border', showSubmitButton && 'flex-1')}
              />
              {showSubmitButton && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleConditionalSubmit(conditionalInput)}
                  disabled={disabled}
                  className="shrink-0"
                >
                  {conditionalInput.submitLabel}
                </Button>
              )}
            </div>
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-gate-reject-foreground" role="alert">{inputError}</p>
            )}
          </div>
        );
      }

      case 'single_choice':
      case 'multiple_choice': {
        const opts = conditionalInput.options ?? [];
        const normalizedOpts = opts.map((o: any) =>
          typeof o === 'object' && o !== null
            ? { value: o.value ?? o.label ?? '', label: o.label ?? o.value ?? '' }
            : { value: String(o), label: String(o) }
        );
        const isMultiple = conditionalInput.inputType === 'multiple_choice';
        const currentVal = conditionalInput.inputType === 'single_choice'
          ? (typeof inputValue === 'string' ? inputValue : '')
          : (Array.isArray(inputValue) ? inputValue : []);
        const selectedSet = isMultiple
          ? new Set(Array.isArray(currentVal) ? currentVal.map(String) : [])
          : new Set(currentVal ? [String(currentVal)] : []);

        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请选择'}
              {conditionalInput.required && (
                <span className="text-gate-reject-foreground ml-1">*</span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2">
              {normalizedOpts.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (isMultiple) {
                        const next = isSelected
                          ? (Array.isArray(currentVal) ? currentVal : []).filter((v) => String(v) !== opt.value)
                          : [...(Array.isArray(currentVal) ? currentVal : []), opt.value];
                        handleConditionalInputChange(conditionalInput, next);
                      } else {
                        handleConditionalInputChange(conditionalInput, isSelected ? null : opt.value);
                      }
                    }}
                    disabled={disabled}
                    className={cn(
                      'text-xs',
                      isSelected && 'bg-slate-900 hover:bg-slate-800 border-slate-900 text-white'
                    )}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground mt-1">{conditionalInput.hint}</p>
            )}
            {showSubmitButton && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleConditionalSubmit(conditionalInput)}
                disabled={disabled}
                className="mt-1"
              >
                {conditionalInput.submitLabel}
              </Button>
            )}
            {inputError && (
              <p className="text-xs text-gate-reject-foreground mt-1" role="alert">{inputError}</p>
            )}
          </div>
        );
      }

      case 'date_range': {
        // 日期范围：{ startDate: string, endDate: string }
        const rangeValue = inputValue && typeof inputValue === 'object' 
          ? inputValue 
          : { startDate: '', endDate: '' };
        const startDate = rangeValue.startDate ? new Date(rangeValue.startDate) : undefined;
        const endDate = rangeValue.endDate ? new Date(rangeValue.endDate) : undefined;

        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请选择日期范围'}
              {conditionalInput.required && (
                <span className="text-gate-reject-foreground ml-1">*</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground",
                      inputError && "border-gate-reject-border"
                    )}
                    disabled={disabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'yyyy-MM-dd', { locale: zhCN }) : '开始日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      const newValue = {
                        ...rangeValue,
                        startDate: date ? format(date, 'yyyy-MM-dd') : '',
                      };
                      handleConditionalInputChange(conditionalInput, newValue);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground",
                      inputError && "border-gate-reject-border"
                    )}
                    disabled={disabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'yyyy-MM-dd', { locale: zhCN }) : '结束日期'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      const newValue = {
                        ...rangeValue,
                        endDate: date ? format(date, 'yyyy-MM-dd') : '',
                      };
                      handleConditionalInputChange(conditionalInput, newValue);
                    }}
                    initialFocus
                    disabled={(date) => {
                      if (startDate) {
                        return date < startDate;
                      }
                      return false;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {showSubmitButton && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleConditionalSubmit(conditionalInput)}
                disabled={disabled}
                className="mt-2"
              >
                {conditionalInput.submitLabel}
              </Button>
            )}
            {inputError && (
              <p className="text-xs text-gate-reject-foreground" role="alert">{inputError}</p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // 🆕 根据 Critical 字段、优先级和必填状态确定边框颜色
  const isCritical = question.metadata?.isCritical === true;
  const borderColor = isCritical
    ? 'border-gate-reject-border border-2'  // Critical 字段使用红色边框
    : question.required 
      ? 'border-slate-300' 
      : 'border-slate-200';
  
  const bgColor = isCritical
    ? 'bg-gate-reject/30'  // Critical 字段使用浅红色背景
    : question.metadata?.priority === 'high'
      ? 'bg-slate-50/60'
      : 'bg-white';

  return (
    <Card className={cn(
      "w-full border mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      borderColor,
      bgColor,
      className
    )}>
      <CardContent className="p-4 space-y-3">
        {/* 问题文本区域 */}
        <div className="space-y-1.5">
          {/* 问题文本和必填标识 */}
          <div className="flex items-start gap-2">
            <p className={cn(
              "text-sm font-medium leading-relaxed flex-1",
              isCritical ? "text-gate-reject-foreground" : question.required ? "text-slate-900" : "text-slate-800"
            )}>
              {question.text}
              {question.required && !isCritical && (
                <span className="text-gate-reject-foreground ml-1 font-semibold" aria-label="必填">*</span>
              )}
            </p>
            {/* 🆕 Critical 字段标识 */}
            {isCritical && (
              <CriticalFieldIndicator isCritical={true} required={question.required} />
            )}
            {/* 🆕 优先级标签（高优先级时显示，但 Critical 字段优先） */}
            {!isCritical && question.metadata?.priority === 'high' && (
              <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                重要
              </Badge>
            )}
          </div>
          
          {/* 提示信息 */}
          {question.hint && (
            <p className={cn(
              "text-xs leading-relaxed",
              isCritical ? "text-gate-reject-foreground" : "text-muted-foreground"
            )}>
              {question.hint}
            </p>
          )}
          
          {/* 🆕 P4: Critical 字段解释提示（符合认知科学中的"上下文帮助"原则） */}
          {isCritical && (
            <div className="mt-2 p-2 bg-gate-reject border border-gate-reject-border rounded-md">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-gate-reject-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gate-reject-foreground mb-0.5">
                    为什么需要这个信息？
                  </p>
                  <p className="text-xs text-gate-reject-foreground leading-relaxed">
                    这是安全相关的关键信息，必须填写才能继续创建行程。这些信息帮助我们评估行程的安全性和可行性，确保您的旅行安全。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* 输入控件 */}
        <div>
          {renderInput()}
        </div>

        {/* 🆕 HCI优化：条件输入字段 */}
        {(() => {
          const triggeredInputs = getTriggeredConditionalInputs();
          console.log('[NLClarificationQuestionCard] 渲染条件输入字段:', {
            questionId: question.id,
            questionText: question.text,
            currentValue: value,
            conditionalInputs: question.conditionalInputs,
            triggeredInputs,
            triggeredInputsCount: triggeredInputs.length,
          });
          
          if (triggeredInputs.length === 0) {
            return null;
          }
          
          return triggeredInputs.map((conditionalInput, index) => (
            <div key={`${question.id}_${conditionalInput.triggerValue}_${index}`}>
              {renderConditionalInput(conditionalInput)}
            </div>
          ));
        })()}
        
        {/* 错误提示 */}
        {error && (
          <p className="text-sm text-gate-reject-foreground mt-2" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
