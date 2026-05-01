import type { LucideIcon } from 'lucide-react';
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
  Gift,
  Calendar,
  CalendarDays,
  LogIn,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: ('admin' | 'hr' | 'employee' | 'accountant' | 'client')[];
  /** If true, /reports matches only exactly (not /reports/generated) */
  end?: boolean;
}

const hrNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hr', 'employee', 'client'] },
  { name: 'Holiday calendar', href: '/calendar', icon: CalendarDays, roles: ['admin', 'hr', 'employee', 'accountant'] },
  { name: 'Employees', href: '/employees', icon: Users, roles: ['admin', 'hr'] },
  { name: 'Payroll', href: '/payroll', icon: Wallet, roles: ['admin', 'hr'] },
  { name: 'Expenses', href: '/expenses', icon: Receipt, roles: ['admin', 'hr'] },
  { name: 'Grants', href: '/grants', icon: Gift, roles: ['admin', 'hr'] },
  { name: 'Event grants', href: '/event-grants', icon: Calendar, roles: ['admin', 'hr', 'employee', 'accountant'] },
  { name: 'Contracts', href: '/contracts/management', icon: FileSignature, roles: ['admin', 'hr'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'hr', 'accountant'], end: true },
  { name: 'Generated Reports', href: '/reports/generated', icon: FileCheck, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Invitations', href: '/invitations', icon: UserPlus, roles: ['admin', 'hr'] },
];

const crmNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'hr', 'employee', 'client'] },
  { name: 'Holiday calendar', href: '/calendar', icon: CalendarDays, roles: ['admin', 'hr', 'employee', 'accountant'] },
  { name: 'Clients', href: '/crm/clients', icon: Building2, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Grants', href: '/grants', icon: Gift, roles: ['admin', 'hr'] },
  { name: 'Event grants', href: '/event-grants', icon: Calendar, roles: ['admin', 'hr', 'employee', 'accountant'] },
  { name: 'Contracts', href: '/contracts/management', icon: FileSignature, roles: ['admin', 'hr'] },
  { name: 'Invoices', href: '/invoices', icon: ReceiptText, roles: ['admin', 'hr', 'accountant'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['admin', 'hr', 'accountant'], end: true },
  { name: 'Generated Reports', href: '/reports/generated', icon: FileCheck, roles: ['admin', 'hr', 'accountant'] },
];

const employeeNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['employee'] },
  { name: 'Holiday calendar', href: '/calendar', icon: CalendarDays, roles: ['employee'] },
  { name: 'Event grants', href: '/event-grants', icon: Calendar, roles: ['employee'] },
  { name: 'My Payslips', href: '/my-payslips', icon: CreditCard, roles: ['employee'] },
  { name: 'My Expenses', href: '/my-expenses', icon: Receipt, roles: ['employee'] },
  { name: 'My Contracts', href: '/my-contracts', icon: FileSignature, roles: ['employee'] },
];

const clientNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['client'] },
  { name: 'Contracts', href: '/contracts', icon: FileSignature, roles: ['client'] },
  { name: 'Invoices', href: '/invoices', icon: ReceiptText, roles: ['client'] },
];

const adminOnly: NavItem[] = [
  { name: 'Users', href: '/users', icon: UserCog, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export type UserRole = 'admin' | 'hr' | 'employee' | 'accountant' | 'client';

export interface NavUser {
  role: UserRole;
}

export function buildSidebarNav(user: NavUser, viewMode: 'hr' | 'crm'): NavItem[] {
  if (user.role === 'admin') {
    const viewNav = viewMode === 'hr' ? hrNavigation : crmNavigation;
    return [...viewNav.filter((item) => item.roles.includes('admin')), ...adminOnly.filter((item) => item.roles.includes('admin'))];
  }
  if (user.role === 'hr') return hrNavigation.filter((item) => item.roles.includes('hr'));
  if (user.role === 'employee') return employeeNavigation.filter((item) => item.roles.includes('employee'));
  if (user.role === 'client') return clientNavigation.filter((item) => item.roles.includes('client'));
  if (user.role === 'accountant') return crmNavigation.filter((item) => item.roles.includes('accountant'));
  return [];
}

const primaryHrefsByKey: Record<string, string[]> = {
  'admin-hr': ['/', '/employees', '/payroll', '/expenses'],
  'admin-crm': ['/', '/crm/clients', '/invoices', '/contracts/management'],
  hr: ['/', '/employees', '/payroll', '/expenses'],
  employee: ['/', '/event-grants', '/my-payslips', '/my-expenses'],
  client: ['/', '/contracts', '/invoices'],
  accountant: ['/', '/crm/clients', '/invoices', '/reports'],
};

function primaryHrefsFor(user: NavUser, viewMode: 'hr' | 'crm'): string[] {
  if (user.role === 'admin') return viewMode === 'hr' ? primaryHrefsByKey['admin-hr'] : primaryHrefsByKey['admin-crm'];
  return primaryHrefsByKey[user.role] ?? ['/', '/profile'];
}

/** Bottom tabs = ordered by primaryHrefs; overflow routes open in full-screen “More”. */
export function splitMobileNav(user: NavUser, viewMode: 'hr' | 'crm'): { primary: NavItem[]; more: NavItem[] } {
  const all = buildSidebarNav(user, viewMode);
  const order = primaryHrefsFor(user, viewMode);
  const primary = order
    .map((href) => all.find((i) => i.href === href))
    .filter((x): x is NavItem => x != null);
  const primaryHrefSet = new Set(primary.map((p) => p.href));
  const more = all.filter((i) => !primaryHrefSet.has(i.href));
  return { primary, more };
}

export const publicGrantNav: NavItem[] = [
  { name: 'Grants', href: '/grants', icon: Gift, roles: ['admin', 'hr', 'employee', 'accountant', 'client'] },
  { name: 'Sign in', href: '/login', icon: LogIn, roles: ['admin', 'hr', 'employee', 'accountant', 'client'] },
];
