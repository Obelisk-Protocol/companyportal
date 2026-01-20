import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah, formatDate, getStatusBadgeClass, getStatusLabel, getCategoryLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Plus, Receipt, Trash2, ExternalLink, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const CATEGORY_OPTIONS = [
  { value: 'transport', label: 'Transport' },
  { value: 'meals', label: 'Meals' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'training', label: 'Training' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export default function MyExpenses() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'transport',
    expenseDate: new Date().toISOString().split('T')[0],
    receiptUrl: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: () => api.get<any[]>('/expenses'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api.post('/expenses', {
        ...data,
        amount: parseFloat(data.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-expenses'] });
      toast.success('Expense submitted successfully');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-expenses'] });
      toast.success('Expense deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      category: 'transport',
      expenseDate: new Date().toISOString().split('T')[0],
      receiptUrl: '',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await api.upload<{ url: string }>('/upload/receipt', file);
      setFormData({ ...formData, receiptUrl: result.url });
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">My Expenses</h1>
          <p className="text-neutral-500">Submit reimbursement requests</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
          </div>
        ) : expenses && expenses.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Expense</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {expenses.map((item: any) => {
                const expense = item.expense || item;
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{expense.title}</p>
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
                            onClick={() => deleteMutation.mutate(expense.id)}
                          >
                            <Trash2 className="w-4 h-4 text-neutral-400" />
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
            <p className="text-neutral-500">No expenses yet</p>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Add Expense"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Train ticket Jakarta-Bandung"
            required
          />
          <Input
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (Rp)"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="100000"
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORY_OPTIONS}
            />
          </div>
          <Input
            label="Expense Date"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Receipt (photo/PDF)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-700 border-dashed rounded-lg cursor-pointer hover:border-neutral-900 dark:border-white transition-colors">
                  <Upload className="w-5 h-5 text-neutral-500" />
                  <span className="text-neutral-500">
                    {isUploading ? 'Uploading...' : 'Upload receipt'}
                  </span>
                </div>
              </label>
              {formData.receiptUrl && (
                <a
                  href={formData.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-900 dark:text-white hover:text-neutral-300"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
