/**
 * 可穿戴设备连接 Hook
 * 
 * @module hooks/useWearableConnections
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fitnessAnalyticsApi } from '@/api/fitness-analytics';
import type {
  WearableConnection,
  WearableActivity,
  WearableEstimate,
  WearableProvider,
  SyncRequestParams,
} from '@/types/fitness-analytics';

/** 查询 Key */
export const wearableKeys = {
  all: ['wearable'] as const,
  connections: () => [...wearableKeys.all, 'connections'] as const,
  estimate: () => [...wearableKeys.all, 'estimate'] as const,
  activities: () => [...wearableKeys.all, 'activities'] as const,
};

/**
 * 获取可穿戴设备连接状态
 * 
 * @param enabled - 是否启用查询
 * 
 * @example
 * ```tsx
 * function WearableList() {
 *   const { data: connections, isLoading } = useWearableConnections();
 *   
 *   if (isLoading) return <Spinner />;
 *   
 *   return (
 *     <ul>
 *       {connections.map((conn) => (
 *         <li key={conn.provider}>
 *           {conn.provider}: {conn.connected ? '已连接' : '未连接'}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useWearableConnections(enabled = true) {
  return useQuery<WearableConnection[], Error>({
    queryKey: wearableKeys.connections(),
    queryFn: () => fitnessAnalyticsApi.getWearableConnections(),
    enabled,
    staleTime: 60 * 1000, // 1分钟内不重新请求
    gcTime: 5 * 60 * 1000, // 缓存5分钟
    retry: 2,
  });
}

/**
 * 检查特定设备是否已连接
 */
export function useIsWearableConnected(provider: WearableProvider, enabled = true) {
  const { data, ...rest } = useWearableConnections(enabled);
  
  const connection = data?.find((conn) => conn.provider === provider);
  
  return {
    ...rest,
    isConnected: connection?.connected ?? false,
    lastSyncAt: connection?.lastSyncAt ?? null,
  };
}

/**
 * 获取 Strava 授权 URL
 */
export function useStravaAuth() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fitnessAnalyticsApi.getStravaAuthUrl();
      return response.authUrl;
    },
    onSuccess: (authUrl) => {
      // 在新窗口中打开授权页面
      window.open(authUrl, '_blank', 'width=600,height=800');
    },
    onError: (error: Error) => {
      toast.error('获取授权链接失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 断开 Strava 连接
 */
export function useDisconnectStrava() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => fitnessAnalyticsApi.disconnectStrava(),
    onSuccess: () => {
      // 刷新连接状态
      queryClient.invalidateQueries({ queryKey: wearableKeys.connections() });
      toast.success('已断开 Strava 连接');
    },
    onError: (error: Error) => {
      toast.error('断开连接失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 同步 Strava 数据
 */
export function useSyncStravaData() {
  const queryClient = useQueryClient();
  
  return useMutation<WearableActivity[], Error, SyncRequestParams | undefined>({
    mutationFn: (params) => fitnessAnalyticsApi.syncStravaData(params),
    onSuccess: (activities) => {
      // 刷新相关数据
      queryClient.invalidateQueries({ queryKey: wearableKeys.connections() });
      queryClient.invalidateQueries({ queryKey: wearableKeys.estimate() });
      
      toast.success(`同步成功`, {
        description: `已同步 ${activities.length} 条活动数据`,
      });
    },
    onError: (error: Error) => {
      toast.error('同步失败', {
        description: error.message,
      });
    },
  });
}

/**
 * 获取基于可穿戴数据的体能评估
 */
export function useWearableEstimate(enabled = true) {
  return useQuery<WearableEstimate, Error>({
    queryKey: wearableKeys.estimate(),
    queryFn: () => fitnessAnalyticsApi.getWearableEstimate(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10分钟
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

/**
 * 完整的 Strava 连接管理 Hook
 * 组合了连接状态、授权、断开、同步功能
 */
export function useStravaConnection() {
  const { isConnected, lastSyncAt, isLoading: statusLoading } = useIsWearableConnected('STRAVA');
  const authMutation = useStravaAuth();
  const disconnectMutation = useDisconnectStrava();
  const syncMutation = useSyncStravaData();
  
  return {
    // 状态
    isConnected,
    lastSyncAt,
    isLoading: statusLoading,
    
    // 授权
    authorize: authMutation.mutate,
    isAuthorizing: authMutation.isPending,
    
    // 断开
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    
    // 同步
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    lastSyncResult: syncMutation.data,
  };
}

export default useWearableConnections;
