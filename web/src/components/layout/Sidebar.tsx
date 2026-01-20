import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  FileText,
  Settings,
  UserPlus,
  CreditCard,
  UserCog,
  FileCheck,
  Building2,
  FileSignature,
  ReceiptText,
  Briefcase,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// HR Navigation Items
const hrNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hr', 'employee', 'client'] },
  { name: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'hr'] },
  { name: 'Payroll', href: '/payroll', icon: Wallet, roles: ['admin', 'hr'] },
  { name: 'Expenses', href: '/expenses', icon: Receipt, roles: ['admin', 'hr'] },
  { name: 'Contracts', href: '/contracts/management', icon: FileSignature, roles: ['admin', 'hr'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Generated Reports', href: '/reports/generated', icon: FileCheck, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Invitations', href: '/invitations', icon: UserPlus, roles: ['admin', 'hr'] },
];

// CRM Navigation Items
const crmNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hr', 'employee', 'client'] },
  { name: 'Clients', href: '/crm/clients', icon: Building2, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Contracts', href: '/contracts/management', icon: FileSignature, roles: ['admin', 'hr'] },
  { name: 'Invoices', href: '/invoices', icon: ReceiptText, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Generated Reports', href: '/reports/generated', icon: FileCheck, roles: ['admin', 'hr', 'accountant'] },
];

// Employee Navigation Items
const employeeNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['employee'] },
  { name: 'My Payslips', href: '/my-payslips', icon: CreditCard, roles: ['employee'] },
  { name: 'My Expenses', href: '/my-expenses', icon: Receipt, roles: ['employee'] },
  { name: 'My Contracts', href: '/my-contracts', icon: FileSignature, roles: ['employee'] },
];

// Client Navigation Items
const clientNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['client'] },
  { name: 'Contracts', href: '/contracts', icon: FileSignature, roles: ['client'] },
  { name: 'Invoices', href: '/invoices', icon: ReceiptText, roles: ['client'] },
];

// Admin-only items (always visible for admins)
const adminNavigation = [
  { name: 'Users', href: '/users', icon: UserCog, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { viewMode, toggleViewMode } = useNavigation();

  // Fetch company data for logo
  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<any>('/company').catch(() => null),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Determine which navigation to show based on role and view mode
  const getNavigationItems = () => {
    if (!user) return [];

    // Admin can toggle between HR and CRM views
    if (user.role === 'admin') {
      const viewNav = viewMode === 'hr' ? hrNavigation : crmNavigation;
      return [
        ...viewNav.filter(item => item.roles.includes('admin')),
        ...adminNavigation.filter(item => item.roles.includes('admin')),
      ];
    }

    // HR sees HR navigation
    if (user.role === 'hr') {
      return hrNavigation.filter(item => item.roles.includes('hr'));
    }

    // Employee sees employee navigation
    if (user.role === 'employee') {
      return employeeNavigation.filter(item => item.roles.includes('employee'));
    }

    // Client sees client navigation
    if (user.role === 'client') {
      return clientNavigation.filter(item => item.roles.includes('client'));
    }

    // Accountant sees CRM navigation
    if (user.role === 'accountant') {
      return crmNavigation.filter(item => item.roles.includes('accountant'));
    }

    return [];
  };

  const filteredNav = getNavigationItems();
  const isAdmin = user?.role === 'admin';

  return (
    <aside className="w-64 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col transition-colors">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          {company?.logoUrl ? (
            <img 
              src={company.logoUrl} 
              alt={company.name || 'Company Logo'} 
              className="h-10 w-10 object-contain"
            />
          ) : (
            <img 
              src="/obelisk_white.png" 
              alt="Obelisk" 
              className={cn("w-10 h-10", theme === 'light' && 'invert')}
            />
          )}
          <div>
            <h1 className="font-semibold text-[var(--text-primary)]">
              {company?.name || 'Obelisk Portal'}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">HR & Payroll</p>
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
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
                end={item.href === '/reports'} // Only match exactly for /reports, not /reports/generated
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? theme === 'dark' 
                        ? 'bg-white text-black' 
                        : 'bg-black text-white'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
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
