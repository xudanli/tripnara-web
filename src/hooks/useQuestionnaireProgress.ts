/**
 * 问卷进度持久化 Hook
 * 解决用户填写问卷时刷新页面导致进度丢失的问题
 * 
 * @module hooks/useQuestionnaireProgress
 */

import { useState, useEffect, useCallback } from 'react';
import type { QuestionnaireProgress, QuestionnaireAnswers } from '@/types/fitness';
import { QUESTIONNAIRE_CONFIG } from '@/constants/fitness';

const STORAGE_KEY = 'fitness_questionnaire_progress';

/**
 * 问卷进度持久化 Hook
 * 
 * @example
 * ```tsx
 * function QuestionnaireDialog() {
 *   const { progress, saveProgress, clearProgress, hasUnfinishedProgress } = useQuestionnaireProgress();
 *   
 *   // 恢复未完成的进度
 *   useEffect(() => {
 *     if (hasUnfinishedProgress) {
 *       setCurrentStep(progress.currentStep);
 *       setAnswers(progress.answers);
 *     }
 *   }, []);
 *   
 *   // 保存进度
 *   const handleAnswer = (questionId: string, value: number) => {
 *     const newAnswers = { ...answers, [questionId]: value };
 *     setAnswers(newAnswers);
 *     saveProgress(currentStep + 1, newAnswers);
 *   };
 *   
 *   // 完成时清除进度
 *   const handleComplete = async () => {
 *     await submitAnswers(answers);
 *     clearProgress();
 *   };
 * }
 * ```
 */
export function useQuestionnaireProgress() {
  const [progress, setProgress] = useState<QuestionnaireProgress | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化时从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as QuestionnaireProgress;
        
        // 检查是否过期
        const hoursElapsed = (Date.now() - data.startedAt) / (1000 * 60 * 60);
        if (hoursElapsed < QUESTIONNAIRE_CONFIG.EXPIRY_HOURS) {
          setProgress(data);
          console.log('[QuestionnaireProgress] 恢复进度:', data);
        } else {
          // 过期了，清除
          localStorage.removeItem(STORAGE_KEY);
          console.log('[QuestionnaireProgress] 进度已过期，已清除');
        }
      }
    } catch (err) {
      console.warn('[QuestionnaireProgress] 读取进度失败:', err);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  /**
   * 保存进度
   */
  const saveProgress = useCallback((step: number, answers: QuestionnaireAnswers) => {
    const data: QuestionnaireProgress = {
      currentStep: step,
      answers,
      startedAt: progress?.startedAt || Date.now(),
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setProgress(data);
      console.log('[QuestionnaireProgress] 保存进度:', data);
    } catch (err) {
      console.warn('[QuestionnaireProgress] 保存进度失败:', err);
    }
  }, [progress?.startedAt]);

  /**
   * 清除进度（完成或放弃时调用）
   */
  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProgress(null);
    console.log('[QuestionnaireProgress] 进度已清除');
  }, []);

  /**
   * 获取已保存的答案
   */
  const getSavedAnswers = useCallback((): QuestionnaireAnswers => {
    return progress?.answers || {};
  }, [progress?.answers]);

  /**
   * 获取已保存的步骤
   */
  const getSavedStep = useCallback((): number => {
    return progress?.currentStep || 0;
  }, [progress?.currentStep]);

  // 检查是否有未完成的问卷
  const hasUnfinishedProgress = isInitialized && progress !== null && progress.currentStep > 0;

  return {
    /** 当前进度 */
    progress,
    /** 是否已初始化 */
    isInitialized,
    /** 是否有未完成的进度 */
    hasUnfinishedProgress,
    /** 保存进度 */
    saveProgress,
    /** 清除进度 */
    clearProgress,
    /** 获取已保存的答案 */
    getSavedAnswers,
    /** 获取已保存的步骤 */
    getSavedStep,
  };
}
