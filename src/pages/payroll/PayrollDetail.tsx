import { useEffect, useState } from 'react';
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

type CalendarHolidayRow = { date: string; name: string; kind: string };

type PayrollInputContext = {
  periodYear: number;
  periodMonth: number;
  holidays: CalendarHolidayRow[];
  workWeekdaysInMonth: number;
  standardWorkdayHours: number;
  employees: { id: string; fullName: string; employeeNumber: string }[];
};

type EmployeeFormRow = { sickDays: string; holidayWorked: Record<string, boolean> };

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

  const { data: inputContext, isLoading: inputContextLoading } = useQuery({
    queryKey: ['payroll-input-context', id],
    queryFn: () => api.get<PayrollInputContext>(`/payroll/runs/${id}/input-context`),
    enabled: !!id && payrollRun?.status === 'draft',
  });

  const [employeeForm, setEmployeeForm] = useState<Record<string, EmployeeFormRow>>({});

  useEffect(() => {
    setEmployeeForm({});
  }, [id]);

  useEffect(() => {
    if (!inputContext?.employees?.length) return;
    setEmployeeForm((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, EmployeeFormRow> = {};
      for (const e of inputContext.employees) {
        const holidayWorked: Record<string, boolean> = {};
        for (const h of inputContext.holidays) holidayWorked[h.date] = true;
        next[e.id] = { sickDays: '0', holidayWorked };
      }
      return next;
    });
  }, [inputContext]);

  const calculateMutation = useMutation({
    mutationFn: () => {
      const employeeInputs: Record<string, { sickDays: number; publicHolidayWorked?: Record<string, boolean> }> = {};
      if (inputContext?.employees) {
        for (const e of inputContext.employees) {
          const row = employeeForm[e.id];
          if (!row) continue;
          const sd = parseFloat(row.sickDays);
          employeeInputs[e.id] = {
            sickDays: Number.isFinite(sd) ? sd : 0,
            publicHolidayWorked: row.holidayWorked,
          };
        }
      }
      return api.post(`/payroll/runs/${id}/calculate`, { employeeInputs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-run', id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips', id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-input-context', id] });
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Payroll {getIndonesianMonth(payrollRun.periodMonth)} {payrollRun.periodYear}
            </h1>
            <p className="text-neutral-500">{payrollRun.notes || 'Monthly payroll'}</p>
            {payrollRun.paymentDate && (
              <p className="text-sm text-neutral-500 mt-1">
                Payment date:{' '}
                <span className="text-[var(--text-primary)]">{payrollRun.paymentDate}</span>
              </p>
            )}
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
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {payrollRun.totalGross ? formatRupiah(parseFloat(payrollRun.totalGross)) : '-'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Total Net</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
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

      {payrollRun.status === 'draft' && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Full-time: holidays & sick days</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-3xl">
              Pay is based on a standard day of {inputContext?.standardWorkdayHours ?? 7.5} hours. Fixed salary and fixed
              allowances are spread across{' '}
              <span className="text-[var(--text-primary)]">{inputContext?.workWeekdaysInMonth ?? '—'}</span> Mon–Fri
              weekdays in this month. Uncheck a public holiday if the employee did not work that day (one day’s pay is
              deducted). Each sick day deducts one day’s pay. Calculate applies these before BPJS and tax.
            </p>
          </div>
          {inputContextLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white" />
            </div>
          ) : !inputContext?.employees?.length ? (
            <p className="text-neutral-500 text-sm">No full-time employees with fixed salary in this payroll run.</p>
          ) : (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="text-left py-2 pr-4 font-medium text-[var(--text-primary)] sticky left-0 z-10 bg-surface-container-lowest dark:bg-[var(--bg-card)]">
                      Employee
                    </th>
                    {inputContext.holidays.map((h) => (
                      <th
                        key={h.date}
                        className="text-center py-2 px-2 font-medium text-[var(--text-primary)] whitespace-nowrap max-w-[7rem]"
                        title={`${h.date} — ${h.name}`}
                      >
                        <span className="block text-xs text-neutral-500">{h.date}</span>
                        <span className="block truncate">{h.name}</span>
                      </th>
                    ))}
                    <th className="text-center py-2 pl-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                      Sick days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inputContext.employees.map((e) => (
                    <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-800/80">
                      <td className="py-3 pr-4 sticky left-0 z-10 bg-surface-container-lowest dark:bg-[var(--bg-card)]">
                        <p className="font-medium text-[var(--text-primary)]">{e.fullName}</p>
                        <p className="text-xs text-neutral-500">{e.employeeNumber}</p>
                      </td>
                      {inputContext.holidays.map((h) => {
                        const worked = employeeForm[e.id]?.holidayWorked[h.date] !== false;
                        return (
                          <td key={h.date} className="text-center py-3 px-1 align-middle">
                            <label
                              className="inline-flex cursor-pointer justify-center"
                              title={worked ? 'Worked this public holiday' : 'Did not work — one day pay deducted'}
                            >
                              <input
                                type="checkbox"
                                className="rounded border-neutral-300 dark:border-neutral-600"
                                checked={worked}
                                aria-label={`${e.fullName} worked on public holiday ${h.date}`}
                                onChange={(ev) => {
                                  const checked = ev.target.checked;
                                  setEmployeeForm((prev) => ({
                                    ...prev,
                                    [e.id]: {
                                      sickDays: prev[e.id]?.sickDays ?? '0',
                                      holidayWorked: {
                                        ...(prev[e.id]?.holidayWorked ?? {}),
                                        [h.date]: checked,
                                      },
                                    },
                                  }));
                                }}
                              />
                            </label>
                          </td>
                        );
                      })}
                      <td className="text-center py-3 pl-4 align-middle">
                        <input
                          type="number"
                          min={0}
                          max={31}
                          step={0.5}
                          className="w-20 rounded-md border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-center text-[var(--text-primary)]"
                          value={employeeForm[e.id]?.sickDays ?? '0'}
                          onChange={(ev) =>
                            setEmployeeForm((prev) => ({
                              ...prev,
                              [e.id]: {
                                holidayWorked: prev[e.id]?.holidayWorked ?? {},
                                sickDays: ev.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inputContext.holidays.length === 0 && (
                <p className="text-xs text-neutral-500 mt-3">
                  No weekday public holidays in the bundled calendar for this month. Sick-day deductions still apply.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {payrollRun.status === 'draft' && (
            <Button
              onClick={() => calculateMutation.mutate()}
              isLoading={calculateMutation.isPending}
              disabled={inputContextLoading}
            >
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
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Employee Payslips</h3>
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
                        <p className="font-medium text-[var(--text-primary)]">{employee.fullName}</p>
                        <p className="text-sm text-neutral-500">{employee.employeeNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatRupiah(parseFloat(payslip.gajiPokok))}</TableCell>
                    <TableCell>{formatRupiah(tunjangan)}</TableCell>
                    <TableCell className="text-neutral-400">-{formatRupiah(bpjsEmployee)}</TableCell>
                    <TableCell className="text-neutral-400">-{formatRupiah(parseFloat(payslip.pph21))}</TableCell>
                    <TableCell className="font-semibold text-[var(--text-primary)]">
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
