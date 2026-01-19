import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah, formatDate, getStatusBadgeClass, getStatusLabel, getCategoryLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Receipt, Check, X, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Expenses() {
  const queryClient = useQueryClient();
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', filter],
    queryFn: () => api.get<any[]>(filter === 'pending' ? '/expenses/pending' : '/expenses'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      api.post(`/expenses/${id}/review`, { status, reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense reviewed successfully');
      setSelectedExpense(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to review expense');
    },
  });

  const handleApprove = (id: string) => {
    reviewMutation.mutate({ id, status: 'approved', notes: reviewNotes });
  };

  const handleReject = (id: string) => {
    if (!reviewNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    reviewMutation.mutate({ id, status: 'rejected', notes: reviewNotes });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-neutral-500">Review and manage employee expenses</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'pending' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          Pending Review
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : expenses && expenses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Employee</TableHead>
              <TableHead>Expense</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {expenses.map((item: any) => {
                const { expense, employee } = item;
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{employee.fullName}</p>
                        <p className="text-sm text-neutral-500">{employee.employeeNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{expense.title}</p>
                        {expense.description && (
                          <p className="text-sm text-neutral-500 truncate max-w-xs">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-info">
                        {getCategoryLabel(expense.category)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatRupiah(parseFloat(expense.amount))}
                    </TableCell>
                    <TableCell>
                      <span className={cn('badge', getStatusBadgeClass(expense.status))}>
                        {getStatusLabel(expense.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {expense.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(expense.receiptUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        {expense.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedExpense(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">
              {filter === 'pending' ? 'No expenses pending review' : 'No expenses found'}
            </p>
          </div>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedExpense}
        onClose={() => {
          setSelectedExpense(null);
          setReviewNotes('');
        }}
        title="Review Expense"
        size="lg"
      >
        {selectedExpense && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500">Employee</p>
                <p className="text-white font-medium">{selectedExpense.employee.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Amount</p>
                <p className="text-white font-semibold text-lg">
                  {formatRupiah(parseFloat(selectedExpense.expense.amount))}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Title</p>
                <p className="text-white">{selectedExpense.expense.title}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Category</p>
                <p className="text-white">{getCategoryLabel(selectedExpense.expense.category)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Date</p>
                <p className="text-white">{formatDate(selectedExpense.expense.expenseDate)}</p>
              </div>
              {selectedExpense.expense.description && (
                <div className="col-span-2">
                  <p className="text-sm text-neutral-500">Description</p>
                  <p className="text-white">{selectedExpense.expense.description}</p>
                </div>
              )}
            </div>

            {selectedExpense.expense.receiptUrl && (
              <div>
                <p className="text-sm text-neutral-500 mb-2">Receipt</p>
                <a
                  href={selectedExpense.expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white hover:text-neutral-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Receipt
                </a>
              </div>
            )}

            <Input
              label="Review Notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Notes or reason for rejection..."
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="danger"
                onClick={() => handleReject(selectedExpense.expense.id)}
                isLoading={reviewMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(selectedExpense.expense.id)}
                isLoading={reviewMutation.isPending}
              >
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
