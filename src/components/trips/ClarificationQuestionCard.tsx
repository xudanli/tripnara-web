import type { ClarificationQuestion } from '@/types/clarification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface ClarificationQuestionCardProps {
  question: ClarificationQuestion;
  value: string | string[] | number | null;
  onChange: (value: string | string[] | number | null) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function asNumberOrNull(v: string): number | null {
  if (!isNonEmptyString(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ClarificationQuestionCard({
  question,
  value,
  onChange,
  error,
  disabled,
  className,
}: ClarificationQuestionCardProps) {
  const requiredMark = question.required ? (
    <span className="text-red-500 ml-1" aria-hidden="true">
      *
    </span>
  ) : null;

  const renderInput = () => {
    switch (question.type) {
      case 'text': {
        const textValue = typeof value === 'string' ? value : '';
        const useTextarea = question.question.length > 50;
        return useTextarea ? (
          <Textarea
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            disabled={disabled}
            rows={3}
            className="resize-none"
          />
        ) : (
          <Input
            value={textValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
            disabled={disabled}
          />
        );
      }
      case 'single_choice': {
        const options = question.options ?? [];
        const selected = typeof value === 'string' ? value : '';
        const useRadio = options.length > 0 && options.length <= 4;
        return useRadio ? (
          <RadioGroup value={selected} onValueChange={(v) => onChange(v)} className="space-y-2">
            {options.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem id={`${question.id}-${opt}`} value={opt} disabled={disabled} />
                <Label htmlFor={`${question.id}-${opt}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        ) : (
          <Select value={selected} onValueChange={(v) => onChange(v)} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder ?? '请选择'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      case 'multi_choice': {
        const options = question.options ?? [];
        const selected = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <div key={opt} className="flex items-center space-x-2">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(next) => {
                      const isChecked = next === true;
                      const nextArr = isChecked
                        ? Array.from(new Set([...selected, opt]))
                        : selected.filter((v) => v !== opt);
                      onChange(nextArr);
                    }}
                  />
                  <Label className="font-normal">{opt}</Label>
                </div>
              );
            })}
          </div>
        );
      }
      case 'date': {
        // Use native date input (already used in existing codebase).
        const dateValue = typeof value === 'string' ? value : '';
        return (
          <Input
            type="date"
            value={dateValue}
            onChange={(e) => onChange(e.target.value)}
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
            onChange={(e) => onChange(asNumberOrNull(e.target.value))}
            placeholder={question.placeholder}
            min={question.validation?.min}
            max={question.validation?.max}
            disabled={disabled}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {question.question}
          {requiredMark}
        </CardTitle>
        {question.hint ? <CardDescription>{question.hint}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {renderInput()}
        {error ? (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

