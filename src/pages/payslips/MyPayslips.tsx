import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatRupiah, getIndonesianMonth } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { FileText, Download, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function MyPayslips() {
  const { user } = useAuth();

  const { data: payslips, isLoading } = useQuery({
    queryKey: ['my-payslips'],
    queryFn: () => api.get<any[]>(`/employees/${user?.employeeId}/payslips`),
    enabled: !!user?.employeeId,
  });

  const downloadPdf = async (payslipId: string) => {
    try {
      const result = await api.get<{ pdfUrl: string }>(`/payslips/${payslipId}/pdf`);
      window.open(result.pdfUrl, '_blank');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  if (!user?.employeeId) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
        <p className="text-neutral-500">Your account is not linked to an employee record</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Payslips</h1>
        <p className="text-neutral-500">Monthly payslip history</p>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
          </div>
        ) : payslips && payslips.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Period</TableHead>
              <TableHead>Gross Salary</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Take Home Pay</TableHead>
              <TableHead></TableHead>
            </TableHeader>
            <TableBody>
              {payslips.map((item: any) => {
                const { payslip, payrollRun } = item;
                return (
                  <TableRow key={payslip.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-[var(--text-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {getIndonesianMonth(payrollRun.periodMonth)} {payrollRun.periodYear}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatRupiah(parseFloat(payslip.grossSalary))}</TableCell>
                    <TableCell className="text-neutral-400">
                      -{formatRupiah(parseFloat(payslip.totalDeductions))}
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--text-primary)]">
                      {formatRupiah(parseFloat(payslip.netSalary))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPdf(payslip.id)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        PDF
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
            <p className="text-neutral-500">No payslips yet</p>
          </div>
        )}
      </Card>

      {/* Latest Payslip Detail */}
      {payslips && payslips.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Latest Payslip Details</h3>
          {(() => {
            const latest = payslips[0];
            const { payslip } = latest;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Earnings */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wider">Earnings</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-300">Base Salary (Gaji Pokok)</span>
                      <span className="text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.gajiPokok))}</span>
                    </div>
                    {parseFloat(payslip.tunjanganTransport || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-300">Transport Allowance</span>
                        <span className="text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.tunjanganTransport))}</span>
                      </div>
                    )}
                    {parseFloat(payslip.tunjanganMakan || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-300">Meal Allowance</span>
                        <span className="text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.tunjanganMakan))}</span>
                      </div>
                    )}
                    {parseFloat(payslip.tunjanganJabatan || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-300">Position Allowance</span>
                        <span className="text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.tunjanganJabatan))}</span>
                      </div>
                    )}
                    {parseFloat(payslip.reimbursements || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-300">Reimbursements</span>
                        <span className="text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.reimbursements))}</span>
                      </div>
                    )}
                    <div className="border-t border-neutral-800 pt-3 flex justify-between">
                      <span className="font-medium text-[var(--text-primary)]">Total Earnings</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatRupiah(parseFloat(payslip.grossSalary))}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-500 mb-4 uppercase tracking-wider">Deductions</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-neutral-300">BPJS Kesehatan</span>
                      <span className="text-neutral-400">-{formatRupiah(parseFloat(payslip.bpjsKesehatanEmployee))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-300">BPJS JHT</span>
                      <span className="text-neutral-400">-{formatRupiah(parseFloat(payslip.bpjsJhtEmployee))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-300">BPJS JP</span>
                      <span className="text-neutral-400">-{formatRupiah(parseFloat(payslip.bpjsJpEmployee))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-300">PPh 21 (Income Tax)</span>
                      <span className="text-neutral-400">-{formatRupiah(parseFloat(payslip.pph21))}</span>
                    </div>
                    <div className="border-t border-neutral-800 pt-3 flex justify-between">
                      <span className="font-medium text-[var(--text-primary)]">Total Deductions</span>
                      <span className="font-semibold text-neutral-400">-{formatRupiah(parseFloat(payslip.totalDeductions))}</span>
                    </div>
                  </div>
                </div>

                {/* Take Home Pay */}
                <div className="md:col-span-2 p-4 bg-white/5 border border-neutral-900 dark:border-white/20 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-[var(--text-primary)]">Take Home Pay</span>
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatRupiah(parseFloat(payslip.netSalary))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </Card>
      )}
    </motion.div>
  );
}
