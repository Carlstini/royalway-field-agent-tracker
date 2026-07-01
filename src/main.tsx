import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupSandboxFetch } from './lib/sandboxFetch';

// Initialize the sandbox fetch interceptor (it will only intercept if isSandboxActive() is true)
setupSandboxFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

