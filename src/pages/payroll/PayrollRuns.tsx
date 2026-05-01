import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRupiah, getIndonesianMonth, getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Plus, Calendar, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function PayrollRuns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRun, setNewRun] = useState({
    periodMonth: new Date().getMonth() + 1,
    periodYear: new Date().getFullYear(),
    notes: '',
    paymentDate: '' as string,
  });

  const { data: payrollRuns, isLoading } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => api.get<any[]>('/payroll/runs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newRun) =>
      api.post('/payroll/runs', {
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
        notes: data.notes || undefined,
        paymentDate: data.paymentDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll run created successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create payroll run');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Payroll</h1>
          <p className="text-on-surface-variant">Manage monthly payroll runs</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Payroll
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Gross</TableHead>
                  <TableHead>Total Net</TableHead>
                  <TableHead>PPh 21</TableHead>
                  <TableHead>BPJS</TableHead>
                </TableHeader>
                <TableBody>
                  {payrollRuns?.map((run) => (
                    <TableRow key={run.id} onClick={() => navigate(`/payroll/${run.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-primary)]/12">
                            <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">
                              {getIndonesianMonth(run.periodMonth)} {run.periodYear}
                            </p>
                            <p className="text-sm text-on-surface-variant">{run.notes || 'Monthly payroll'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn('badge', getStatusBadgeClass(run.status))}>
                          {getStatusLabel(run.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {run.totalGross ? formatRupiah(parseFloat(run.totalGross)) : '-'}
                      </TableCell>
                      <TableCell>
                        {run.totalNet ? formatRupiah(parseFloat(run.totalNet)) : '-'}
                      </TableCell>
                      <TableCell>
                        {run.totalPph21 ? formatRupiah(parseFloat(run.totalPph21)) : '-'}
                      </TableCell>
                      <TableCell>
                        {run.totalBpjsEmployee
                          ? formatRupiah(parseFloat(run.totalBpjsEmployee) + parseFloat(run.totalBpjsEmployer || 0))
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {payrollRuns?.map((run) => (
                <Card
                  key={run.id}
                  className="p-4"
                  hover
                  onClick={() => navigate(`/payroll/${run.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/12">
                      <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-headline font-semibold text-on-surface">
                        {getIndonesianMonth(run.periodMonth)} {run.periodYear}
                      </p>
                      <p className="text-sm text-on-surface-variant">{run.notes || 'Monthly payroll'}</p>
                      <div className="mt-2">
                        <span className={cn('badge', getStatusBadgeClass(run.status))}>
                          {getStatusLabel(run.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant/50 pt-3 text-sm dark:border-[var(--border-color)]">
                    <div>
                      <p className="text-xs text-on-surface-variant">Gross</p>
                      <p className="font-medium">{run.totalGross ? formatRupiah(parseFloat(run.totalGross)) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Net</p>
                      <p className="font-medium">{run.totalNet ? formatRupiah(parseFloat(run.totalNet)) : '—'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {payrollRuns?.length === 0 && !isLoading && (
          <div className="py-12 text-center">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-outline" />
            <p className="text-on-surface-variant">No payroll runs yet</p>
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Payroll"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(newRun);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-on-surface-variant">Month</label>
              <select
                value={newRun.periodMonth}
                onChange={(e) => setNewRun({ ...newRun, periodMonth: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getIndonesianMonth(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Year"
              type="number"
              value={newRun.periodYear}
              onChange={(e) => setNewRun({ ...newRun, periodYear: parseInt(e.target.value) })}
              required
            />
          </div>
          <Input
            label="Notes (optional)"
            value={newRun.notes}
            onChange={(e) => setNewRun({ ...newRun, notes: e.target.value })}
            placeholder="Additional notes..."
          />
          <Input
            label="Payment date (optional)"
            type="date"
            value={newRun.paymentDate}
            onChange={(e) => setNewRun({ ...newRun, paymentDate: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
