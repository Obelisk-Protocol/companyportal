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
          <h1 className="text-2xl font-bold text-white">Employees</h1>
          <p className="text-neutral-500">Manage employee records</p>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Employee</TableHead>
              <TableHead>Employee #</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
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
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{employee.fullName}</p>
                        <p className="text-sm text-neutral-500">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{employee.employeeNumber}</span>
                  </TableCell>
                  <TableCell>{employee.department || '-'}</TableCell>
                  <TableCell>{employee.position || '-'}</TableCell>
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
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredEmployees?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No employees found</p>
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
                <p className="text-white font-medium">Are you sure?</p>
                <p className="text-sm text-neutral-400 mt-1">
                  This will permanently delete <strong className="text-white">{deleteModal.fullName}</strong> and all associated data including:
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
