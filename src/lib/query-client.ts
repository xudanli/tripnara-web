import { QueryClient } from '@tanstack/react-query';

/** 应用级 React Query 单例（供非 React 模块如 Axios 拦截器使用） */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
