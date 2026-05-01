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
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

      <Card className="overflow-hidden p-0">
        {invoices && invoices.length > 0 ? (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{invoice.invoiceNumber}</p>
                          {invoice.contract && (
                            <p className="text-xs text-on-surface-variant">
                              Contract: {invoice.contract.contractNumber}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.client ? (
                          <div>
                            <p className="text-[var(--text-primary)]">{invoice.client.name || invoice.client.fullName}</p>
                            <p className="text-xs text-on-surface-variant">
                              {invoice.client.type === 'company' ? 'Company' : 'Individual'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-on-surface-variant">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 shrink-0 text-on-surface-variant" />
                          <span className="font-medium text-[var(--text-primary)]">
                            {formatRupiah(parseFloat(invoice.total))}
                          </span>
                        </div>
                        {invoice.paymentStatus === 'partial' && invoice.paidAmount && (
                          <p className="mt-1 text-xs text-on-surface-variant">
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
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {invoices.map((invoice: any) => (
                <Card
                  key={invoice.id}
                  className="p-4"
                  hover
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-headline font-semibold text-on-surface">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-on-surface-variant">
                        {invoice.client?.name || invoice.client?.fullName || '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">{getStatusBadge(invoice.paymentStatus)}</div>
                  </div>
                  <p className="mt-2 font-medium text-on-surface">{formatRupiah(parseFloat(invoice.total))}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                    <span>Issued {new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                    <span>Due {new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <ReceiptText className="mx-auto mb-4 h-12 w-12 text-outline" />
            <p className="text-on-surface-variant">No invoices found</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
