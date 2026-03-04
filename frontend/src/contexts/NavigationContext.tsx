import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type ViewMode = 'hr' | 'crm';

interface NavigationContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('navigationViewMode') as ViewMode;
    return saved || 'hr';
  });

  useEffect(() => {
    localStorage.setItem('navigationViewMode', viewMode);
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'hr' ? 'crm' : 'hr');
  };

  return (
    <NavigationContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
