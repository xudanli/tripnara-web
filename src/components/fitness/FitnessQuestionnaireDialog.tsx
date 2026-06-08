/**
 * 体能评估问卷弹窗组件
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { 
  useFitnessQuestionnaire, 
  useSubmitQuestionnaire 
} from '@/hooks/useFitnessQuery';
import { useQuestionnaireProgress } from '@/hooks/useQuestionnaireProgress';
import type { 
  Question, 
  QuestionOption, 
  QuestionnaireAnswers,
  PromptTrigger,
} from '@/types/fitness';
import { QUESTIONNAIRE_CONFIG } from '@/constants/fitness';
import { 
  trackQuestionnaireStarted,
  trackStepCompleted,
  trackQuestionnaireSubmitted,
  trackQuestionnaireSkipped,
  trackQuestionnaireAbandoned,
  trackQuestionnaireResumed,
} from '@/utils/fitness-analytics';
import { FitnessLevelBadge } from './FitnessLevelBadge';
interface FitnessQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  onSkip?: () => void;
  trigger?: PromptTrigger;
}

/**
 * 体能评估问卷弹窗
 * 
 * @example
 * ```tsx
 * <FitnessQuestionnaireDialog
 *   open={showQuestionnaire}
 *   onOpenChange={setShowQuestionnaire}
 *   onComplete={() => {
 *     toast.success('评估完成！');
 *     refetchProfile();
 *   }}
 *   trigger="trip_created"
 * />
 * ```
 */
