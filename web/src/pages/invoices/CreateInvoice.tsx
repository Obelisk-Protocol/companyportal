import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Plus, Trash2, Send, X, FileText, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    companyId: '',
    individualClientId: '',
    contractId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    taxRate: 0,
    discount: 0,
    currency: 'IDR',
    paymentTerms: 'Net 30',
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'crypto',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    walletAddress: '',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  const [emailData, setEmailData] = useState({
    to: '',
    message: '',
  });

  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['crm-clients'],
    queryFn: () => api.get<any[]>('/crm/clients'),
    retry: 1,
    onError: (error: any) => {
      console.error('Error loading clients:', error);
    },
  });

  const { data: contracts } = useQuery({
    queryKey: ['contracts', 'all'],
    queryFn: () => api.get<any[]>('/contracts'),
    enabled: !!formData.companyId || !!formData.individualClientId,
    retry: 1,
  });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<any>('/company'),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/invoices', data),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      setCreatedInvoiceId(invoice.id);
      setCreatedInvoice(invoice);
      
      // Auto-fill email with client email if available
      const selectedClient = clients?.find(
        (c: any) => c.id === formData.companyId || c.id === formData.individualClientId
      );
      if (selectedClient) {
        setEmailData({
          to: selectedClient.email || '',
          message: `Please find attached invoice ${invoice.invoiceNumber} for your records.\n\nPayment is due by ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nIf you have any questions, please don't hesitate to contact us.`,
        });
        setShowEmailModal(true);
      } else {
        navigate(`/invoices/${invoice.id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to create invoice');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ id, to, message }: { id: string; to: string; message?: string }) =>
      api.post(`/invoices/${id}/send-email`, { to, message }),
    onSuccess: () => {
      toast.success('Invoice sent via email successfully');
      setShowEmailModal(false);
      navigate(`/invoices/${createdInvoiceId}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to send email');
    },
  });

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = updated[index].quantity * updated[index].unitPrice;
    }
    
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * formData.taxRate) / 100;
    const total = subtotal + taxAmount - formData.discount;
    return { subtotal, taxAmount, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyId && !formData.individualClientId) {
      toast.error('Please select a client');
      return;
    }

    if (lineItems.some(item => !item.description || item.amount <= 0)) {
      toast.error('Please fill in all line items with valid descriptions and amounts');
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();
    
    // Validate payment method fields
    if (formData.paymentMethod === 'bank_transfer') {
      if (!formData.bankName || !formData.bankAccountNumber || !formData.bankAccountName) {
        toast.error('Please fill in all bank account details');
        return;
      }
    } else if (formData.paymentMethod === 'crypto') {
      if (!formData.walletAddress) {
        toast.error('Please enter wallet address');
        return;
      }
    }

    const data: any = {
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      lineItems: lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      taxRate: formData.taxRate,
      discount: formData.discount,
      currency: formData.currency,
      paymentTerms: formData.paymentTerms || undefined,
      paymentMethod: formData.paymentMethod,
      paymentInstructions: formData.paymentMethod === 'bank_transfer' 
        ? JSON.stringify({
            bankName: formData.bankName,
            bankAccountNumber: formData.bankAccountNumber,
            bankAccountName: formData.bankAccountName,
          })
        : JSON.stringify({
            walletAddress: formData.walletAddress,
          }),
      notes: formData.notes || undefined,
    };

    if (formData.companyId) data.companyId = formData.companyId;
    if (formData.individualClientId) data.individualClientId = formData.individualClientId;
    if (formData.contractId) data.contractId = formData.contractId;

    createMutation.mutate(data);
  };

  const handleSendEmail = () => {
    if (!createdInvoiceId || !emailData.to) {
      toast.error('Please enter recipient email');
      return;
    }

    sendEmailMutation.mutate({
      id: createdInvoiceId,
      to: emailData.to,
      message: emailData.message || undefined,
    });
  };

  const selectedClient = clients?.find(
    (c: any) => c.id === formData.companyId || c.id === formData.individualClientId
  );

  const { subtotal, taxAmount, total } = calculateTotals();

  const companyClients = (clients || []).filter((c: any) => c.type === 'company' || c.id && !c.fullName);
  const individualClients = (clients || []).filter((c: any) => c.type === 'individual' || c.fullName);
  const clientContracts = contracts?.filter((c: any) => {
    if (formData.companyId) return c.companyId === formData.companyId;
    if (formData.individualClientId) return c.individualClientId === formData.individualClientId;
    return false;
  }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Invoice</h1>
          <p className="text-[var(--text-muted)] mt-1">Generate a new invoice with company letterhead</p>
        </div>
      </div>

      {clientsLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--text-primary)]"></div>
          <span className="ml-3 text-[var(--text-secondary)]">Loading clients...</span>
        </div>
      )}

      {clientsError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-600 dark:text-red-400 mb-2">Failed to load client data</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['crm-clients'] })}
          >
            Retry
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Client Information</h2>
              <div className="space-y-4">
                <Select
                  label="Select Client *"
                  value={formData.companyId || formData.individualClientId}
                  onChange={(e) => {
                    const isCompany = companyClients.some((c: any) => c.id === e.target.value);
                    if (e.target.value === '') {
                      setFormData({ ...formData, companyId: '', individualClientId: '', contractId: '' });
                    } else if (isCompany) {
                      setFormData({ ...formData, companyId: e.target.value, individualClientId: '', contractId: '' });
                    } else {
                      setFormData({ ...formData, individualClientId: e.target.value, companyId: '', contractId: '' });
                    }
                  }}
                  options={[
                    { value: '', label: 'Select client...' },
                    ...companyClients.map((client: any) => ({
                      value: client.id,
                      label: client.name || client.legalName || 'Unnamed Company',
                    })),
                    ...individualClients.map((client: any) => ({
                      value: client.id,
                      label: client.fullName || 'Unnamed Individual',
                    })),
                  ]}
                />

                {(formData.companyId || formData.individualClientId) && clientContracts.length > 0 && (
                  <Select
                    label="Link to Contract (Optional)"
                    value={formData.contractId}
                    onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                    options={[
                      { value: '', label: 'No contract linked' },
                      ...clientContracts.map((contract: any) => ({
                        value: contract.id,
                        label: `${contract.contractNumber} - ${contract.title}`,
                      })),
                    ]}
                  />
                )}
              </div>
            </Card>

            {/* Invoice Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Invoice Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Invoice Date *"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  required
                />
                <Input
                  label="Due Date *"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
                <Input
                  label="Payment Terms"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="e.g., Net 30"
                />
                <Select
                  label="Currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={[
                    { value: 'IDR', label: 'IDR' },
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                  ]}
                />
              </div>
            </Card>

            {/* Payment Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Payment Information</h2>
              <div className="space-y-4">
                <Select
                  label="Payment Method *"
                  value={formData.paymentMethod}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      paymentMethod: e.target.value as 'bank_transfer' | 'crypto',
                      // Auto-fill wallet from company if crypto
                      walletAddress: e.target.value === 'crypto' && company?.solanaWallet ? company.solanaWallet : formData.walletAddress,
                    });
                  }}
                  options={[
                    { value: 'bank_transfer', label: 'Bank Deposit' },
                    { value: 'crypto', label: 'Wallet Address (Crypto)' },
                  ]}
                />

                {formData.paymentMethod === 'bank_transfer' && (
                  <>
                    <Input
                      label="Bank Name *"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="e.g., Bank Central Asia (BCA)"
                      required
                    />
                    <Input
                      label="Account Number *"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      placeholder="Account number"
                      required
                    />
                    <Input
                      label="Account Name *"
                      value={formData.bankAccountName}
                      onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                      placeholder="Account holder name"
                      required
                    />
                  </>
                )}

                {formData.paymentMethod === 'crypto' && (
                  <Input
                    label="Wallet Address *"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                    placeholder="Solana wallet address"
                    required
                  />
                )}
              </div>
            </Card>

            {/* Line Items */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Line Items</h2>
                <Button type="button" onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end pb-4 border-b border-[var(--border-color)] last:border-0 last:pb-0">
                    <div className="col-span-5">
                      <Input
                        label="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Qty"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        label="Unit Price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-[var(--text-secondary)]">
                          Amount
                        </label>
                        <Input
                          type="text"
                          value={formatRupiah(item.amount)}
                          disabled
                          className="bg-[var(--bg-secondary)] cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end pb-1">
                      <Button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        variant="ghost"
                        size="sm"
                        disabled={lineItems.length === 1}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Notes</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]/50 transition-all duration-200"
                rows={4}
                placeholder="Additional notes or terms..."
              />
            </Card>
          </div>

          {/* Sidebar - Totals */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">Summary</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="font-medium text-[var(--text-primary)]">{formatRupiah(subtotal)}</span>
                </div>
                
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                />
                {formData.taxRate > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-[var(--text-secondary)] text-sm">Tax Amount</span>
                    <span className="font-medium text-[var(--text-primary)] text-sm">{formatRupiah(taxAmount)}</span>
                  </div>
                )}
                
                <Input
                  label="Discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                />
                
                <div className="border-t border-[var(--border-color)] pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[var(--text-primary)]">Total</span>
                    <span className="text-xl font-bold text-[var(--text-primary)]">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Company Info Preview */}
            {company && (
              <Card className="p-6">
                <h3 className="text-md font-semibold text-[var(--text-primary)] mb-4">From</h3>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <p className="font-medium text-[var(--text-primary)]">{company.name}</p>
                  {company.address && <p className="text-xs">{company.address}</p>}
                  {(company.city || company.province) && (
                    <p className="text-xs">{[company.city, company.province].filter(Boolean).join(', ')}</p>
                  )}
                  {company.phone && <p className="text-xs">Phone: {company.phone}</p>}
                  {company.email && <p className="text-xs">Email: {company.email}</p>}
                  {company.npwp && <p className="text-xs">NPWP: {company.npwp}</p>}
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/invoices')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>

      {/* Email Modal */}
      {showEmailModal && createdInvoice && (
        <Modal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            navigate(`/invoices/${createdInvoiceId}`);
          }}
          title="Send Invoice via Email"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Recipient Email
              </label>
              <Input
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="client@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Message (Optional)
              </label>
              <textarea
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                className="w-full p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                rows={6}
                placeholder="Additional message to include in the email..."
              />
            </div>
            <div className="bg-[var(--bg-secondary)] p-4 rounded-lg">
              <p className="text-sm text-[var(--text-secondary)] mb-2">Invoice will include:</p>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Invoice number: {createdInvoice.invoiceNumber}</li>
                <li>Total amount: {formatRupiah(parseFloat(createdInvoice.total))}</li>
                <li>Due date: {new Date(createdInvoice.dueDate).toLocaleDateString()}</li>
                <li>PDF attachment</li>
              </ul>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailModal(false);
                  navigate(`/invoices/${createdInvoiceId}`);
                }}
              >
                Skip Email
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isPending || !emailData.to}
              >
                {sendEmailMutation.isPending ? (
                  <>
                    <FileText className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
