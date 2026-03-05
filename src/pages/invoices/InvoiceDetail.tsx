import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { ReceiptText, Download, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.get<any>(`/invoices/${id}`),
    enabled: !!id,
  });

  const { data: pdfData } = useQuery({
    queryKey: ['invoice-pdf', id],
    queryFn: () => api.get<{ pdfUrl: string }>(`/invoices/${id}/pdf`),
    enabled: !!id && !!invoice,
  });

  const downloadPdf = () => {
    if (pdfData?.pdfUrl) {
      window.open(pdfData.pdfUrl, '_blank');
    } else {
      toast.error('PDF not available');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <ReceiptText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
        <p className="text-neutral-500">Invoice not found</p>
        <Button onClick={() => navigate('/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const lineItems = invoice.lineItems || [];
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{invoice.invoiceNumber}</h1>
          <p className="text-neutral-500">Invoice Details</p>
        </div>
        <div className="flex gap-3">
          {pdfData?.pdfUrl && (
            <Button onClick={downloadPdf}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Invoice Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span>Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
            {invoice.paymentTerms && (
              <div>
                <span className="text-neutral-400">Payment Terms: </span>
                <span className="text-[var(--text-primary)]">{invoice.paymentTerms}</span>
              </div>
            )}
            {invoice.contract && (
              <div>
                <span className="text-neutral-400">Contract: </span>
                <span className="text-[var(--text-primary)]">{invoice.contract.contractNumber}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div>
              <span className="text-neutral-400">Status: </span>
              {getStatusBadge(invoice.paymentStatus)}
            </div>
            <div>
              <span className="text-neutral-400">Total Amount: </span>
              <span className="text-[var(--text-primary)] font-semibold">
                {formatRupiah(parseFloat(invoice.total))} {invoice.currency}
              </span>
            </div>
            {invoice.paidAmount && parseFloat(invoice.paidAmount) > 0 && (
              <div>
                <span className="text-neutral-400">Paid Amount: </span>
                <span className="text-[var(--text-primary)]">
                  {formatRupiah(parseFloat(invoice.paidAmount))} {invoice.currency}
                </span>
              </div>
            )}
            {invoice.paidAmount && parseFloat(invoice.paidAmount) < parseFloat(invoice.total) && (
              <div>
                <span className="text-neutral-400">Remaining: </span>
                <span className="text-[var(--text-primary)]">
                  {formatRupiah(parseFloat(invoice.total) - parseFloat(invoice.paidAmount))} {invoice.currency}
                </span>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <span className="text-neutral-400">Paid At: </span>
                <span className="text-[var(--text-primary)]">
                  {new Date(invoice.paidAt).toLocaleString()}
                </span>
              </div>
            )}
            {invoice.paymentMethod && (
              <div>
                <span className="text-neutral-400">Payment Method: </span>
                <span className="text-[var(--text-primary)] capitalize">{invoice.paymentMethod.replace('_', ' ')}</span>
              </div>
            )}
            {invoice.paymentReference && (
              <div>
                <span className="text-neutral-400">Reference: </span>
                <span className="text-[var(--text-primary)]">{invoice.paymentReference}</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {invoice.client && (
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Client Information</h3>
          <div className="space-y-2">
            <p className="text-[var(--text-primary)]">{invoice.client.name || invoice.client.fullName}</p>
            {invoice.client.email && (
              <p className="text-neutral-400">Email: {invoice.client.email}</p>
            )}
            {invoice.client.phone && (
              <p className="text-neutral-400">Phone: {invoice.client.phone}</p>
            )}
            {invoice.client.address && (
              <p className="text-neutral-400">
                Address: {invoice.client.address}
                {invoice.client.city && `, ${invoice.client.city}`}
                {invoice.client.province && `, ${invoice.client.province}`}
              </p>
            )}
            {invoice.client.solanaWallet && (
              <p className="text-neutral-400">
                Solana Wallet: <span className="font-mono text-xs">{invoice.client.solanaWallet}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Line Items</h3>
        <Table>
          <TableHeader>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableHeader>
          <TableBody>
            {lineItems.map((item: any, index: number) => (
              <TableRow key={index}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatRupiah(item.unitPrice)} {invoice.currency}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatRupiah(item.amount)} {invoice.currency}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal:</span>
              <span>{formatRupiah(parseFloat(invoice.subtotal))} {invoice.currency}</span>
            </div>
            {parseFloat(invoice.taxRate) > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Tax ({invoice.taxRate}%):</span>
                <span>{formatRupiah(parseFloat(invoice.taxAmount))} {invoice.currency}</span>
              </div>
            )}
            {parseFloat(invoice.discount) > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Discount:</span>
                <span>-{formatRupiah(parseFloat(invoice.discount))} {invoice.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-[var(--text-primary)] font-bold text-lg pt-2 border-t border-neutral-700">
              <span>Total:</span>
              <span>{formatRupiah(parseFloat(invoice.total))} {invoice.currency}</span>
            </div>
          </div>
        </div>
      </Card>

      {invoice.notes && (
        <Card className="p-6">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Notes</h3>
          <p className="text-neutral-400 whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}
    </motion.div>
  );
}
