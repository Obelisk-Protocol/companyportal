import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function getIndonesianMonth(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'active':
    case 'approved':
    case 'paid':
    case 'accepted':
      return 'badge-success';
    case 'pending':
    case 'draft':
    case 'calculated':
      return 'badge-warning';
    case 'rejected':
    case 'terminated':
    case 'cancelled':
    case 'expired':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    terminated: 'Terminated',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
    reimbursed: 'Reimbursed',
    draft: 'Draft',
    calculated: 'Calculated',
    accepted: 'Accepted',
    cancelled: 'Cancelled',
    expired: 'Expired',
  };
  return labels[status] || status;
}

export function getPTKPLabel(status: string): string {
  const labels: Record<string, string> = {
    'TK/0': 'Single, 0 Dependents',
    'TK/1': 'Single, 1 Dependent',
    'TK/2': 'Single, 2 Dependents',
    'TK/3': 'Single, 3 Dependents',
    'K/0': 'Married, 0 Dependents',
    'K/1': 'Married, 1 Dependent',
    'K/2': 'Married, 2 Dependents',
    'K/3': 'Married, 3 Dependents',
    'K/I/0': 'Married, Spouse Works, 0 Dependents',
    'K/I/1': 'Married, Spouse Works, 1 Dependent',
    'K/I/2': 'Married, Spouse Works, 2 Dependents',
    'K/I/3': 'Married, Spouse Works, 3 Dependents',
  };
  return labels[status] || status;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    transport: 'Transport',
    meals: 'Meals',
    accommodation: 'Accommodation',
    supplies: 'Supplies',
    training: 'Training',
    medical: 'Medical',
    other: 'Other',
  };
  return labels[category] || category;
}
