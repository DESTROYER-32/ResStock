import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  console.error('Root element not found in DOM');
}
