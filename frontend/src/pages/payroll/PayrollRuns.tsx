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
  });

  const { data: payrollRuns, isLoading } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => api.get<any[]>('/payroll/runs'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newRun) => api.post('/payroll/runs', data),
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
          <p className="text-neutral-500">Manage monthly payroll runs</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Payroll
        </Button>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
          </div>
        ) : (
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
                <TableRow
                  key={run.id}
                  onClick={() => navigate(`/payroll/${run.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-[var(--text-primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {getIndonesianMonth(run.periodMonth)} {run.periodYear}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {run.notes || 'Monthly payroll'}
                        </p>
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
        )}

        {payrollRuns?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No payroll runs yet</p>
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
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Month</label>
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
