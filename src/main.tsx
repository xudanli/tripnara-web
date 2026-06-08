import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { FitnessProvider } from './contexts/FitnessContext';
import { queryClient } from '@/lib/query-client';
import './i18n/config';
// Import other CSS files first
// variables.css 已整合到 globals.css，不再需要单独导入
import './styles/responsive.css';
// Import Tailwind CSS last to ensure it has priority
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FitnessProvider>
        <App />
      </FitnessProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

