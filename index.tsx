import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Ignorar erro benigno do WebSocket do Vite que costuma aparecer como overlay no ambiente de dev
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);