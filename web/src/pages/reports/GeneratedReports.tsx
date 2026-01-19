import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate, getIndonesianMonth } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Download, FileText, CheckCircle, Clock, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface GeneratedReport {
  id: string;
  reportType: 'spt_masa_pph21' | 'bukti_potong_1721a1';
  periodMonth: number;
  periodYear: number;
  pdfUrl: string;
  status: 'generated' | 'submitted' | 'archived';
  generatedAt: string;
  submittedAt: string | null;
  createdAt: string;
}

export default function GeneratedReports() {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: reports, isLoading } = useQuery({
    queryKey: ['generated-reports', selectedYear],
    queryFn: () => api.get<GeneratedReport[]>(`/reports/generated?year=${selectedYear}`),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/reports/generated/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      toast.success('Report status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'generated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-600/20 text-blue-400">
            <Clock className="w-3 h-3" />
            Generated
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-600/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Submitted
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-neutral-600/20 text-neutral-400">
            <Archive className="w-3 h-3" />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const getReportTypeLabel = (type: string) => {
    switch (type) {
      case 'spt_masa_pph21':
        return 'SPT Masa PPh 21 (Form 1721)';
      case 'bukti_potong_1721a1':
        return 'Bukti Potong 1721-A1';
      default:
        return type;
    }
  };

  const sptReports = reports?.filter((r) => r.reportType === 'spt_masa_pph21') || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Generated Reports</h1>
          <p className="text-neutral-500">Automatically generated monthly tax reports</p>
        </div>
        <div>
          <label className="block text-sm text-neutral-500 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {[2023, 2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">SPT Masa PPh 21 Reports</h2>
          <p className="text-sm text-neutral-500">
            Monthly tax returns are automatically generated on the 1st of each month for the previous month.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : sptReports.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Period</TableHead>
              <TableHead>Report Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {sptReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">
                        {getIndonesianMonth(report.periodMonth)} {report.periodYear}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm">{getReportTypeLabel(report.reportType)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm text-neutral-400">
                    {formatDate(report.generatedAt)}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400">
                    {report.submittedAt ? formatDate(report.submittedAt) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(report.pdfUrl, '_blank')}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      {report.status === 'generated' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateStatusMutation.mutate({ id: report.id, status: 'submitted' })
                          }
                        >
                          Mark Submitted
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No reports generated for {selectedYear} yet</p>
            <p className="text-sm text-neutral-600 mt-2">
              Reports are automatically generated on the 1st of each month
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
