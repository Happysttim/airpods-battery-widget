import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/themes';
import App from './App';

import '@/styles/globals.css';

const root = createRoot(document.getElementById('root') as Element);
root.render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <App />
    </ThemeProvider>
  </StrictMode>,
);
