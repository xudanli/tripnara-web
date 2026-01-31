/**
 * 自然语言对话场景的澄清问题卡片
 * 
 * 与 src/components/trips/ClarificationQuestionCard.tsx 不同，
 * 这个组件专门为 NL 对话场景设计，更简洁，更突出
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NLClarificationQuestion } from '@/types/trip';
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
  const handleChange = (newValue: string | string[] | number | boolean | null) => {
    onChange(newValue);
    // 🆕 使用 fieldName 而不是 questionId（如果存在）
    const fieldKey = question.metadata?.fieldName || question.id;
    onAnswer?.(fieldKey, newValue);
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
        const dateValue = typeof value === 'string' ? value : '';
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
        </div>
        
        {/* 输入控件 */}
        <div>
          {renderInput()}
        </div>
        
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
