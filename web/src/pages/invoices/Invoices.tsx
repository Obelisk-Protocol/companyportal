import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { ReceiptText, Eye, Calendar, CheckCircle, Clock, XCircle, DollarSign, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Invoices() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get<any[]>('/invoices'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'partial':
        return <span className="badge badge-info">Partial</span>;
      case 'paid':
        return <span className="badge badge-success">Paid</span>;
      case 'overdue':
        return <span className="badge badge-error">Overdue</span>;
      case 'cancelled':
        return <span className="badge badge-neutral">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'overdue':
        return <Clock className="w-4 h-4" />;
      case 'partial':
        return <Clock className="w-4 h-4" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  const isAdminOrHr = user?.role === 'admin' || user?.role === 'hr';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Invoices</h1>
          <p className="text-[var(--text-secondary)]">View and manage your invoices</p>
        </div>
        {isAdminOrHr && (
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>

      <Card>
        {invoices && invoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice: any) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</p>
                      {invoice.contract && (
                        <p className="text-xs text-neutral-500">
                          Contract: {invoice.contract.contractNumber}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {invoice.client ? (
                      <div>
                        <p className="text-[var(--text-primary)]">{invoice.client.name || invoice.client.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          {invoice.client.type === 'company' ? 'Company' : 'Individual'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-neutral-400" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {formatRupiah(parseFloat(invoice.total))}
                      </span>
                    </div>
                    {invoice.paymentStatus === 'partial' && invoice.paidAmount && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Paid: {formatRupiah(parseFloat(invoice.paidAmount))}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.paymentStatus)}
                      {getStatusBadge(invoice.paymentStatus)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <ReceiptText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No invoices found</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
