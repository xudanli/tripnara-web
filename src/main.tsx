import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './i18n/config';
// Import other CSS files first
// variables.css 已整合到 globals.css，不再需要单独导入
import './styles/responsive.css';
// Import Tailwind CSS last to ensure it has priority
import './styles/globals.css';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30秒内不重新获取
      refetchOnWindowFocus: false,
      retry: 1, // 失败后重试1次
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

