import './styles/globals.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import App from './App.jsx';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Root() {
  useEffect(() => {
    window.esportsLogout = () => {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    };
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.4s';
      setTimeout(() => loader.remove(), 400);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

const appEl = document.getElementById('app');
if (appEl) {
  ReactDOM.createRoot(appEl).render(<Root />);
}
