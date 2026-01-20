import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { FileSignature, Plus, Send, Eye, Trash2, Calendar, DollarSign, Search, Filter, CheckCircle, Clock, XCircle, MapPin, Upload, X } from 'lucide-react';
import PdfSignaturePlacement from '../../components/contracts/PdfSignaturePlacement';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const CONTRACT_TYPES = [
  { value: 'service', label: 'Service' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'project', label: 'Project' },
  { value: 'employment', label: 'Employment' },
  { value: 'nda', label: 'NDA' },
  { value: 'confidentiality', label: 'Confidentiality' },
  { value: 'other', label: 'Other' },
];

export default function ContractManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sendModal, setSendModal] = useState<{ id: string; title: string } | null>(null);
  const [signaturePlacement, setSignaturePlacement] = useState<{ id: string; documentUrl: string; category: 'client' | 'employee' } | null>(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', 'all', categoryFilter, statusFilter],
    queryFn: () => api.get<any[]>('/contracts'),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<any[]>('/employees'),
  });

  const { data: clients } = useQuery({
    queryKey: ['crm-clients'],
    queryFn: () => api.get<any[]>('/crm/clients'),
  });

  const [formData, setFormData] = useState({
    contractCategory: 'client' as 'client' | 'employee',
    employeeId: '',
    companyId: '',
    individualClientId: '',
    title: '',
    description: '',
    contractType: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    value: '',
    currency: 'IDR',
    paymentTerms: '',
    notes: '',
    documentUrl: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/contracts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to create contract');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/contracts/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract sent successfully');
      setSendModal(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to send contract');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contracts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to delete contract');
    },
  });

  const placeSignatureFieldsMutation = useMutation({
    mutationFn: ({ id, signatureFields }: { id: string; signatureFields: any }) =>
      api.post(`/contracts/${id}/place-signature-fields`, { signatureFields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Signature fields placed successfully');
      setSignaturePlacement(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to place signature fields');
    },
  });

  const resetForm = () => {
    setFormData({
      contractCategory: 'client',
      employeeId: '',
      companyId: '',
      individualClientId: '',
      title: '',
      description: '',
      contractType: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      value: '',
      currency: 'IDR',
      paymentTerms: '',
      notes: '',
      documentUrl: '',
    });
    setIsUploadingDocument(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed for contracts');
      return;
    }

    setIsUploadingDocument(true);
    try {
      const result = await api.upload<{ url: string }>('/upload/contract', file);
      setFormData({ ...formData, documentUrl: result.url });
      toast.success('Contract PDF uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.json?.error || 'Failed to upload contract PDF');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.documentUrl) {
      toast.error('Please upload a contract PDF document');
      return;
    }
    
    const data: any = {
      contractCategory: formData.contractCategory,
      title: formData.title,
      description: formData.description || undefined,
      contractType: formData.contractType || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      currency: formData.currency,
      paymentTerms: formData.paymentTerms || undefined,
      notes: formData.notes || undefined,
      documentUrl: formData.documentUrl,
    };

    if (formData.contractCategory === 'employee') {
      if (!formData.employeeId) {
        toast.error('Please select an employee');
        return;
      }
      data.employeeId = formData.employeeId;
    } else {
      if (!formData.companyId && !formData.individualClientId) {
        toast.error('Please select a company or individual client');
        return;
      }
      if (formData.companyId) data.companyId = formData.companyId;
      if (formData.individualClientId) data.individualClientId = formData.individualClientId;
      if (formData.value) data.value = parseFloat(formData.value);
    }

    createMutation.mutate(data);
  };

  const filteredContracts = contracts?.filter((contract: any) => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(search.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      (contract.client?.name || contract.client?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (contract.employee?.fullName || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = !categoryFilter || contract.contractCategory === categoryFilter;
    const matchesStatus = !statusFilter || contract.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-neutral">Draft</span>;
      case 'sent':
        return <span className="badge badge-warning">Pending Signature</span>;
      case 'signed':
        return <span className="badge badge-info">Signed</span>;
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'expired':
        return <span className="badge badge-error">Expired</span>;
      case 'terminated':
        return <span className="badge badge-error">Terminated</span>;
      case 'cancelled':
        return <span className="badge badge-neutral">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'signed':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
      case 'terminated':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const clientCompanies = clients?.filter((c: any) => c.type === 'company') || [];
  const clientIndividuals = clients?.filter((c: any) => c.type === 'individual') || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Contract Management</h1>
          <p className="text-neutral-500">Manage all contracts for employees and clients</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Contract
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              placeholder="Search contracts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
          >
            <option value="">All Categories</option>
            <option value="client">Client Contracts</option>
            <option value="employee">Employee Contracts</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="terminated">Terminated</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Contracts Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
          </div>
        ) : filteredContracts && filteredContracts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Contract</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract: any) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{contract.title}</p>
                      <p className="text-sm text-neutral-500">{contract.contractNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.client ? (
                      <div>
                        <p className="text-neutral-900 dark:text-white">{contract.client.name || contract.client.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          {contract.client.type === 'company' ? 'Company' : 'Individual'}
                        </p>
                      </div>
                    ) : contract.employee ? (
                      <div>
                        <p className="text-neutral-900 dark:text-white">{contract.employee.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          Employee #{contract.employee.employeeNumber}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="badge badge-neutral capitalize">
                      {contract.contractCategory}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-neutral-400 capitalize">
                      {contract.contractType || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contract.value ? (
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {formatRupiah(parseFloat(contract.value))}
                      </span>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(contract.startDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(contract.status)}
                      {getStatusBadge(contract.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {contract.status === 'draft' && contract.documentUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSignaturePlacement({
                            id: contract.id,
                            documentUrl: contract.documentUrl,
                            category: contract.contractCategory,
                          })}
                          title="Place signature fields"
                        >
                          <MapPin className="w-4 h-4" />
                        </Button>
                      )}
                      {contract.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSendModal({ id: contract.id, title: contract.title })}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this contract?')) {
                            deleteMutation.mutate(contract.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <FileSignature className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No contracts found</p>
          </div>
        )}
      </Card>

      {/* Create Contract Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Contract"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Contract Category *
            </label>
            <select
              value={formData.contractCategory}
              onChange={(e) => setFormData({ ...formData, contractCategory: e.target.value as 'client' | 'employee', employeeId: '', companyId: '', individualClientId: '' })}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              required
            >
              <option value="client">Client Contract</option>
              <option value="employee">Employee Contract</option>
            </select>
          </div>

          {formData.contractCategory === 'employee' ? (
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Employee *
              </label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                required
              >
                <option value="">Select Employee</option>
                {employees?.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeNumber})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Client Company
                </label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value, individualClientId: '' })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                >
                  <option value="">Select Company</option>
                  {clientCompanies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Individual Client
                </label>
                <select
                  value={formData.individualClientId}
                  onChange={(e) => setFormData({ ...formData, individualClientId: e.target.value, companyId: '' })}
                  className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
                >
                  <option value="">Select Individual</option>
                  {clientIndividuals.map((individual: any) => (
                    <option key={individual.id} value={individual.id}>
                      {individual.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Contract title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Contract Type
            </label>
            <select
              value={formData.contractType}
              onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
            >
              <option value="">Select Type</option>
              {CONTRACT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Start Date *
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {formData.contractCategory === 'client' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Value
                </label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Currency
                </label>
                <Input
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="IDR"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Payment Terms
            </label>
            <Input
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              placeholder="e.g., Net 30, 50% upfront"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              rows={3}
              placeholder="Contract description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Contract PDF Document *
            </label>
            {formData.documentUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
                  <FileSignature className="w-5 h-5 text-[var(--accent-primary)]" />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-primary)] font-medium">PDF Document Uploaded</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{formData.documentUrl}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, documentUrl: '' })}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  id="contract-pdf-upload"
                  disabled={isUploadingDocument}
                />
                <label
                  htmlFor="contract-pdf-upload"
                  className="inline-block"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingDocument}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploadingDocument ? 'Uploading...' : 'Replace PDF'}
                  </Button>
                </label>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  id="contract-pdf-upload"
                  disabled={isUploadingDocument}
                />
                <label
                  htmlFor="contract-pdf-upload"
                  className="block cursor-pointer"
                >
                  <div className="flex flex-col items-center justify-center gap-3 p-8 bg-[var(--bg-input)] border-2 border-dashed border-[var(--border-color)] rounded-lg hover:border-[var(--text-secondary)] transition-colors">
                    <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                    <div className="text-center">
                      <p className="text-[var(--text-primary)] font-medium">
                        {isUploadingDocument ? 'Uploading PDF...' : 'Upload Contract PDF'}
                      </p>
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        PDF files only, maximum 10MB
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
              rows={2}
              placeholder="Internal notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Contract'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Contract Modal */}
      <Modal
        isOpen={!!sendModal}
        onClose={() => setSendModal(null)}
        title="Send Contract"
      >
        <div className="space-y-4">
          <p className="text-neutral-400">
            Are you sure you want to send "{sendModal?.title}" for signing?
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => sendModal && sendMutation.mutate(sendModal.id)}
              disabled={sendMutation.isPending}
              className="flex-1"
            >
              {sendMutation.isPending ? 'Sending...' : 'Send Contract'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setSendModal(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Signature Field Placement Modal */}
      {signaturePlacement && (
        <PdfSignaturePlacement
          isOpen={!!signaturePlacement}
          onClose={() => setSignaturePlacement(null)}
          contractId={signaturePlacement.id}
          documentUrl={signaturePlacement.documentUrl}
          contractCategory={signaturePlacement.category}
          onSave={(signatureFields) => {
            placeSignatureFieldsMutation.mutate({
              id: signaturePlacement.id,
              signatureFields,
            });
          }}
          existingFields={contracts?.find((c: any) => c.id === signaturePlacement.id)?.signatureFields}
        />
      )}
    </motion.div>
  );
}
