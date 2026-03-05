import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, User, ChevronDown, Sun, Moon, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white';
      case 'hr':
        return theme === 'dark' ? 'bg-neutral-700 text-white' : 'bg-neutral-300 text-black';
      default:
        return theme === 'dark' ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'hr':
        return 'HR Manager';
      default:
        return 'Employee';
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/50 backdrop-blur-sm flex items-center justify-between px-6 transition-colors">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Welcome, {user?.employee?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="flex items-center gap-3">
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

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              theme === 'dark' ? 'bg-white' : 'bg-black'
            )}>
              {user?.employee?.avatarUrl ? (
                <img
                  src={user.employee.avatarUrl}
                  alt={user.employee.fullName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className={cn("w-5 h-5", theme === 'dark' ? 'text-black' : 'text-white')} />
              )}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {user?.employee?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}
              </p>
              <span className={cn('badge text-xs', getRoleBadge(user?.role || ''))}>
                {getRoleLabel(user?.role || '')}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden">
                <button
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
      </div>
    </header>
  );
}
