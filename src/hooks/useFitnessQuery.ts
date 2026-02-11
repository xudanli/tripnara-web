/**
 * 体能评估 React Query Hooks
 * @module hooks/useFitnessQuery
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fitnessApi, FitnessApiError } from '@/api/fitness';
import type { 
  QuestionnaireSubmitData, 
  FeedbackSubmitData,
  FitnessProfile,
  QuestionnaireResponse,
  FeedbackStats,
  CalibrationResult,
  QuestionnaireSubmitResult,
} from '@/types/fitness';
import { DEFAULT_FITNESS_PROFILE } from '@/constants/fitness';
import { toast } from 'sonner';

// ==================== Query Keys ====================

export const fitnessKeys = {
  all: ['fitness'] as const,
  profile: (userId: string) => [...fitnessKeys.all, 'profile', userId] as const,
  questionnaire: (locale: string) => [...fitnessKeys.all, 'questionnaire', locale] as const,
  feedbackStats: (userId: string) => [...fitnessKeys.all, 'feedback-stats', userId] as const,
};

// ==================== Local Storage Utils ====================

const FITNESS_PROFILE_STORAGE_KEY = 'fitness_profile';

/**
 * 保存体能画像到 localStorage（临时方案，后端修复后可移除）
 */
function saveProfileToLocalStorage(userId: string, profile: FitnessProfile): void {
  try {
    const key = `${FITNESS_PROFILE_STORAGE_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify({
      profile,
      savedAt: new Date().toISOString(),
    }));
    console.log('[FitnessQuery] 体能画像已保存到本地存储');
  } catch (error) {
    console.warn('[FitnessQuery] 保存体能画像到本地存储失败:', error);
  }
}

/**
 * 从 localStorage 读取体能画像
 */
function getProfileFromLocalStorage(userId: string): FitnessProfile | null {
  try {
    const key = `${FITNESS_PROFILE_STORAGE_KEY}_${userId}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    const parsed = JSON.parse(data);
    console.log('[FitnessQuery] 从本地存储读取体能画像');
    return parsed.profile;
  } catch (error) {
    console.warn('[FitnessQuery] 从本地存储读取体能画像失败:', error);
    return null;
  }
}

// ==================== Query Hooks ====================

/**
 * 获取体能画像
 * 
 * 优先从后端获取，如果后端返回 404 则尝试从 localStorage 读取
 * （临时方案：后端修复持久化后，localStorage 逻辑可移除）
 * 
 * @returns Query 结果，包含 profile 数据或错误
 * @example
 * ```tsx
 * const { data: profile, isLoading, error } = useFitnessProfile();
 * ```
 */
