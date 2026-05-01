import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah, formatDate, getPTKPLabel, getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Edit, Wallet, User, Building, CreditCard, FileImage, ExternalLink, Briefcase, Upload } from 'lucide-react';
import Select from '../../components/ui/Select';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const PTKP_STATUS_VALUES = [
  'TK/0',
  'TK/1',
  'TK/2',
  'TK/3',
  'K/0',
  'K/1',
  'K/2',
  'K/3',
  'K/I/0',
  'K/I/1',
  'K/I/2',
  'K/I/3',
] as const;

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ktpFileInputRef = useRef<HTMLInputElement>(null);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  type CompensationCategory = 'full_time' | 'employment_contract' | 'private_contract';

  const [compForm, setCompForm] = useState({
    compensationCategory: 'full_time' as CompensationCategory,
    contractPaymentTxSignature: '',
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ktpUploading, setKtpUploading] = useState(false);
  const [stagedKtpUrl, setStagedKtpUrl] = useState<string | undefined>(undefined);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    nik: '',
    npwp: '',
    ptkpStatus: 'TK/0',
    joinDate: '',
    department: '',
    position: '',
    employmentType: 'permanent',
    bpjsKesehatanNumber: '',
    bpjsKetenagakerjaanNumber: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [salaryForm, setSalaryForm] = useState({
    gajiPokok: 0,
    tunjanganTransport: 0,
    tunjanganMakan: 0,
    tunjanganKomunikasi: 0,
    tunjanganJabatan: 0,
    tunjanganLainnya: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
  });

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.get<any>(`/employees/${id}`),
  });

  const { data: salary } = useQuery({
    queryKey: ['employee-salary', id],
    queryFn: () => api.get<any>(`/employees/${id}/salary`).catch(() => null),
  });

  const updateCompMutation = useMutation({
    mutationFn: (data: typeof compForm) =>
      api.put(`/employees/${id}`, {
        compensationCategory: data.compensationCategory,
        contractPaymentTxSignature: data.contractPaymentTxSignature || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Compensation settings updated');
      setIsCompModalOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    },
  });

  const updateSalaryMutation = useMutation({
    mutationFn: (data: typeof salaryForm) => api.put(`/employees/${id}/salary`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salary', id] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-input-context'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-payslips'] });
      toast.success('Salary updated successfully');
      setIsSalaryModalOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update salary');
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.put(`/employees/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
      setIsEditModalOpen(false);
      setStagedKtpUrl(undefined);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update employee');
    },
  });

  const openEditModal = () => {
    if (!employee) return;
    const jd = employee.joinDate as string | undefined;
    const joinDateStr = jd ? (jd.includes('T') ? jd.split('T')[0] : jd) : '';
    setEditForm({
      fullName: employee.fullName || '',
      email: employee.email || '',
      phone: employee.phone || '',
      nik: employee.nik || '',
      npwp: employee.npwp || '',
      ptkpStatus: employee.ptkpStatus || 'TK/0',
      joinDate: joinDateStr,
      department: employee.department || '',
      position: employee.position || '',
      employmentType: employee.employmentType || 'permanent',
      bpjsKesehatanNumber: employee.bpjsKesehatanNumber || '',
      bpjsKetenagakerjaanNumber: employee.bpjsKetenagakerjaanNumber || '',
      bankName: employee.bankName || '',
      bankAccountNumber: employee.bankAccountNumber || '',
      bankAccountName: employee.bankAccountName || '',
      address: employee.address || '',
      city: employee.city || '',
      province: employee.province || '',
      postalCode: employee.postalCode || '',
    });
    setStagedKtpUrl(undefined);
    setIsEditModalOpen(true);
  };

  const handleKtpUploadInModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKtpUploading(true);
    try {
      const result = await api.upload<{ url: string }>('/upload/ktp', file);
      setStagedKtpUrl(result.url);
      toast.success('ID document uploaded — click Save to store it on this employee');
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setKtpUploading(false);
      e.target.value = '';
    }
  };

  const submitEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const nikDigits = editForm.nik.replace(/\D/g, '');
    if (nikDigits.length !== 16) {
      toast.error('NIK must be exactly 16 digits');
      return;
    }
    const payload: Record<string, unknown> = {
      fullName: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || undefined,
      nik: nikDigits,
      npwp: editForm.npwp.replace(/\s/g, '') || undefined,
      ptkpStatus: editForm.ptkpStatus,
      joinDate: editForm.joinDate,
      department: editForm.department.trim() || undefined,
      position: editForm.position.trim() || undefined,
      employmentType: editForm.employmentType,
      bpjsKesehatanNumber: editForm.bpjsKesehatanNumber.trim() || undefined,
      bpjsKetenagakerjaanNumber: editForm.bpjsKetenagakerjaanNumber.trim() || undefined,
      bankName: editForm.bankName.trim() || undefined,
      bankAccountNumber: editForm.bankAccountNumber.trim() || undefined,
      bankAccountName: editForm.bankAccountName.trim() || undefined,
      address: editForm.address.trim() || undefined,
      city: editForm.city.trim() || undefined,
      province: editForm.province.trim() || undefined,
      postalCode: editForm.postalCode.trim() || undefined,
    };
    if (stagedKtpUrl) {
      payload.ktpUrl = stagedKtpUrl;
    }
    updateEmployeeMutation.mutate(payload);
  };

  const openCompModal = () => {
    if (!employee) return;
    const cat = employee.compensationCategory as CompensationCategory | undefined;
    setCompForm({
      compensationCategory:
        cat === 'private_contract' || cat === 'employment_contract' ? cat : 'full_time',
      contractPaymentTxSignature: employee.contractPaymentTxSignature || '',
    });
    setIsCompModalOpen(true);
  };

  const openSalaryModal = () => {
    if (salary) {
      const ed = salary.effectiveDate as string | undefined;
      const effectiveDateStr = ed
        ? ed.includes('T')
          ? ed.split('T')[0]!
          : ed
        : new Date().toISOString().split('T')[0]!;
      setSalaryForm({
        gajiPokok: parseFloat(salary.gajiPokok) || 0,
        tunjanganTransport: parseFloat(salary.tunjanganTransport) || 0,
        tunjanganMakan: parseFloat(salary.tunjanganMakan) || 0,
        tunjanganKomunikasi: parseFloat(salary.tunjanganKomunikasi) || 0,
        tunjanganJabatan: parseFloat(salary.tunjanganJabatan) || 0,
        tunjanganLainnya: parseFloat(salary.tunjanganLainnya) || 0,
        effectiveDate: effectiveDateStr,
      });
    }
    setIsSalaryModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Employee not found</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const totalSalary = salary
    ? parseFloat(salary.gajiPokok) +
      parseFloat(salary.tunjanganTransport || 0) +
      parseFloat(salary.tunjanganMakan || 0) +
      parseFloat(salary.tunjanganKomunikasi || 0) +
      parseFloat(salary.tunjanganJabatan || 0) +
      parseFloat(salary.tunjanganLainnya || 0)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/employees')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{employee.fullName}</h1>
            <p className="text-[var(--text-secondary)]">{employee.employeeNumber}</p>
          </div>
        </div>
        <span className={cn('badge', getStatusBadgeClass(employee.status))}>
          {getStatusLabel(employee.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[var(--text-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Personal Information</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openEditModal}>
              <Edit className="w-4 h-4 mr-2" />
              Edit employee
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Email</p>
              <p className="text-[var(--text-primary)]">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Phone</p>
              <p className="text-[var(--text-primary)]">{employee.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">NIK (ID Card)</p>
              <p className="text-[var(--text-primary)] font-mono">{employee.nik}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">NPWP (Tax ID)</p>
              <p className="text-[var(--text-primary)] font-mono">{employee.npwp || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">PTKP Status</p>
              <p className="text-[var(--text-primary)]">{getPTKPLabel(employee.ptkpStatus)}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Join Date</p>
              <p className="text-[var(--text-primary)]">{formatDate(employee.joinDate)}</p>
            </div>
          </div>
        </Card>

        {/* Employment Info */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-[var(--text-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Employment</h3>
            </div>
            <Button variant="outline" size="sm" onClick={openCompModal}>
              <Briefcase className="w-4 h-4 mr-2" />
              Payroll type
            </Button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Department</p>
              <p className="text-[var(--text-primary)]">{employee.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Position</p>
              <p className="text-[var(--text-primary)]">{employee.position || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Employment Type</p>
              <p className="text-[var(--text-primary)] capitalize">{employee.employmentType}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Payroll category</p>
              <p className="text-[var(--text-primary)]">
                {employee.compensationCategory === 'private_contract'
                  ? 'Private contract (grant / off payroll batch)'
                  : employee.compensationCategory === 'employment_contract'
                    ? 'Employment contract (monthly payroll, no leave/BPJS on payslip)'
                    : 'Full-time payroll'}
              </p>
            </div>
            {employee.compensationCategory === 'private_contract' && employee.contractPaymentTxSignature && (
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Payment proof</p>
                <a
                  href={`https://solscan.io/tx/${employee.contractPaymentTxSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open on Solscan
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Bank Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-[var(--text-primary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Bank Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Bank</p>
              <p className="text-[var(--text-primary)]">{employee.bankName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Account Number</p>
              <p className="text-[var(--text-primary)] font-mono">{employee.bankAccountNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Account Holder</p>
              <p className="text-[var(--text-primary)]">{employee.bankAccountName || '-'}</p>
            </div>
          </div>
        </Card>

        {/* KTP / ID document */}
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-[var(--text-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">KTP (ID Card)</h3>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={openEditModal}>
              <Upload className="w-4 h-4 mr-2" />
              Upload / replace
            </Button>
          </div>
          {employee.ktpUrl ? (
            <div className="space-y-3">
              <div className="relative aspect-[1.6/1] max-h-64 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
                <img src={employee.ktpUrl} alt="KTP" className="w-full h-full object-contain" />
              </div>
              <a
                href={employee.ktpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open full size
              </a>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              No ID document on file. Use <span className="font-medium text-[var(--text-primary)]">Upload / replace</span>{' '}
              or <span className="font-medium text-[var(--text-primary)]">Edit employee</span> to add a scan or photo of
              the KTP.
            </p>
          )}
        </Card>

        {/* Salary Info */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[var(--text-primary)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Salary Components</h3>
            </div>
            <Button variant="outline" size="sm" onClick={openSalaryModal}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
          {salary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Base Salary (Gaji Pokok)</p>
                  <p className="text-[var(--text-primary)] font-semibold">{formatRupiah(parseFloat(salary.gajiPokok))}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Transport Allowance</p>
                  <p className="text-[var(--text-primary)]">{formatRupiah(parseFloat(salary.tunjanganTransport || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Meal Allowance</p>
                  <p className="text-[var(--text-primary)]">{formatRupiah(parseFloat(salary.tunjanganMakan || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Communication Allowance</p>
                  <p className="text-[var(--text-primary)]">{formatRupiah(parseFloat(salary.tunjanganKomunikasi || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Position Allowance</p>
                  <p className="text-[var(--text-primary)]">{formatRupiah(parseFloat(salary.tunjanganJabatan || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Other Allowances</p>
                  <p className="text-[var(--text-primary)]">{formatRupiah(parseFloat(salary.tunjanganLainnya || 0))}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-800">
                <div className="flex justify-between">
                  <p className="text-[var(--text-muted)]">Total Gross Salary</p>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{formatRupiah(totalSalary)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] mb-4">No salary data</p>
              <Button onClick={openSalaryModal}>Add Salary</Button>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !updateEmployeeMutation.isPending && setIsEditModalOpen(false)}
        title="Edit employee"
        size="lg"
      >
        <form onSubmit={submitEditEmployee} className="space-y-4 max-h-[min(80vh,720px)] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full name"
              value={editForm.fullName}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
            <Input
              label="NIK (16 digits)"
              value={editForm.nik}
              onChange={(e) => setEditForm({ ...editForm, nik: e.target.value })}
              required
            />
            <Input
              label="NPWP (optional)"
              value={editForm.npwp}
              onChange={(e) => setEditForm({ ...editForm, npwp: e.target.value })}
            />
            <Select
              label="PTKP status"
              value={editForm.ptkpStatus}
              onChange={(e) => setEditForm({ ...editForm, ptkpStatus: e.target.value })}
              options={PTKP_STATUS_VALUES.map((v) => ({
                value: v,
                label: `${v} — ${getPTKPLabel(v)}`,
              }))}
            />
            <Input
              label="Join date"
              type="date"
              value={editForm.joinDate}
              onChange={(e) => setEditForm({ ...editForm, joinDate: e.target.value })}
              required
            />
            <Select
              label="Employment type"
              value={editForm.employmentType}
              onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
              options={EMPLOYMENT_TYPE_OPTIONS}
            />
            <Input
              label="Department"
              value={editForm.department}
              onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
            />
            <Input
              label="Position"
              value={editForm.position}
              onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
            />
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="BPJS Kesehatan no."
                value={editForm.bpjsKesehatanNumber}
                onChange={(e) => setEditForm({ ...editForm, bpjsKesehatanNumber: e.target.value })}
              />
              <Input
                label="BPJS Ketenagakerjaan no."
                value={editForm.bpjsKetenagakerjaanNumber}
                onChange={(e) => setEditForm({ ...editForm, bpjsKetenagakerjaanNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Address</p>
            <Input
              label="Street address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="City"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              />
              <Input
                label="Province"
                value={editForm.province}
                onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
              />
              <Input
                label="Postal code"
                value={editForm.postalCode}
                onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Bank</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank name"
                value={editForm.bankName}
                onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
              />
              <Input
                label="Account number"
                value={editForm.bankAccountNumber}
                onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Account holder"
                  value={editForm.bankAccountName}
                  onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">KTP / ID card image</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Upload a clear photo or scan (JPG/PNG/WebP, max 10MB). It will be saved when you click Save.
            </p>
            {(stagedKtpUrl || employee.ktpUrl) && (
              <div className="relative max-h-48 rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-secondary)]">
                <img
                  src={stagedKtpUrl || employee.ktpUrl}
                  alt="KTP preview"
                  className="w-full h-full object-contain max-h-48"
                />
              </div>
            )}
            <input
              ref={ktpFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              disabled={ktpUploading}
              onChange={handleKtpUploadInModal}
            />
            <Button
              type="button"
              variant="outline"
              disabled={ktpUploading}
              onClick={() => ktpFileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {ktpUploading ? 'Uploading…' : 'Choose file'}
            </Button>
            {stagedKtpUrl && (
              <p className="text-xs text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                New file selected — click Save employee to attach it to this profile.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={updateEmployeeMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updateEmployeeMutation.isPending}>
              Save employee
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        title="Payroll category"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateCompMutation.mutate(compForm);
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Category</label>
            <select
              value={compForm.compensationCategory}
              onChange={(e) =>
                setCompForm({
                  ...compForm,
                  compensationCategory: e.target.value as CompensationCategory,
                })
              }
              className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
            >
              <option value="full_time">Full-time (payslip, BPJS, annual leave)</option>
              <option value="employment_contract">
                Employment contract (monthly payroll; PPh 21; no BPJS / leave on payslip)
              </option>
              <option value="private_contract">Private contract / grant (Solscan; excluded from payroll batch)</option>
            </select>
          </div>
          {compForm.compensationCategory === 'private_contract' && (
            <Input
              label="Solana transaction signature (Solscan)"
              value={compForm.contractPaymentTxSignature}
              onChange={(e) => setCompForm({ ...compForm, contractPaymentTxSignature: e.target.value })}
              placeholder="Paste tx signature from Solscan"
            />
          )}
          <p className="text-xs text-[var(--text-muted)]">
            Private contract is for grant-style pay (Solscan proof, not in batch payroll). Employment contract is paid
            through the same monthly run as full-time but without statutory leave tracking or BPJS on the payslip.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsCompModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateCompMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Salary Modal */}
      <Modal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        title="Edit Salary Components"
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateSalaryMutation.mutate(salaryForm);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base Salary (Gaji Pokok)"
              type="number"
              value={salaryForm.gajiPokok}
              onChange={(e) => setSalaryForm({ ...salaryForm, gajiPokok: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Transport Allowance"
              type="number"
              value={salaryForm.tunjanganTransport}
              onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganTransport: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Meal Allowance"
              type="number"
              value={salaryForm.tunjanganMakan}
              onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganMakan: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Communication Allowance"
              type="number"
              value={salaryForm.tunjanganKomunikasi}
              onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganKomunikasi: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Position Allowance"
              type="number"
              value={salaryForm.tunjanganJabatan}
              onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganJabatan: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Other Allowances"
              type="number"
              value={salaryForm.tunjanganLainnya}
              onChange={(e) => setSalaryForm({ ...salaryForm, tunjanganLainnya: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Effective Date"
              type="date"
              value={salaryForm.effectiveDate}
              onChange={(e) => setSalaryForm({ ...salaryForm, effectiveDate: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsSalaryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateSalaryMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
