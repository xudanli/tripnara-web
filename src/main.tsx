import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/config';
// Import other CSS files first
import './styles/variables.css';
import './styles/responsive.css';
// Import Tailwind CSS last to ensure it has priority
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

