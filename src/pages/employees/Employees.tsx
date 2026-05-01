import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Plus, Search, User, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  department: string | null;
  position: string | null;
  status: string;
  joinDate: string;
  compensationCategory?: string | null;
}

export default function Employees() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<Employee | null>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<Employee[]>('/employees'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Employee permanently deleted');
      setDeleteModal(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    },
  });

  const filteredEmployees = employees?.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Employees</h1>
          <p className="text-on-surface-variant">Manage employee records</p>
        </div>
        <Button onClick={() => navigate('/invitations')}>
          <Plus className="w-4 h-4 mr-2" />
          Invite Employee
        </Button>
      </div>

      <Card className="p-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]/50"
            />
          </div>
        </div>

        {/* Table (desktop) + cards (mobile) */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Payroll</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableHeader>
                <TableBody>
                  {filteredEmployees?.map((employee) => (
                    <TableRow
                      key={employee.id}
                      onClick={() => navigate(`/employees/${employee.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)]/12">
                            <User className="h-5 w-5 text-[var(--accent-primary)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{employee.fullName}</p>
                            <p className="text-sm text-on-surface-variant">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{employee.employeeNumber}</span>
                      </TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>{employee.position || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'badge',
                            employee.compensationCategory === 'private_contract'
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-emerald-500/15 text-emerald-200'
                          )}
                        >
                          {employee.compensationCategory === 'private_contract' ? 'Contract' : 'Full-time'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn('badge', getStatusBadgeClass(employee.status))}>
                          {getStatusLabel(employee.status)}
                        </span>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal(employee);
                            }}
                            title="Delete employee"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 lg:hidden">
              {filteredEmployees?.map((employee) => (
                <Card
                  key={employee.id}
                  className="p-4"
                  onClick={() => navigate(`/employees/${employee.id}`)}
                  hover
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/12">
                        <User className="h-5 w-5 text-[var(--accent-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-headline font-semibold text-on-surface">{employee.fullName}</p>
                        <p className="truncate text-sm text-on-surface-variant">{employee.email}</p>
                        <p className="mt-1 font-mono text-xs text-outline">{employee.employeeNumber}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal(employee);
                        }}
                        title="Delete employee"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-outline-variant/50 pt-3 text-sm text-on-surface-variant dark:border-[var(--border-color)]">
                    <span>{employee.department || '—'}</span>
                    <span className="text-outline">·</span>
                    <span>{employee.position || '—'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={cn(
                        'badge',
                        employee.compensationCategory === 'private_contract'
                          ? 'bg-amber-500/15 text-amber-200'
                          : 'bg-emerald-500/15 text-emerald-200'
                      )}
                    >
                      {employee.compensationCategory === 'private_contract' ? 'Contract' : 'Full-time'}
                    </span>
                    <span className={cn('badge', getStatusBadgeClass(employee.status))}>
                      {getStatusLabel(employee.status)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {filteredEmployees?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="mx-auto mb-4 h-12 w-12 text-outline" />
            <p className="text-on-surface-variant">No employees found</p>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Employee"
      >
        {deleteModal && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[var(--text-primary)] font-medium">Are you sure?</p>
                <p className="text-sm text-neutral-400 mt-1">
                  This will permanently delete <strong className="text-[var(--text-primary)]">{deleteModal.fullName}</strong> and all associated data including:
                </p>
                <ul className="text-sm text-neutral-400 mt-2 list-disc list-inside">
                  <li>User login account</li>
                  <li>Salary records</li>
                  <li>Payslips</li>
                  <li>Expense records</li>
                </ul>
                <p className="text-sm text-red-400 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteModal.id)}
                isLoading={deleteMutation.isPending}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