export function useFitnessProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: fitnessKeys.profile(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('未登录');
      
      try {
        // 优先从后端获取
        const profile = await fitnessApi.getProfile(user.id);
        // 同步到本地存储（确保数据一致性）
        saveProfileToLocalStorage(user.id, profile);
        return profile;
      } catch (error) {
        // 如果后端返回 404，尝试从本地存储读取
        if (error instanceof FitnessApiError && error.code === 'NOT_FOUND') {
          const localProfile = getProfileFromLocalStorage(user.id);
          if (localProfile) {
            console.log('[FitnessQuery] 后端无数据，使用本地存储的体能画像');
            return localProfile;
          }
        }
        // 其他错误或本地存储也没有，继续抛出
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5分钟内不重新请求
    gcTime: 30 * 60 * 1000,   // 缓存保留30分钟
    retry: (failureCount, error: any) => {
      // 404（未评估）不重试
      if (error instanceof FitnessApiError && error.code === 'NOT_FOUND') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * 获取体能画像（带默认值）
 * 适用于需要始终有值的场景
 * 
 * @returns 包含 profile、isDefault、isLoading 的对象
 * @example
 * ```tsx
 * const { profile, isDefault, isLoading } = useFitnessProfileWithDefault();
 * // profile 永远不为 null
 * ```
 */
export function useFitnessProfileWithDefault(): {
  profile: FitnessProfile;
  isDefault: boolean;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useFitnessProfile();

  // 判断是否使用默认值
  const isDefault = !data || (error instanceof FitnessApiError && error.code === 'NOT_FOUND');

  return {
    profile: data ?? DEFAULT_FITNESS_PROFILE,
    isDefault,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * 检查用户是否已完成体能评估
 * 
 * @returns 是否已完成评估
 */
export function useHasFitnessProfile(): boolean {
  const { data, isLoading, error } = useFitnessProfile();
  
  if (isLoading) return false;
  if (error instanceof FitnessApiError && error.code === 'NOT_FOUND') return false;
  return !!data;
}

/**
 * 获取体能评估问卷
 * 
 * @param locale - 语言
 * @returns Query 结果
 */
export function useFitnessQuestionnaire(locale: 'zh' | 'en' = 'zh') {
  return useQuery({
    queryKey: fitnessKeys.questionnaire(locale),
    queryFn: () => fitnessApi.getQuestionnaire(locale),
    staleTime: Infinity, // 问卷内容不变
    gcTime: Infinity,
  });
}

/**
 * 获取反馈统计
 * 
 * @returns Query 结果
 */
export function useFeedbackStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: fitnessKeys.feedbackStats(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) throw new Error('未登录');
      return fitnessApi.getFeedbackStats(user.id);
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10分钟
  });
}

// ==================== Mutation Hooks ====================

/**
 * 提交问卷 Mutation
 * 
 * @returns Mutation 对象
 * @example
 * ```tsx
 * const submitMutation = useSubmitQuestionnaire();
 * 
 * const handleSubmit = async () => {
 *   await submitMutation.mutateAsync({
 *     weeklyExercise: 2,
 *     longestHike: 2,
 *     elevationExperience: 2,
 *     ageGroupIndex: 1,
 *   });
 * };
 * ```
 */
export function useSubmitQuestionnaire() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answers: Omit<QuestionnaireSubmitData, 'userId'>): Promise<QuestionnaireSubmitResult> => {
      if (!user?.id) throw new Error('未登录');
      return fitnessApi.submitQuestionnaire({
        userId: user.id,
        ...answers,
      });
    },
    onSuccess: (result) => {
      // 更新缓存的 profile
      if (user?.id) {
        queryClient.setQueryData(
          fitnessKeys.profile(user.id),
          result.profile
        );
        
        // 🆕 保存到本地存储（临时方案：确保刷新后数据不丢失）
        saveProfileToLocalStorage(user.id, result.profile);
      }
      toast.success('体能评估完成！');
    },
    onError: (error: any) => {
      const message = error instanceof FitnessApiError 
        ? error.message 
        : '提交失败，请稍后重试';
      toast.error(message);
    },
  });
}

/**
 * 提交行程反馈 Mutation
 * 
 * @returns Mutation 对象
 */
export function useSubmitFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeedbackSubmitData) => {
      if (!user?.id) throw new Error('未登录');
      return fitnessApi.submitFeedback(user.id, data);
    },
    onSuccess: (result) => {
      toast.success(result.message);
      // 使 profile 和 stats 缓存失效
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: fitnessKeys.profile(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: fitnessKeys.feedbackStats(user.id),
        });
      }
    },
    onError: (error: any) => {
      const message = error instanceof FitnessApiError 
        ? error.message 
        : '提交反馈失败';
      toast.error(message);
    },
  });
}

/**
 * 手动校准 Mutation
 * 
 * @returns Mutation 对象
 */
export function useCalibrateFitness() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CalibrationResult> => {
      if (!user?.id) throw new Error('未登录');
      return fitnessApi.calibrate(user.id);
    },
    onSuccess: (result) => {
      if (result.calibrated) {
        toast.success(result.message);
        // 刷新 profile
        if (user?.id) {
          queryClient.invalidateQueries({
            queryKey: fitnessKeys.profile(user.id),
          });
        }
      } else {
        toast.info(result.message);
      }
    },
    onError: (error: any) => {
      const message = error instanceof FitnessApiError 
        ? error.message 
        : '校准失败';
      toast.error(message);
    },
  });
}

// ==================== Utility Hooks ====================

/**
 * 刷新体能画像
 * 
 * @returns 刷新函数
 */
export function useRefreshFitnessProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({
      queryKey: fitnessKeys.profile(user.id),
    });
  };
}

/**
 * 预取问卷数据
 * 用于提前加载问卷，提升用户体验
 * 
 * @param locale - 语言
 */
export function usePrefetchQuestionnaire(locale: 'zh' | 'en' = 'zh') {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: fitnessKeys.questionnaire(locale),
      queryFn: () => fitnessApi.getQuestionnaire(locale),
      staleTime: Infinity,
    });
  };
}