export function FitnessQuestionnaireDialog({
  open,
  onOpenChange,
  onComplete,
  onSkip,
  trigger = 'manual',
}: FitnessQuestionnaireDialogProps) {
  const { t, i18n } = useTranslation();
  // 检测是否为中文环境（支持 zh, zh-CN, zh-TW 等）
  const isZh = i18n.language?.startsWith('zh') ?? false;
  const locale = isZh ? 'zh' : 'en';

  // 获取问题翻译 - 直接使用前端翻译
  const getQuestionText = (question: Question): string => {
    // 使用前端翻译文件，后端数据作为 fallback
    const fallback = isZh && question.questionZh ? question.questionZh : question.question;
    return t(`fitness.questionnaire.questions.${question.id}.question`, fallback);
  };

  // 获取选项翻译 - 直接使用前端翻译
  const getOptionLabel = (questionId: string, option: QuestionOption): string => {
    // 使用前端翻译文件，后端数据作为 fallback
    const fallback = isZh && option.labelZh ? option.labelZh : option.label;
    return t(`fitness.questionnaire.questions.${questionId}.options.${option.value}`, fallback);
  };
  
  // 获取问卷数据
  const { data: questionnaire, isLoading: questionnaireLoading } = useFitnessQuestionnaire(locale);
  
  // 提交问卷
  const submitMutation = useSubmitQuestionnaire();
  
  // 问卷进度持久化
  const { 
    progress: savedProgress, 
    saveProgress, 
    clearProgress,
    hasUnfinishedProgress,
    isInitialized,
  } = useQuestionnaireProgress();

  // 状态
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // 埋点用
  const startTimeRef = useRef<number>(0);
  const stepStartTimeRef = useRef<number>(0);
  const completedRef = useRef(false);

  // 获取所有问题（核心问题 + 年龄问题）
  const allQuestions = questionnaire 
    ? [...questionnaire.questions, questionnaire.ageQuestion]
    : [];
  
  const totalSteps = QUESTIONNAIRE_CONFIG.TOTAL_STEPS;
  const currentQuestion = allQuestions[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  // 初始化时恢复进度或记录开始
  useEffect(() => {
    if (!open || !isInitialized) return;

    if (hasUnfinishedProgress && savedProgress) {
      // 恢复进度
      setCurrentStep(savedProgress.currentStep);
      setAnswers(savedProgress.answers);
      startTimeRef.current = savedProgress.startedAt;
      
      const hoursAgo = (Date.now() - savedProgress.startedAt) / (1000 * 60 * 60);
      trackQuestionnaireResumed({
        resumedAtStep: savedProgress.currentStep,
        savedHoursAgo: Math.round(hoursAgo * 10) / 10,
      });
    } else {
      // 新开始
      startTimeRef.current = Date.now();
      trackQuestionnaireStarted(trigger);
    }
    
    stepStartTimeRef.current = Date.now();
  }, [open, isInitialized, hasUnfinishedProgress, savedProgress, trigger]);

  // 组件卸载时检查是否放弃
  useEffect(() => {
    return () => {
      if (open && !completedRef.current && currentStep > 0) {
        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
        trackQuestionnaireAbandoned({
          atStep: currentStep,
          timeSpentSeconds: timeSpent,
        });
      }
    };
  }, [open, currentStep]);

  // 选择答案
  const handleSelectOption = useCallback((questionId: string, value: number) => {
    const newAnswers = { ...answers };
    
    // 根据问题 ID 映射到答案字段
    switch (questionId) {
      case 'weekly_exercise':
        newAnswers.weeklyExercise = value;
        break;
      case 'longest_hike':
        newAnswers.longestHike = value;
        break;
      case 'elevation_experience':
        newAnswers.elevationExperience = value;
        break;
      case 'age_group':
        newAnswers.ageGroupIndex = value;
        break;
    }

    setAnswers(newAnswers);
    
    // 保存进度
    saveProgress(currentStep, newAnswers);
    
    // 埋点
    const timeOnStep = Date.now() - stepStartTimeRef.current;
    trackStepCompleted({
      step: currentStep + 1,
      questionId,
      answer: value,
      timeOnStep,
    });
  }, [answers, currentStep, saveProgress]);

  // 下一步
  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(prev => prev + 1);
      stepStartTimeRef.current = Date.now();
    }
  }, [isLastStep]);

  // 上一步
  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      stepStartTimeRef.current = Date.now();
    }
  }, [currentStep]);

  // 提交问卷
  const handleSubmit = useCallback(async () => {
    try {
      const longestHike = answers.longestHike ?? 2;

      const result = await submitMutation.mutateAsync({
        weeklyExercise: answers.weeklyExercise ?? 2,
        longestHike,
        elevationExperience: answers.elevationExperience ?? 2,
        ageGroupIndex: answers.ageGroupIndex ?? 1,
        riskTolerance: answers.riskTolerance,
        highAltitudeExperience: answers.highAltitudeExperience,
        pace: answers.pace,
      });

      // 埋点
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      trackQuestionnaireSubmitted({
        fitnessLevel: result.profile.fitnessLevel,
        fitnessScore: result.profile.overallScore,
        confidence: result.profile.confidence,
        timeSpentSeconds: timeSpent,
      });

      // 清除进度
      clearProgress();
      completedRef.current = true;

      // 显示结果
      setResultData(result);
      setShowResult(true);
    } catch (error) {
      console.error('提交问卷失败:', error);
    }
  }, [answers, submitMutation, clearProgress]);

  // 跳过问卷
  const handleSkip = useCallback(() => {
    trackQuestionnaireSkipped(currentStep);
    clearProgress();
    onSkip?.();
    onOpenChange(false);
  }, [currentStep, clearProgress, onSkip, onOpenChange]);

  // 完成并关闭
  const handleFinish = useCallback(() => {
    onComplete?.();
    onOpenChange(false);
    // 重置状态
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setResultData(null);
  }, [onComplete, onOpenChange]);

  // 获取当前问题的选中值
  const getCurrentAnswer = (): number | undefined => {
    if (!currentQuestion) return undefined;
    
    switch (currentQuestion.id) {
      case 'weekly_exercise':
        return answers.weeklyExercise;
      case 'longest_hike':
        return answers.longestHike;
      case 'elevation_experience':
        return answers.elevationExperience;
      case 'age_group':
        return answers.ageGroupIndex;
      default:
        return undefined;
    }
  };

  const currentAnswer = getCurrentAnswer();
  const canProceed = currentAnswer !== undefined;

  // 加载中
  if (questionnaireLoading || !isInitialized) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // 显示结果
  if (showResult && resultData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              🎉 {t('fitness.questionnaire.resultTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 总评分 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
                <span className="text-4xl font-bold text-primary">
                  {resultData.profile.overallScore}
                </span>
              </div>
              <div className="flex justify-center mb-2">
                <FitnessLevelBadge level={resultData.profile.fitnessLevel} size="lg" />
              </div>
              <p className="text-muted-foreground">
                {resultData.profile.levelDescription}
              </p>
            </div>

            {/* 推荐参数 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('fitness.questionnaire.recommendedAscent')}</p>
                <p className="text-xl font-semibold">
                  {resultData.profile.recommendedDailyAscentM}m
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">{t('fitness.questionnaire.recommendedDistance')}</p>
                <p className="text-xl font-semibold">
                  {resultData.profile.recommendedDailyDistanceKm}km
                </p>
              </div>
            </div>

            {/* 提示 */}
            <p className="text-sm text-center text-muted-foreground">
              {t('fitness.questionnaire.resultHint')}
            </p>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleFinish} size="lg">
              {t('fitness.questionnaire.startPlanning')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            🏃 {t('fitness.questionnaire.title')}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('fitness.questionnaire.subtitle', { count: totalSteps })}
          </DialogDescription>
        </DialogHeader>

        {/* 进度条 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('fitness.questionnaire.progress', { current: currentStep + 1, total: totalSteps })}</span>
            <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}%</span>
          </div>
          <Progress value={((currentStep + 1) / totalSteps) * 100} />
        </div>

        {/* 问题 */}
        {currentQuestion && (
          <div className="space-y-4 py-4">
            <h3 className="text-lg font-medium text-center">
              {getQuestionText(currentQuestion)}
            </h3>

            {/* 选项 */}
            <div className="space-y-2">
              {currentQuestion.options.map((option: QuestionOption) => (
                <button
                  key={option.value}
                  onClick={() => handleSelectOption(currentQuestion.id, option.value)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                    'hover:border-primary/50 hover:bg-primary/5',
                    currentAnswer === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-muted'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="flex-1">
                      {getOptionLabel(currentQuestion.id, option)}
                    </span>
                    {currentAnswer === option.value && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="ghost"
            onClick={currentStep === 0 ? handleSkip : handleBack}
          >
            {currentStep === 0 ? (
              <>
                <X className="w-4 h-4 mr-2" />
                {t('fitness.questionnaire.skip')}
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('fitness.questionnaire.back')}
              </>
            )}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <Spinner className="w-4 h-4 mr-2" />
            ) : isLastStep ? (
              <>
                {t('fitness.questionnaire.submit')}
                <Check className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                {t('fitness.questionnaire.next')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
