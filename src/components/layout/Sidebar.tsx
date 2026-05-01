import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../lib/api';
import { buildSidebarNav } from '../../lib/navConfig';
import { Briefcase, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { viewMode, toggleViewMode } = useNavigation();

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<any>('/company').catch(() => null),
    staleTime: 1000 * 60 * 5,
  });

  const filteredNav = user ? buildSidebarNav({ role: user.role }, viewMode) : [];
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border-color)] bg-surface dark:bg-[var(--bg-primary)] transition-colors lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-[var(--border-color)] px-6">
        <div className="flex items-center gap-3">
          {company?.logoUrl ? (
            <img 
              src={company.logoUrl} 
              alt={company.name || 'Company Logo'} 
              className="h-10 w-10 object-contain"
            />
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}obelisk_white.png`.replace(/\/{2,}/g, '/')}
              alt="Obelisk"
              className={cn('h-10 w-10 object-contain', theme === 'light' && 'invert')}
            />
          )}
          <div>
            <h1 className="font-headline font-semibold text-on-surface dark:text-[var(--text-primary)]">
              {company?.name || 'Obelisk Portal'}
            </h1>
            <p className="text-xs text-on-surface-variant">HR & Payroll</p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle for Admins */}
      {isAdmin && (
        <div className="px-3 py-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 p-1 bg-[var(--bg-secondary)] rounded-lg">
            <button
              onClick={() => viewMode !== 'hr' && toggleViewMode()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'hr'
                  ? 'border border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Briefcase className="w-4 h-4" />
              HR
            </button>
            <button
              onClick={() => viewMode !== 'crm' && toggleViewMode()}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'crm'
                  ? 'border border-primary/20 bg-primary/10 text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <Building2 className="w-4 h-4" />
              CRM
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item, index) => {
          // Add divider before admin-only items if they exist
          const isAdminOnly = item.roles.length === 1 && item.roles[0] === 'admin';
          const prevItem = index > 0 ? filteredNav[index - 1] : null;
          const showDivider = isAdmin && isAdminOnly && prevItem && (prevItem.roles.length > 1 || prevItem.roles[0] !== 'admin');
          
          return (
            <div key={`${item.href}-${item.name}`}>
              {showDivider && (
                <div className="my-2 px-3">
                  <div className="h-px bg-[var(--border-color)]" />
                </div>
              )}
              <NavLink
                to={item.href}
                end={item.end === true}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'border border-primary/20 bg-primary/10 font-semibold text-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-[var(--hover-bg)] hover:text-on-surface'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="text-xs text-[var(--text-muted)] text-center">
          © 2024 Obelisk Portal
        </div>
      </div>
    </aside>
  );
}
