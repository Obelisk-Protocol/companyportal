import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRupiah, getIndonesianMonth } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { FileText, Download, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'react-hot-toast';

type ReportType = 'pph21' | 'bpjs' | 'summary';

export default function Reports() {
  const { user } = useAuth();
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
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-neutral-500">Tax and BPJS reports</p>
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
              <label className="block text-sm text-neutral-500 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
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
            <label className="block text-sm text-neutral-500 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
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
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : summaryData ? (
            <>
              {/* Annual Totals */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total Gross</p>
                  <p className="text-xl font-bold text-white">{summaryData.annualTotals.totalGrossFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total Net</p>
                  <p className="text-xl font-bold text-white">{summaryData.annualTotals.totalNetFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total PPh 21</p>
                  <p className="text-xl font-bold text-neutral-400">{summaryData.annualTotals.totalPph21Formatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total BPJS</p>
                  <p className="text-xl font-bold text-neutral-300">
                    {formatRupiah(summaryData.annualTotals.totalBpjsEmployee + summaryData.annualTotals.totalBpjsEmployer)}
                  </p>
                </Card>
              </div>

              {/* Chart */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Monthly Trend</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#525252" fontSize={12} />
                      <YAxis stroke="#525252" fontSize={12} tickFormatter={(v) => `${v}M`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #262626',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`Rp ${value.toFixed(0)} million`, '']}
                      />
                      <Legend />
                      <Bar dataKey="Gross" fill="#ffffff" radius={[4, 4, 0, 0]} />
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
              <p className="text-neutral-500">No data available for this period</p>
            </Card>
          )}
        </>
      )}

      {/* PPh 21 Report */}
      {reportType === 'pph21' && (
        <>
          {pph21Loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
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
                  <p className="text-sm text-neutral-500">Total Employees</p>
                  <p className="text-xl font-bold text-white">{pph21Data.summary.totalEmployees}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total Gross</p>
                  <p className="text-xl font-bold text-white">{pph21Data.summary.totalGrossFormatted}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">Total PPh 21</p>
                  <p className="text-xl font-bold text-neutral-400">{pph21Data.summary.totalPph21Formatted}</p>
                </Card>
              </div>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Employee Details</h3>
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
                            <p className="font-medium text-white">{emp.fullName}</p>
                            <p className="text-sm text-neutral-500">{emp.employeeNumber}</p>
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
              <p className="text-neutral-500">No data available for this period</p>
            </Card>
          )}
        </>
      )}

      {/* BPJS Report */}
      {reportType === 'bpjs' && (
        <>
          {bpjsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : bpjsData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">BPJS Kesehatan</p>
                  <p className="text-xl font-bold text-white">{bpjsData.summary.bpjsKesehatan.totalFormatted}</p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKesehatan.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">JHT</p>
                  <p className="text-xl font-bold text-white">
                    {bpjsData.summary.bpjsKetenagakerjaan.jht.totalFormatted}
                  </p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKetenagakerjaan.jht.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">JP</p>
                  <p className="text-xl font-bold text-white">
                    {bpjsData.summary.bpjsKetenagakerjaan.jp.totalFormatted}
                  </p>
                  <p className="text-xs text-neutral-600">
                    Employee: {bpjsData.summary.bpjsKetenagakerjaan.jp.employeeFormatted}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-neutral-500">JKK + JKM</p>
                  <p className="text-xl font-bold text-white">
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
                  <h3 className="text-lg font-semibold text-white">Total Payable</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-neutral-800/50 rounded-lg">
                    <p className="text-sm text-neutral-500">Employee Contribution</p>
                    <p className="text-2xl font-bold text-white">{bpjsData.summary.grandTotal.employeeFormatted}</p>
                  </div>
                  <div className="p-4 bg-neutral-800/50 rounded-lg">
                    <p className="text-sm text-neutral-500">Employer Contribution</p>
                    <p className="text-2xl font-bold text-white">{bpjsData.summary.grandTotal.employerFormatted}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500">No data available for this period</p>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
}
