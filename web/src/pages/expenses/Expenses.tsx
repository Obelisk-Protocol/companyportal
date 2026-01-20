import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah, formatDate, getStatusBadgeClass, getStatusLabel, getCategoryLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Plus, Receipt, Check, X, Eye, ExternalLink, Upload } from 'lucide-react';
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

export default function Expenses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [hoveredReceipt, setHoveredReceipt] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    description: '',
    amount: '',
    category: 'transport',
    expenseDate: new Date().toISOString().split('T')[0],
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', filter],
    queryFn: () => api.get<any[]>(filter === 'pending' ? '/expenses/pending' : '/expenses'),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<any[]>('/employees'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { formData: any; file: File | null }) => {
      let receiptUrl = '';
      
      // Upload receipt first if file exists
      if (data.file) {
        setIsUploading(true);
        try {
          const uploadResult = await api.upload<{ url: string }>('/upload/receipt', data.file);
          receiptUrl = uploadResult.url;
        } catch (error) {
          setIsUploading(false);
          throw new Error('Failed to upload receipt');
        } finally {
          setIsUploading(false);
        }
      }
      
      // Then create the expense
      return api.post('/expenses', {
        ...data.formData,
        amount: parseFloat(data.formData.amount),
        employeeId: data.formData.employeeId || undefined,
        title: data.formData.title || `${getCategoryLabel(data.formData.category)} Expense`,
        receiptUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense created successfully');
      setIsSuccess(true);
      setReceiptFile(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create expense');
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: user?.employeeId || '',
      title: '',
      description: '',
      amount: '',
      category: 'transport',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    setReceiptFile(null);
  };

  // Set default employee when modal opens
  useEffect(() => {
    if (isCreateModalOpen && user?.employeeId && !formData.employeeId) {
      setFormData(prev => ({ ...prev, employeeId: user.employeeId || '' }));
    }
  }, [isCreateModalOpen, user?.employeeId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      api.post(`/expenses/${id}/review`, { status, reviewNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Expenses</h1>
          <p className="text-neutral-500">Review and manage employee expenses</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
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
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
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
                        <p className="font-medium text-neutral-900 dark:text-white">{employee.fullName}</p>
                        <p className="text-sm text-neutral-500">{employee.employeeNumber}</p>
                      </div>
                    </TableCell>
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
                          <div className="relative group">
                            <img
                              src={expense.receiptUrl}
                              alt="Receipt"
                              className="w-12 h-12 object-cover rounded border border-[var(--border-color)] cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setReceiptModalUrl(expense.receiptUrl)}
                              onMouseEnter={(e) => {
                                setHoveredReceipt(expense.receiptUrl);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
                              }}
                              onMouseLeave={() => {
                                setHoveredReceipt(null);
                                setHoverPosition(null);
                              }}
                            />
                          </div>
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
                <p className="text-[var(--text-primary)] font-medium">{selectedExpense.employee.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Amount</p>
                <p className="text-[var(--text-primary)] font-semibold text-lg">
                  {formatRupiah(parseFloat(selectedExpense.expense.amount))}
                </p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Title</p>
                <p className="text-[var(--text-primary)]">{selectedExpense.expense.title}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Category</p>
                <p className="text-[var(--text-primary)]">{getCategoryLabel(selectedExpense.expense.category)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Date</p>
                <p className="text-[var(--text-primary)]">{formatDate(selectedExpense.expense.expenseDate)}</p>
              </div>
              {selectedExpense.expense.description && (
                <div className="col-span-2">
                  <p className="text-sm text-neutral-500">Description</p>
                  <p className="text-[var(--text-primary)]">{selectedExpense.expense.description}</p>
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
                  className="inline-flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
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

      {/* Create Expense Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
          setIsSuccess(false);
        }}
        title={isSuccess ? "Expense Added Successfully" : "Add Expense"}
        size="lg"
      >
        {isSuccess ? (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Expense Added!</h3>
              <p className="text-neutral-400">
                The expense has been successfully added for {employees?.find((e: any) => e.id === formData.employeeId)?.fullName || 'the employee'}.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsSuccess(false);
                }}
              >
                Add Another
              </Button>
              <Button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                  setIsSuccess(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!receiptFile) {
                toast.error('Please select a receipt');
                return;
              }
              if (!formData.amount) {
                toast.error('Please enter an amount');
                return;
              }
              // Use logged-in user's employeeId if not selected
              const employeeId = formData.employeeId || user?.employeeId;
              if (!employeeId) {
                toast.error('No employee profile found. Please select an employee.');
                return;
              }
              createMutation.mutate({ formData: { ...formData, employeeId }, file: receiptFile });
            }}
            className="space-y-6"
          >
            <Select
              label="Employee"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              required
              options={[
                { value: '', label: 'Select an employee' },
                ...(employees?.map((emp: any) => ({
                  value: emp.id,
                  label: `${emp.fullName} (${emp.employeeNumber})${emp.id === user?.employeeId ? ' - You' : ''}`,
                })) || []),
              ]}
            />

            {/* Step 1: Select Receipt */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Receipt (photo/PDF) *
              </label>
              <div className="space-y-3">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-3 px-6 py-8 bg-neutral-900 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-neutral-900 dark:border-white transition-colors">
                    {receiptFile ? (
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-neutral-900 dark:text-white">{receiptFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReceiptFile(null);
                          }}
                          className="text-neutral-400 hover:text-neutral-900 dark:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-neutral-500" />
                        <span className="text-neutral-400">Click to select receipt</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Step 2: Expense Type */}
            <Select
              label="Expense Type / Category *"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              options={CATEGORY_OPTIONS}
            />

            {/* Step 3: Amount */}
            <Input
              label="Amount (Rp) *"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="100000"
              required
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={createMutation.isPending || isUploading}
                disabled={!receiptFile || !formData.amount}
              >
                {isUploading ? 'Uploading...' : 'Submit'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={!!receiptModalUrl}
        onClose={() => setReceiptModalUrl(null)}
        title="Receipt"
        size="xl"
      >
        {receiptModalUrl && (
          <div className="flex justify-center">
            <img
              src={receiptModalUrl}
              alt="Receipt"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        )}
      </Modal>

      {/* Hover Preview - Fixed position outside component */}
      {hoveredReceipt && hoverPosition && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y - 400}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative">
            <img
              src={hoveredReceipt}
              alt="Receipt preview"
              className="w-96 h-96 object-contain rounded-lg border-2 border-[var(--border-color)] shadow-2xl bg-[var(--bg-card)]"
            />
            {/* Arrow pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent"
              style={{ borderTopColor: 'var(--border-color)' }}
            ></div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
