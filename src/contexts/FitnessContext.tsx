/**
 * 体能评估全局状态 Context
 * 提供体能画像的全局访问
 * 
 * @module contexts/FitnessContext
 */

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFitnessProfile, useFitnessProfileWithDefault, fitnessKeys } from '@/hooks/useFitnessQuery';
import { useAuth } from '@/hooks/useAuth';
import type { FitnessProfile, FitnessLevel, ConfidenceLevel } from '@/types/fitness';

// ==================== Context Types ====================

interface FitnessContextValue {
  /** 体能画像（永远有值，可能是默认值） */
  profile: FitnessProfile;
  /** 是否使用的是默认画像 */
  isDefault: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否已完成体能评估 */
  hasCompletedAssessment: boolean;
  /** 刷新体能画像 */
  refetch: () => Promise<void>;
  /** 体能等级 */
  fitnessLevel: FitnessLevel;
  /** 置信度 */
  confidence: ConfidenceLevel;
  /** 总评分 */
  overallScore: number;
}

// ==================== Context ====================

const FitnessContext = createContext<FitnessContextValue | null>(null);

// ==================== Provider ====================

interface FitnessProviderProps {
  children: ReactNode;
}

/**
 * 体能评估 Provider
 * 应该包裹在 App 的认证 Provider 之内
 * 
 * @example
 * ```tsx
 * // App.tsx
 * import { FitnessProvider } from '@/contexts/FitnessContext';
 * 
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <AuthProvider>
 *         <FitnessProvider>
 *           <RouterProvider router={router} />
 *         </FitnessProvider>
 *       </AuthProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 */
export function FitnessProvider({ children }: FitnessProviderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile, isDefault, isLoading, error } = useFitnessProfileWithDefault();

  // 刷新体能画像
  const refetch = useCallback(async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({
      queryKey: fitnessKeys.profile(user.id),
    });
  }, [user?.id, queryClient]);

  // 计算是否已完成评估
  const hasCompletedAssessment = useMemo(() => {
    return !isDefault && !isLoading && !error;
  }, [isDefault, isLoading, error]);

  // Context 值
  const value = useMemo<FitnessContextValue>(() => ({
    profile,
    isDefault,
    isLoading,
    hasCompletedAssessment,
    refetch,
    fitnessLevel: profile.fitnessLevel,
    confidence: profile.confidence,
    overallScore: profile.overallScore,
  }), [profile, isDefault, isLoading, hasCompletedAssessment, refetch]);

  return (
    <FitnessContext.Provider value={value}>
      {children}
    </FitnessContext.Provider>
  );
}

// ==================== Hooks ====================

/**
 * 获取体能评估 Context
 * 
 * @throws 如果在 FitnessProvider 外部使用会抛出错误
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { profile, hasCompletedAssessment, refetch } = useFitnessContext();
 *   
 *   return (
 *     <div>
 *       <p>体能等级: {profile.fitnessLevel}</p>
 *       {!hasCompletedAssessment && (
 *         <Button onClick={() => openQuestionnaire()}>
 *           完成体能评估
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFitnessContext(): FitnessContextValue {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitnessContext must be used within FitnessProvider');
  }
  return context;
}

/**
 * 快速判断是否需要体能评估
 * 用于需要检查但不需要完整 context 的场景
 * 
 * @returns 是否需要评估
 * 
 * @example
 * ```tsx
 * function TripCreationPage() {
 *   const needsAssessment = useNeedsFitnessAssessment();
 *   
 *   useEffect(() => {
 *     if (needsAssessment) {
 *       // 显示评估提示
 *     }
 *   }, [needsAssessment]);
 * }
 * ```
 */
export function useNeedsFitnessAssessment(): boolean {
  const context = useContext(FitnessContext);
  if (!context) {
    // 如果不在 Provider 内，返回 false（保守处理）
    return false;
  }
  return !context.isLoading && context.isDefault;
}

/**
 * 获取用户的推荐参数
 * 
 * @returns 推荐的每日爬升和距离
 */
export function useRecommendedLimits(): {
  dailyAscentM: number;
  dailyDistanceKm: number;
  isDefault: boolean;
} {
  const context = useContext(FitnessContext);
  
  if (!context) {
    // 默认值
    return {
      dailyAscentM: 600,
      dailyDistanceKm: 15,
      isDefault: true,
    };
  }

  return {
    dailyAscentM: context.profile.recommendedDailyAscentM,
    dailyDistanceKm: context.profile.recommendedDailyDistanceKm,
    isDefault: context.isDefault,
  };
}
