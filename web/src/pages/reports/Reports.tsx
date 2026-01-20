import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatRupiah, getIndonesianMonth, getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { FileText, Download, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-hot-toast';

type ReportType = 'pph21' | 'bpjs' | 'summary' | 'expenses';

export default function Reports() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const isAccountant = user?.role === 'accountant';

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['report-summary', year],
    queryFn: () => api.get<any>(`/reports/payroll-summary?year=${year}`),
    enabled: reportType === 'summary',
  });

  const { data: pph21Data, isLoading: pph21Loading } = useQuery({
    queryKey: ['report-pph21', month, year],
    queryFn: () => api.get<any>(`/reports/pph21/monthly?month=${month}&year=${year}`),
    enabled: reportType === 'pph21',
  });

  const { data: bpjsData, isLoading: bpjsLoading } = useQuery({
    queryKey: ['report-bpjs', month, year],
    queryFn: () => api.get<any>(`/reports/bpjs/monthly?month=${month}&year=${year}`),
    enabled: reportType === 'bpjs',
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses-report', month, year],
    queryFn: () => api.get<any[]>('/expenses'),
    enabled: reportType === 'expenses',
  });

  const generateSPTPdfMutation = useMutation({
    mutationFn: () => api.get<{ pdfUrl: string }>(`/reports/pph21/monthly/pdf?month=${month}&year=${year}`),
    onSuccess: (data) => {
      window.open(data.pdfUrl, '_blank');
      toast.success('SPT Masa PPh 21 PDF generated');
    },
    onError: () => {
      toast.error('Failed to generate PDF');
    },
  });

  const generateBuktiPotongMutation = useMutation({
    mutationFn: (employeeId: string) => api.get<{ pdfUrl: string }>(`/reports/pph21/bukti-potong/${employeeId}/pdf?year=${year}`),
    onSuccess: (data) => {
      window.open(data.pdfUrl, '_blank');
      toast.success('Bukti Potong 1721-A1 PDF generated');
    },
    onError: () => {
      toast.error('Failed to generate PDF');
    },
  });

  const chartData = summaryData?.monthlyData?.map((m: any) => ({
    name: getIndonesianMonth(m.month).substring(0, 3),
    Gross: m.totalGross / 1000000,
    Net: m.totalNet / 1000000,
    PPh21: m.totalPph21 / 1000000,
  })) || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
        <p className="text-[var(--text-secondary)]">Tax and BPJS reports</p>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={reportType === 'summary' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setReportType('summary')}
        >
          Annual Summary
        </Button>
        <Button
          variant={reportType === 'pph21' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setReportType('pph21')}
        >
          Monthly PPh 21
        </Button>
        <Button
          variant={reportType === 'bpjs' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setReportType('bpjs')}
        >
          Monthly BPJS
        </Button>
      </div>

      {/* Period Selector */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {reportType !== 'summary' && (
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getIndonesianMonth(i + 1)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Report */}
      {reportType === 'summary' && (
        <>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
          ) : summaryData ? (
            <>
              {/* Annual Totals */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total Gross</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{summaryData.annualTotals.totalGrossFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total Net</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{summaryData.annualTotals.totalNetFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total PPh 21</p>
                  <p className="text-xl font-bold text-neutral-400">{summaryData.annualTotals.totalPph21Formatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total BPJS</p>
                  <p className="text-xl font-bold text-neutral-300">
                    {formatRupiah(summaryData.annualTotals.totalBpjsEmployee + summaryData.annualTotals.totalBpjsEmployer)}
                  </p>
                </Card>
              </div>

              {/* Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Monthly Trend</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke={theme === 'dark' ? '#525252' : '#a3a3a3'} fontSize={12} />
                      <YAxis stroke={theme === 'dark' ? '#525252' : '#a3a3a3'} fontSize={12} tickFormatter={(v) => `${v}M`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
                          border: theme === 'dark' ? '1px solid #262626' : '1px solid #e5e5e5',
                          borderRadius: '8px',
                          color: theme === 'dark' ? '#ffffff' : '#0a0a0a',
                        }}
                        formatter={(value: number) => [`Rp ${value.toFixed(0)} million`, '']}
                      />
                      <Legend />
                      <Bar dataKey="Gross" fill={theme === 'dark' ? '#ffffff' : '#0a0a0a'} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Net" fill="#a3a3a3" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="PPh21" fill="#525252" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No data available for this period</p>
            </Card>
          )}
        </>
      )}

      {/* PPh 21 Report */}
      {reportType === 'pph21' && (
        <>
          {pph21Loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
          ) : pph21Data ? (
            <>
              {isAccountant && (
                <div className="flex justify-end mb-4">
                  <Button
                    onClick={() => generateSPTPdfMutation.mutate()}
                    isLoading={generateSPTPdfMutation.isPending}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download SPT Masa PPh 21 (Form 1721)
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total Employees</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{pph21Data.summary.totalEmployees}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total Gross</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{pph21Data.summary.totalGrossFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total PPh 21</p>
                  <p className="text-xl font-bold text-neutral-400">{pph21Data.summary.totalPph21Formatted}</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Employee Details</h3>
                <Table>
                  <TableHeader>
                    <TableHead>Employee</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>NPWP</TableHead>
                    <TableHead>PTKP</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>PPh 21</TableHead>
                    {isAccountant && <TableHead>Actions</TableHead>}
                  </TableHeader>
                  <TableBody>
                    {pph21Data.employees.map((emp: any) => (
                      <TableRow key={emp.employeeNumber}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{emp.fullName}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{emp.employeeNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{emp.nik}</TableCell>
                        <TableCell className="font-mono text-sm">{emp.npwp || '-'}</TableCell>
                        <TableCell>{emp.ptkpStatus}</TableCell>
                        <TableCell>{emp.grossSalaryFormatted}</TableCell>
                        <TableCell className="font-semibold text-neutral-400">{emp.pph21Formatted}</TableCell>
                        {isAccountant && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateBuktiPotongMutation.mutate(emp.employeeId)}
                              isLoading={generateBuktiPotongMutation.isPending}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              1721-A1
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No data available for this period</p>
            </Card>
          )}
        </>
      )}

      {/* BPJS Report */}
      {reportType === 'bpjs' && (
        <>
          {bpjsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
            </div>
          ) : bpjsData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">BPJS Kesehatan</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{bpjsData.summary.bpjsKesehatan.totalFormatted}</p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKesehatan.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">JHT</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {bpjsData.summary.bpjsKetenagakerjaan.jht.totalFormatted}
                  </p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKetenagakerjaan.jht.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">JP</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {bpjsData.summary.bpjsKetenagakerjaan.jp.totalFormatted}
                  </p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKetenagakerjaan.jp.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">JKK + JKM</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {formatRupiah(
                      parseFloat(bpjsData.summary.bpjsKetenagakerjaan.jkk.employer || 0) +
                      parseFloat(bpjsData.summary.bpjsKetenagakerjaan.jkm.employer || 0)
                    )}
                  </p>
                  <p className="text-xs text-neutral-600">Employer contribution</p>
                </Card>
              </div>

              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Total Payable</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-800/50 rounded-lg">
                    <p className="text-sm text-[var(--text-secondary)]">Employee Contribution</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{bpjsData.summary.grandTotal.employeeFormatted}</p>
                  </div>
                  <div className="p-4 bg-neutral-800/50 rounded-lg">
                    <p className="text-sm text-[var(--text-secondary)]">Employer Contribution</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{bpjsData.summary.grandTotal.employerFormatted}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No data available for this period</p>
            </Card>
          )}
        </>
      )}

      {/* Expenses Report */}
      {reportType === 'expenses' && (
        <>
          {expensesLoading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white mx-auto"></div>
            </Card>
          ) : expensesData && expensesData.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Total Expenses</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {formatRupiah(
                      expensesData.reduce((sum: number, e: any) => sum + parseFloat(e.expense.amount), 0)
                    )}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Approved</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {formatRupiah(
                      expensesData
                        .filter((e: any) => e.expense.status === 'approved')
                        .reduce((sum: number, e: any) => sum + parseFloat(e.expense.amount), 0)
                    )}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {expensesData.filter((e: any) => e.expense.status === 'pending').length}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Rejected</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">
                    {expensesData.filter((e: any) => e.expense.status === 'rejected').length}
                  </p>
                </Card>
              </div>

              {/* Expenses Table */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">All Expenses</h3>
                <Table>
                  <TableHeader>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableHeader>
                  <TableBody>
                    {expensesData.map((item: any) => {
                      const { expense, employee } = item;
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{employee.fullName}</p>
                              <p className="text-sm text-[var(--text-secondary)]">{employee.employeeNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-[var(--text-primary)]">{expense.title}</p>
                          </TableCell>
                          <TableCell>
                            <span className="badge badge-info">
                              {expense.category}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                          <TableCell className="font-semibold">
                            {formatRupiah(parseFloat(expense.amount))}
                          </TableCell>
                          <TableCell>
                            <span className={cn('badge', getStatusBadgeClass(expense.status))}>
                              {getStatusLabel(expense.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <Receipt className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)]">No expenses found</p>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
