import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { runAuthApiSelfTests } from './api/authApiSelfTests';
import { AuthProvider } from './auth/AuthContext';
import App from './App';
import './index.css';

if (import.meta.env.DEV) {
  window.__QT_RUN_AUTH_API_TESTS__ = runAuthApiSelfTests;
  console.info(
    '[QT] Console test: await window.__QT_RUN_AUTH_API_TESTS__() — kiểm tra /api/auth qua URL hiện tại (proxy).',
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
