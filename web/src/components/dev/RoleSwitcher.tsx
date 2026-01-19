import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'hr', label: 'HR Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'client', label: 'Client' },
] as const;

export default function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!switchRole) {
    return null; // Only show in development
  }

  const currentRole = user?.role || 'employee';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)]',
            'flex items-center justify-center shadow-lg hover:shadow-xl transition-all',
            'text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
          )}
          title="Switch Role (Test Mode)"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute bottom-16 right-0 w-56 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-[var(--border-color)]">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Test Mode: Switch Role</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Current: {ROLES.find(r => r.value === currentRole)?.label}</p>
              </div>
              <div className="py-2">
                {ROLES.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => {
                      switchRole(role.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm transition-colors',
                      'hover:bg-[var(--hover-bg)]',
                      currentRole === role.value
                        ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {role.label}
                    {currentRole === role.value && (
                      <span className="ml-2 text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
              {user && (
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    ⚠️ Test mode active
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
