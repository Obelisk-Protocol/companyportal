import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah, getIndonesianMonth, getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { ArrowLeft, Calculator, CheckCircle, CreditCard, FileText, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function PayrollDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: payrollRun, isLoading: runLoading } = useQuery({
    queryKey: ['payroll-run', id],
    queryFn: () => api.get<any>(`/payroll/runs/${id}`),
  });

  const { data: payslips, isLoading: payslipsLoading } = useQuery({
    queryKey: ['payroll-payslips', id],
    queryFn: () => api.get<any[]>(`/payroll/runs/${id}/payslips`),
  });

  const calculateMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${id}/calculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips', id] });
      toast.success('Payroll calculated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to calculate payroll');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', id] });
      toast.success('Payroll approved successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to approve payroll');
    },
  });

  const payMutation = useMutation({
    mutationFn: () => api.post(`/payroll/runs/${id}/pay`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', id] });
      toast.success('Payroll marked as paid');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to mark payroll as paid');
    },
  });

  const downloadPdf = async (payslipId: string) => {
    try {
      const result = await api.get<{ pdfUrl: string }>(`/payslips/${payslipId}/pdf`);
      window.open(result.pdfUrl, '_blank');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  if (runLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  if (!payrollRun) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Payroll run not found</p>
        <Button onClick={() => navigate('/payroll')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/payroll')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Payroll {getIndonesianMonth(payrollRun.periodMonth)} {payrollRun.periodYear}
            </h1>
            <p className="text-neutral-500">{payrollRun.notes || 'Monthly payroll'}</p>
          </div>
        </div>
        <span className={cn('badge', getStatusBadgeClass(payrollRun.status))}>
          {getStatusLabel(payrollRun.status)}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Gross</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {payrollRun.totalGross ? formatRupiah(parseFloat(payrollRun.totalGross)) : '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Net</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">
            {payrollRun.totalNet ? formatRupiah(parseFloat(payrollRun.totalNet)) : '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">PPh 21</p>
          <p className="text-xl font-bold text-neutral-400">
            {payrollRun.totalPph21 ? formatRupiah(parseFloat(payrollRun.totalPph21)) : '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">BPJS Total</p>
          <p className="text-xl font-bold text-neutral-400">
            {payrollRun.totalBpjsEmployee
              ? formatRupiah(parseFloat(payrollRun.totalBpjsEmployee) + parseFloat(payrollRun.totalBpjsEmployer || 0))
              : '-'}
          </p>
        </Card>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {payrollRun.status === 'draft' && (
            <Button onClick={() => calculateMutation.mutate()} isLoading={calculateMutation.isPending}>
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Payroll
            </Button>
          )}
          {payrollRun.status === 'calculated' && (
            <Button onClick={() => approveMutation.mutate()} isLoading={approveMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Payroll
            </Button>
          )}
          {payrollRun.status === 'approved' && (
            <Button onClick={() => payMutation.mutate()} isLoading={payMutation.isPending}>
              <CreditCard className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </Card>

      {/* Payslips Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Employee Payslips</h3>
        {payslipsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
          </div>
        ) : payslips && payslips.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Employee</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Allowances</TableHead>
              <TableHead>BPJS</TableHead>
              <TableHead>PPh 21</TableHead>
              <TableHead>Take Home Pay</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {payslips.map((item: any) => {
                const { payslip, employee } = item;
                const tunjangan =
                  parseFloat(payslip.tunjanganTransport || 0) +
                  parseFloat(payslip.tunjanganMakan || 0) +
                  parseFloat(payslip.tunjanganKomunikasi || 0) +
                  parseFloat(payslip.tunjanganJabatan || 0) +
                  parseFloat(payslip.tunjanganLainnya || 0);
                const bpjsEmployee =
                  parseFloat(payslip.bpjsKesehatanEmployee) +
                  parseFloat(payslip.bpjsJhtEmployee) +
                  parseFloat(payslip.bpjsJpEmployee);

                return (
                  <TableRow key={payslip.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white">{employee.fullName}</p>
                        <p className="text-sm text-neutral-500">{employee.employeeNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatRupiah(parseFloat(payslip.gajiPokok))}</TableCell>
                    <TableCell>{formatRupiah(tunjangan)}</TableCell>
                    <TableCell className="text-neutral-400">-{formatRupiah(bpjsEmployee)}</TableCell>
                    <TableCell className="text-neutral-400">-{formatRupiah(parseFloat(payslip.pph21))}</TableCell>
                    <TableCell className="font-semibold text-neutral-900 dark:text-white">
                      {formatRupiah(parseFloat(payslip.netSalary))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPdf(payslip.id)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">
              {payrollRun.status === 'draft'
                ? 'Click "Calculate Payroll" to generate payslips'
                : 'No payslips found'}
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
