import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../lib/api';
import { LogOut, User, ChevronDown, Sun, Moon, Settings, Briefcase, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const defaultLogoSrc = `${import.meta.env.BASE_URL}obelisk_white.png`.replace(/\/{2,}/g, '/');

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { viewMode, toggleViewMode } = useNavigation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<any>('/company').catch(() => null),
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/15 text-primary border border-primary/25';
      case 'hr':
        return 'bg-secondary-container/90 text-secondary border border-secondary/30';
      default:
        return 'bg-surface-container-high text-on-surface-variant border border-outline-variant/80';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'hr':
        return 'HR Manager';
      case 'accountant':
        return 'Accountant';
      case 'client':
        return 'Client';
      case 'employee':
        return 'Employee';
      default:
        return 'User';
    }
  };

  return (
    <header className="flex min-h-16 shrink-0 flex-col gap-2 border-b border-[var(--border-color)] bg-surface/80 backdrop-blur-md dark:bg-[var(--bg-primary)]/90 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0 px-4 py-2 sm:px-6 transition-colors">
      {!user && location.pathname.startsWith('/grants') && (
        <div className="flex-1 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">Grant transparency</h2>
          <p className="text-xs text-[var(--text-muted)]">Public funding overview</p>
        </div>
      )}
      {user?.role === 'admin' && (
        <div className="flex lg:hidden w-full max-w-xs">
          <div className="flex flex-1 items-center gap-1 p-0.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => viewMode !== 'hr' && toggleViewMode()}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all',
                viewMode === 'hr'
                  ? 'border border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'text-on-surface-variant'
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              HR
            </button>
            <button
              type="button"
              onClick={() => viewMode !== 'crm' && toggleViewMode()}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all',
                viewMode === 'crm'
                  ? 'border border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'text-on-surface-variant'
              )}
            >
              <Building2 className="w-3.5 h-3.5" />
              CRM
            </button>
          </div>
        </div>
      )}
      {user && (
        <div className="flex flex-1 min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || 'Company'}
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
              />
            ) : (
              <img
                src={defaultLogoSrc}
                alt="Obelisk"
                className={cn('h-9 w-9 object-contain sm:h-10 sm:w-10', theme === 'light' && 'invert')}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] truncate">
              Welcome, {user.employee?.fullName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] hidden sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-center">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-[var(--text-secondary)]" />
          ) : (
            <Moon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </button>

        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20 sm:h-10 sm:w-10'
                )}
              >
                {user.employee?.avatarUrl ? (
                  <img
                    src={user.employee.avatarUrl}
                    alt={user.employee.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {user.employee?.fullName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}
                </p>
                <span className={cn('badge text-xs', getRoleBadge(user.role))}>{getRoleLabel(user.role)}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors border-t border-[var(--border-color)]"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary shadow-sm transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
