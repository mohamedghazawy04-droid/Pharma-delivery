import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully suppress harmless Vite HMR WebSocket errors in cloud/iframe preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    const err = String(event?.error || '');
    if (
      msg.includes('WebSocket') ||
      msg.includes('ws') ||
      err.includes('WebSocket')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '');
    if (reason.includes('WebSocket') || reason.includes('ws')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
