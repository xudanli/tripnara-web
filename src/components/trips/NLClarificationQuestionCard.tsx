/**
 * 自然语言对话场景的澄清问题卡片
 * 
 * 与 src/components/trips/ClarificationQuestionCard.tsx 不同，
 * 这个组件专门为 NL 对话场景设计，更简洁，更突出
 */

import { useState } from 'react';
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
import CriticalFieldIndicator from './CriticalFieldIndicator';

interface NLClarificationQuestionCardProps {
  question: NLClarificationQuestion;
  value: string | string[] | number | boolean | null;
  onChange: (value: string | string[] | number | boolean | null) => void;
  onAnswer?: (questionId: string, value: string | string[] | number | boolean | null) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function NLClarificationQuestionCard({
  question,
  value,
  onChange,
  onAnswer,
  error,
  disabled,
  className,
}: NLClarificationQuestionCardProps) {
  // 🆕 HCI优化：条件输入字段状态管理
  const [conditionalInputValues, setConditionalInputValues] = useState<Record<string, any>>({});
  const [conditionalInputErrors, setConditionalInputErrors] = useState<Record<string, string>>({});

  // 🆕 检查当前选中的选项是否触发条件输入字段
  const getTriggeredConditionalInputs = (currentValue?: string | string[] | number | boolean | null): ConditionalInputField[] => {
    if (!question.conditionalInputs || question.conditionalInputs.length === 0) {
      return [];
    }

    // 🆕 使用传入的 currentValue，如果没有则使用组件的 value
    const valueToCheck = currentValue !== undefined ? currentValue : value;

    // 获取当前选中的值（需要标准化处理，与选项值匹配）
    let selectedValue = '';
    if (question.inputType === 'single_choice' || question.inputType === 'boolean') {
      if (typeof valueToCheck === 'string') {
        selectedValue = valueToCheck.trim();
      } else if (typeof valueToCheck === 'boolean') {
        const options = question.options || ['是', '否'];
        // 标准化选项值
        const normalizedOptions = options.map((opt: any) => {
          if (typeof opt === 'object' && opt !== null) {
            return opt.value ?? opt.label ?? String(opt);
          }
          return String(opt);
        });
        selectedValue = valueToCheck ? normalizedOptions[0] : (normalizedOptions[1] || normalizedOptions[0]);
      } else if (typeof valueToCheck === 'object' && valueToCheck !== null) {
        // 处理对象类型的值
        selectedValue = String((valueToCheck as any).value ?? (valueToCheck as any).label ?? valueToCheck).trim();
      }
    }

    // 🐛 调试日志：检查匹配情况
    console.log('[NLClarificationQuestionCard] 检查条件输入字段:', {
      questionId: question.id,
      questionText: question.text?.substring(0, 50),
      inputType: question.inputType,
      currentValue: valueToCheck,
      selectedValue,
      hasConditionalInputs: question.conditionalInputs?.length > 0,
      conditionalInputs: question.conditionalInputs,
      triggerValues: question.conditionalInputs?.map(ci => ci.triggerValue),
      options: question.options,
    });

    if (!selectedValue) {
      return [];
    }

    // 🆕 改进的匹配逻辑：更健壮的匹配方式
    const normalizeString = (str: string): string => {
      // 移除所有标点符号和空格，只保留核心文字
      return str
        .replace(/[,，。、\s]/g, '') // 移除逗号、空格等
        .toLowerCase()
        .trim();
    };

    // 检查是否有匹配的条件输入字段（使用精确匹配、模糊匹配和标准化匹配）
    const matched = question.conditionalInputs.filter((conditionalInput) => {
      const triggerValue = conditionalInput.triggerValue?.trim();
      if (!triggerValue) return false;
      
      // 1. 精确匹配
      if (triggerValue === selectedValue) {
        console.log('[NLClarificationQuestionCard] 精确匹配:', { triggerValue, selectedValue });
        return true;
      }
      
      // 2. 模糊匹配：检查 selectedValue 是否包含 triggerValue，或 triggerValue 是否包含 selectedValue
      const containsMatch = selectedValue.includes(triggerValue) || triggerValue.includes(selectedValue);
      if (containsMatch) {
        console.log('[NLClarificationQuestionCard] 模糊匹配:', { triggerValue, selectedValue });
        return true;
      }
      
      // 3. 🆕 标准化匹配：移除标点符号后比较（处理 "不准确, 需要修改" vs "不准确，需要修改"）
      const normalizedTrigger = normalizeString(triggerValue);
      const normalizedSelected = normalizeString(selectedValue);
      if (normalizedTrigger === normalizedSelected || 
          normalizedSelected.includes(normalizedTrigger) || 
          normalizedTrigger.includes(normalizedSelected)) {
        console.log('[NLClarificationQuestionCard] 标准化匹配:', { 
          triggerValue, 
          selectedValue,
          normalizedTrigger,
          normalizedSelected
        });
        return true;
      }
      
      // 4. 🆕 关键词匹配：检查是否包含关键部分（例如："需要修改"、"需要调整"）
      const keyPhrases = ['需要修改', '需要调整', '不准确', '不符合'];
      const hasKeyPhrase = keyPhrases.some(phrase => 
        selectedValue.includes(phrase) && triggerValue.includes(phrase)
      );
      if (hasKeyPhrase) {
        console.log('[NLClarificationQuestionCard] 关键词匹配:', { triggerValue, selectedValue });
        return true;
      }
      
      return false;
    });
    
    console.log('[NLClarificationQuestionCard] 匹配结果:', { matchedCount: matched.length, matched });
    return matched;
  };

  const handleChange = (newValue: string | string[] | number | boolean | null) => {
    onChange(newValue);
    // 🆕 使用 fieldName 而不是 questionId（如果存在）
    const fieldKey = question.metadata?.fieldName || question.id;
    onAnswer?.(fieldKey, newValue);

    // 🆕 如果选项改变，清除不再触发的条件输入字段的值
    // 🐛 修复：使用 newValue 而不是旧的 value 来检查触发的条件输入字段
    const triggeredInputs = getTriggeredConditionalInputs(newValue);
    const newTriggeredKeys = new Set(triggeredInputs.map((ci) => ci.triggerValue));
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
    const key = conditionalInput.triggerValue;
    setConditionalInputValues((prev) => ({
      ...prev,
      [key]: inputValue,
    }));

    // 🆕 验证条件输入字段
    const validationError = validateConditionalInput(conditionalInput, inputValue);
    setConditionalInputErrors((prev) => {
      if (validationError) {
        return { ...prev, [key]: validationError };
      } else {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      }
    });

    // 🆕 通知父组件条件输入字段的值变化
    // 格式：{ optionValue: inputValue } 或 { optionValue: { startDate, endDate } }
    const fieldKey = question.metadata?.fieldName || question.id;
    const conditionalFieldKey = `${fieldKey}_${key}`;
    onAnswer?.(conditionalFieldKey, inputValue);
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

  // 🆕 HCI优化：渲染条件输入字段
  const renderConditionalInput = (conditionalInput: ConditionalInputField) => {
    const key = conditionalInput.triggerValue;
    const inputValue = conditionalInputValues[key];
    const inputError = conditionalInputErrors[key];

    switch (conditionalInput.inputType) {
      case 'text': {
        const textValue = typeof inputValue === 'string' ? inputValue : '';
        return (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">
              {conditionalInput.label || '请输入'}
              {conditionalInput.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Input
              value={textValue}
              onChange={(e) => handleConditionalInputChange(conditionalInput, e.target.value)}
              placeholder={conditionalInput.placeholder}
              disabled={disabled}
              className={cn(inputError && 'border-red-500')}
            />
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-red-600" role="alert">{inputError}</p>
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
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Input
              type="number"
              value={numValue}
              onChange={(e) => {
                const num = e.target.value ? Number(e.target.value) : null;
                handleConditionalInputChange(conditionalInput, num);
              }}
              placeholder={conditionalInput.placeholder}
              disabled={disabled}
              className={cn(inputError && 'border-red-500')}
            />
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-red-600" role="alert">{inputError}</p>
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
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Input
              type="date"
              value={dateValue}
              onChange={(e) => handleConditionalInputChange(conditionalInput, e.target.value)}
              disabled={disabled}
              className={cn(inputError && 'border-red-500')}
            />
            {conditionalInput.hint && (
              <p className="text-xs text-muted-foreground">{conditionalInput.hint}</p>
            )}
            {inputError && (
              <p className="text-xs text-red-600" role="alert">{inputError}</p>
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
                <span className="text-red-500 ml-1">*</span>
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
                      inputError && "border-red-500"
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
                      inputError && "border-red-500"
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
            {inputError && (
              <p className="text-xs text-red-600" role="alert">{inputError}</p>
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
    ? 'border-red-300 border-2'  // Critical 字段使用红色边框
    : question.required 
      ? 'border-slate-300' 
      : 'border-slate-200';
  
  const bgColor = isCritical
    ? 'bg-red-50/30'  // Critical 字段使用浅红色背景
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
              isCritical ? "text-red-900" : question.required ? "text-slate-900" : "text-slate-800"
            )}>
              {question.text}
              {question.required && !isCritical && (
                <span className="text-red-500 ml-1 font-semibold" aria-label="必填">*</span>
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
              isCritical ? "text-red-700" : "text-muted-foreground"
            )}>
              {question.hint}
            </p>
          )}
          
          {/* 🆕 P4: Critical 字段解释提示（符合认知科学中的"上下文帮助"原则） */}
          {isCritical && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-900 mb-0.5">
                    为什么需要这个信息？
                  </p>
                  <p className="text-xs text-red-700 leading-relaxed">
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
          <p className="text-sm text-red-600 mt-2" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
