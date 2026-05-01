import { createContext, useContext, useEffect, ReactNode } from 'react';

/** App uses light theme only; context kept so chart/pages can read a stable `theme` if needed. */
const ThemeContext = createContext<{ theme: 'light' } | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('theme');
    } catch {
      /* ignore */
    }
  }, []);

  return <ThemeContext.Provider value={{ theme: 'light' }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
