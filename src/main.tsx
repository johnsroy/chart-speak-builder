
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './components/theme-provider';

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </AuthProvider>
);
