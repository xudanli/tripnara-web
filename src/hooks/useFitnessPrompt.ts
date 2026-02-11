/**
 * 体能评估提示控制 Hook
 * 控制何时向用户显示体能评估提示
 * 
 * @module hooks/useFitnessPrompt
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useFitnessProfile } from './useFitnessQuery';
import type { PromptTrigger } from '@/types/fitness';
import { QUESTIONNAIRE_CONFIG } from '@/constants/fitness';

const PROMPT_DISMISSED_KEY = 'fitness_prompt_dismissed';

interface PromptState {
  /** 是否应该显示提示 */
  shouldShow: boolean;
  /** 触发来源 */
  trigger: PromptTrigger | null;
  /** 是否已有体能画像 */
  hasProfile: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 体能评估提示控制 Hook
 * 
 * @example
 * ```tsx
 * function TripCreationSuccessPage() {
 *   const { 
 *     shouldShow, 
 *     hasProfile, 
 *     tryShowPrompt, 
 *     onComplete, 
 *     onDismiss 
 *   } = useFitnessPrompt();
 *   
 *   useEffect(() => {
 *     // 行程创建完成后尝试显示提示
 *     tryShowPrompt('trip_created');
 *   }, []);
 *   
 *   return (
 *     <div>
 *       <h1>行程创建成功！</h1>
 *       {shouldShow && (
 *         <FitnessPromptCard 
 *           onComplete={onComplete}
 *           onDismiss={onDismiss}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFitnessPrompt() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading, error } = useFitnessProfile();
  
  const [state, setState] = useState<PromptState>({
    shouldShow: false,
    trigger: null,
    hasProfile: false,
    isLoading: true,
  });

  // 更新 hasProfile 状态
  useEffect(() => {
    const hasProfile = !!profile && !error;
    setState(prev => ({
      ...prev,
      hasProfile,
      isLoading: profileLoading,
    }));
  }, [profile, profileLoading, error]);

  /**
   * 检查是否在冷却期内
   */
  const isInCooldown = useCallback((): boolean => {
    try {
      const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
      if (!dismissed) return false;

      const dismissedAt = parseInt(dismissed, 10);
      if (isNaN(dismissedAt)) {
        localStorage.removeItem(PROMPT_DISMISSED_KEY);
        return false;
      }

      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      return daysSinceDismissed < QUESTIONNAIRE_CONFIG.SKIP_COOLDOWN_DAYS;
    } catch {
      return false;
    }
  }, []);

  /**
   * 尝试显示提示
   * 
   * @param trigger - 触发来源
   * @returns 是否成功触发显示
   */
  const tryShowPrompt = useCallback((trigger: PromptTrigger): boolean => {
    // 未登录，不显示
    if (!user?.id) {
      console.log('[FitnessPrompt] 未登录，不显示');
      return false;
    }
    
    // 还在加载中，不显示
    if (state.isLoading) {
      console.log('[FitnessPrompt] 还在加载，暂不显示');
      return false;
    }
    
    // 已有画像，不需要提示
    if (state.hasProfile) {
      console.log('[FitnessPrompt] 已有体能画像，不显示');
      return false;
    }
    
    // 在冷却期内，不提示（除非是手动触发）
    if (trigger !== 'manual' && isInCooldown()) {
      console.log('[FitnessPrompt] 在冷却期内，不显示');
      return false;
    }

    console.log('[FitnessPrompt] 触发显示:', trigger);
    setState(prev => ({ ...prev, shouldShow: true, trigger }));
    return true;
  }, [user?.id, state.isLoading, state.hasProfile, isInCooldown]);

  /**
   * 用户完成评估后调用
   */
  const onComplete = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      shouldShow: false, 
      hasProfile: true, 
      trigger: null 
    }));
    // 清除冷却期
    localStorage.removeItem(PROMPT_DISMISSED_KEY);
    console.log('[FitnessPrompt] 评估完成');
  }, []);

  /**
   * 用户暂时跳过时调用
   */
  const onDismiss = useCallback(() => {
    setState(prev => ({ ...prev, shouldShow: false, trigger: null }));
    // 设置冷却期
    localStorage.setItem(PROMPT_DISMISSED_KEY, Date.now().toString());
    console.log('[FitnessPrompt] 用户跳过，进入冷却期');
  }, []);

  /**
   * 重置状态（用于测试或强制重新检查）
   */
  const reset = useCallback(() => {
    setState(prev => ({ ...prev, shouldShow: false, trigger: null }));
  }, []);

  /**
   * 获取剩余冷却天数
   */
  const getCooldownDaysRemaining = useCallback((): number => {
    try {
      const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
      if (!dismissed) return 0;

      const dismissedAt = parseInt(dismissed, 10);
      if (isNaN(dismissedAt)) return 0;

      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      const remaining = QUESTIONNAIRE_CONFIG.SKIP_COOLDOWN_DAYS - daysSinceDismissed;
      return Math.max(0, Math.ceil(remaining));
    } catch {
      return 0;
    }
  }, []);

  return {
    /** 是否应该显示提示 */
    shouldShow: state.shouldShow,
    /** 触发来源 */
    trigger: state.trigger,
    /** 是否已有体能画像 */
    hasProfile: state.hasProfile,
    /** 是否正在加载 */
    isLoading: state.isLoading,
    /** 是否在冷却期 */
    isInCooldown: isInCooldown(),
    /** 尝试显示提示 */
    tryShowPrompt,
    /** 完成评估 */
    onComplete,
    /** 跳过评估 */
    onDismiss,
    /** 重置状态 */
    reset,
    /** 获取剩余冷却天数 */
    getCooldownDaysRemaining,
  };
}
