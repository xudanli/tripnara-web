import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { readinessApi } from '@/api/readiness';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { gateStatusTokens, cardVariants, typographyTokens, spacingTokens } from '@/utils/design-tokens';
import type { ReadinessFindingItem, UserQuestion } from '@/api/readiness';

interface UserDecisionDialogProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  findingItem: ReadinessFindingItem;
  onAnswered?: (updatedFinding: any) => void;
}

/**
 * 用户决策对话框组件
 * 用于回答准备度检查中的用户决策问题
 */
export default function UserDecisionDialog({
  open,
  onClose,
  tripId,
  findingItem,
  onAnswered,
}: UserDecisionDialogProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh' || i18n.language.startsWith('zh');
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🆕 获取问题文本（支持国际化）
   */
  const getQuestionText = (question: UserQuestion): string => {
    if (typeof question.text === 'string') {
      return question.text;
    }
    // 国际化对象
    const textObj = question.text as { zh: string; en: string };
    return isZh ? textObj.zh : textObj.en;
  };

  /**
   * 🆕 获取选项文本（支持国际化）
   */
  const getOptionText = (option: string | { zh: string; en: string }): string => {
    if (typeof option === 'string') {
      return option;
    }
    return isZh ? option.zh : option.en;
  };

  /**
   * 🆕 标准化问题解析
   * 
   * 支持两种格式：
   * 1. 结构化格式（推荐）：UserQuestion[]
   * 2. 字符串格式（向后兼容）：string[]
   */
  const parseQuestions = (): Array<UserQuestion & { parsed: boolean }> => {
    if (!findingItem.askUser || findingItem.askUser.length === 0) {
      return [];
    }

    // 如果已经是结构化格式
    if (Array.isArray(findingItem.askUser) && findingItem.askUser.length > 0) {
      const firstItem = findingItem.askUser[0];
      if (typeof firstItem === 'object' && 'id' in firstItem && 'text' in firstItem) {
        // 结构化格式
        return (findingItem.askUser as UserQuestion[]).map(q => ({
          ...q,
          required: q.required !== undefined ? q.required : true, // 默认必填
          parsed: true,
        }));
      }
    }

    // 字符串格式（向后兼容）
    return (findingItem.askUser as string[]).map((question, index) => {
      // 格式1：questionId: 问题文本 (选项1|选项2|选项3) [required|optional] [single|multiple]
      // 格式2：questionId: 问题文本 [required|optional]
      const match = question.match(/^([^:]+):\s*(.+?)(?:\s*\(([^)]+)\))?(?:\s*\[([^\]]+)\])?$/);
      if (match) {
        const [, questionId, questionText, optionsStr, flagsStr] = match;
        const options = optionsStr ? optionsStr.split('|').map(opt => opt.trim()) : [];
        const flags = flagsStr ? flagsStr.split('|').map(f => f.trim().toLowerCase()) : [];
        
        // 解析标志
        const required = !flags.includes('optional'); // 默认必填，除非标记为 optional
        const isMultiple = flags.includes('multiple');
        const isSingle = flags.includes('single') || (!isMultiple && options.length > 0);
        
        return {
          id: questionId.trim(),
          text: questionText.trim(),
          type: isMultiple ? 'multiple' as const : (isSingle ? 'single' as const : 'text' as const),
          required,
          options: options.length > 0 ? options : undefined,
          parsed: true,
        };
      }
      
      // 如果没有匹配，使用默认格式
      return {
        id: `question_${index}`,
        text: question,
        type: 'text' as const,
        required: true, // 默认必填
        parsed: true,
      };
    });
  };

  const questions = parseQuestions();

  // 重置表单
  useEffect(() => {
    if (open) {
      setAnswers({});
      setError(null);
    }
  }, [open, findingItem.id]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // 🆕 处理多选答案变化
  const handleMultipleAnswerChange = (questionId: string, optionValue: string, checked: boolean) => {
    setAnswers(prev => {
      const currentValue = prev[questionId] || [];
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentArray, optionValue],
        };
      } else {
        return {
          ...prev,
          [questionId]: currentArray.filter((v: string) => v !== optionValue),
        };
      }
    });
  };

  const handleSubmit = async () => {
    if (!findingItem.id) {
      setError(isZh ? '缺少规则ID' : 'Missing rule ID');
      return;
    }

    // 🆕 验证所有必填问题都已回答
    const unansweredRequiredQuestions = questions.filter(q => {
      if (!q.required) return false; // 跳过可选问题
      
      const answer = answers[q.id];
      if (q.type === 'multiple') {
        // 多选：至少选择一个
        return !Array.isArray(answer) || answer.length === 0;
      } else {
        // 单选或文本：必须有值
        return !answer || (typeof answer === 'string' && answer.trim() === '');
      }
    });
    
    if (unansweredRequiredQuestions.length > 0) {
      setError(
        isZh 
          ? `请回答所有必填问题：${unansweredRequiredQuestions.map(q => q.text).join('、')}`
          : `Please answer all required questions: ${unansweredRequiredQuestions.map(q => q.text).join(', ')}`
      );
      return;
    }

    // 🆕 验证文本输入长度（如果有验证规则）
    for (const question of questions) {
      if (question.type === 'text' && question.validation) {
        const answer = answers[question.id];
        if (answer && typeof answer === 'string') {
          if (question.validation.minLength && answer.length < question.validation.minLength) {
            setError(
              isZh
                ? `${question.text}：答案长度至少 ${question.validation.minLength} 个字符`
                : `${question.text}: Answer must be at least ${question.validation.minLength} characters`
            );
            return;
          }
          if (question.validation.maxLength && answer.length > question.validation.maxLength) {
            setError(
              isZh
                ? `${question.text}：答案长度不能超过 ${question.validation.maxLength} 个字符`
                : `${question.text}: Answer must not exceed ${question.validation.maxLength} characters`
            );
            return;
          }
          if (question.validation.pattern) {
            const pattern = new RegExp(question.validation.pattern);
            if (!pattern.test(answer)) {
              setError(
                isZh
                  ? `${question.text}：答案格式不正确`
                  : `${question.text}: Invalid answer format`
              );
              return;
            }
          }
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await readinessApi.answerDecision(
        tripId,
        findingItem.id,
        answers
      );

      toast.success(
        isZh 
          ? '回答已提交，规则级别已更新'
          : 'Answer submitted, rule level updated'
      );

      // 调用回调函数
      if (onAnswered) {
        onAnswered(result.updatedFinding);
      }

      // 如果还有后续问题，保持对话框打开
      if (result.updatedFinding.nextQuestions && result.updatedFinding.nextQuestions.length > 0) {
        // 更新 findingItem 以显示新问题
        // 这里需要父组件更新数据
        toast.info(
          isZh
            ? '还有后续问题需要回答'
            : 'There are follow-up questions to answer'
        );
      } else {
        // 关闭对话框
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to submit decision answer:', err);
      setError(
        err.message || (isZh ? '提交失败，请稍后重试' : 'Failed to submit, please try again')
      );
      toast.error(
        err.message || (isZh ? '提交失败' : 'Submission failed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAnswers({});
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className={cn('w-5 h-5', gateStatusTokens.WARN.icon)} />
            <span className="text-base font-semibold">
              {isZh ? '需要您的回答' : 'Your Answer Required'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? '请回答以下问题，以便系统重新评估此准备项的优先级级别。'
              : 'Please answer the following questions so the system can re-evaluate the priority level of this readiness item.'}
          </DialogDescription>
        </DialogHeader>

        <div className={cn('space-y-4', spacingTokens.drawerPaddingBottom)}>
          {/* 准备项信息 */}
          <div className={cn('p-3 rounded-lg border', cardVariants.evidence)}>
            <p className="text-sm font-medium text-foreground">{findingItem.message}</p>
            {findingItem.category && (
              <p className={cn('text-xs mt-1', typographyTokens.label)}>
                {isZh ? '分类' : 'Category'}: {findingItem.category}
              </p>
            )}
          </div>

          {/* 问题列表 */}
          <div className="space-y-4">
            {questions.map((question) => {
              const questionText = getQuestionText(question);
              const placeholder = typeof question.placeholder === 'string' 
                ? question.placeholder 
                : question.placeholder 
                  ? (isZh ? (question.placeholder as { zh: string; en: string }).zh : (question.placeholder as { zh: string; en: string }).en)
                  : (isZh ? '请输入您的回答' : 'Please enter your answer');
              
              return (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id} className="text-sm font-medium flex items-center gap-2">
                    <span>{questionText}</span>
                    {question.required && (
                      <span className={cn('text-xs', gateStatusTokens.BLOCK.text)} title={isZh ? '必填' : 'Required'}>
                        *
                      </span>
                    )}
                    {!question.required && (
                      <span className={cn('text-xs', typographyTokens.label)}>
                        ({isZh ? '可选' : 'Optional'})
                      </span>
                    )}
                  </Label>
                  
                  {/* 单选问题 */}
                  {question.type === 'single' && question.options && (
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {question.options.map((option) => {
                        const optionValue = typeof option === 'string' ? option : option;
                        const optionText = getOptionText(option);
                        // 对于单选，使用选项值作为 value（可能是字符串或对象）
                        const optionKey = typeof option === 'string' ? option : JSON.stringify(option);
                        
                        return (
                          <div key={optionKey} className="flex items-center space-x-2">
                            <RadioGroupItem value={optionValue} id={`${question.id}_${optionKey}`} />
                            <Label
                              htmlFor={`${question.id}_${optionKey}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  )}
                  
                  {/* 🆕 多选问题 */}
                  {question.type === 'multiple' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => {
                        // 对于多选，使用选项索引或字符串值作为 value（必须是字符串）
                        const optionValue: string = typeof option === 'string' ? option : `option_${optIndex}`;
                        const optionText = getOptionText(option);
                        const optionKey = typeof option === 'string' ? option : `option_${optIndex}`;
                        
                        const currentAnswers = answers[question.id] || [];
                        const checked = Array.isArray(currentAnswers) && currentAnswers.includes(optionValue);
                        
                        return (
                          <div key={optionKey} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${question.id}_${optionKey}`}
                              checked={checked}
                              onCheckedChange={(checked) => 
                                handleMultipleAnswerChange(question.id, optionValue, checked === true)
                              }
                            />
                            <Label
                              htmlFor={`${question.id}_${optionKey}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {optionText}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* 文本输入问题 */}
                  {question.type === 'text' && (
                    <Input
                      id={question.id}
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder={placeholder}
                      maxLength={question.validation?.maxLength}
                      minLength={question.validation?.minLength}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className={cn('p-3 rounded-lg border flex items-start gap-2', gateStatusTokens.BLOCK.bg, gateStatusTokens.BLOCK.border)}>
              <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', gateStatusTokens.BLOCK.icon)} />
              <p className={cn('text-sm', gateStatusTokens.BLOCK.text)}>{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className={cn('flex justify-end gap-3 pt-4 border-t border-gray-200', spacingTokens.drawerGapSmall)}>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={submitting}
            >
              {isZh ? '取消' : 'Cancel'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || questions.length === 0}
            >
              {submitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  {isZh ? '提交中...' : 'Submitting...'}
                </>
              ) : (
                isZh ? '提交' : 'Submit'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
