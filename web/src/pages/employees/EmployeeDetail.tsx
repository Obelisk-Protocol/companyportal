import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatRupiah, formatDate, getPTKPLabel, getStatusBadgeClass, getStatusLabel, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { ArrowLeft, Edit, Wallet, User, Building, CreditCard, FileImage, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const updateSalaryMutation = useMutation({
    mutationFn: (data: typeof salaryForm) => api.put(`/employees/${id}/salary`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-salary', id] });
      toast.success('Salary updated successfully');
      setIsSalaryModalOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update salary');
    },
  });

  const openSalaryModal = () => {
    if (salary) {
      setSalaryForm({
        gajiPokok: parseFloat(salary.gajiPokok) || 0,
        tunjanganTransport: parseFloat(salary.tunjanganTransport) || 0,
        tunjanganMakan: parseFloat(salary.tunjanganMakan) || 0,
        tunjanganKomunikasi: parseFloat(salary.tunjanganKomunikasi) || 0,
        tunjanganJabatan: parseFloat(salary.tunjanganJabatan) || 0,
        tunjanganLainnya: parseFloat(salary.tunjanganLainnya) || 0,
        effectiveDate: new Date().toISOString().split('T')[0],
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
        <p className="text-neutral-500">Employee not found</p>
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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{employee.fullName}</h1>
            <p className="text-neutral-500">{employee.employeeNumber}</p>
          </div>
        </div>
        <span className={cn('badge', getStatusBadgeClass(employee.status))}>
          {getStatusLabel(employee.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Info */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">Personal Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-neutral-500">Email</p>
              <p className="text-neutral-900 dark:text-white">{employee.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Phone</p>
              <p className="text-neutral-900 dark:text-white">{employee.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">NIK (ID Card)</p>
              <p className="text-neutral-900 dark:text-white font-mono">{employee.nik}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">NPWP (Tax ID)</p>
              <p className="text-neutral-900 dark:text-white font-mono">{employee.npwp || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">PTKP Status</p>
              <p className="text-neutral-900 dark:text-white">{getPTKPLabel(employee.ptkpStatus)}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Join Date</p>
              <p className="text-neutral-900 dark:text-white">{formatDate(employee.joinDate)}</p>
            </div>
          </div>
        </Card>

        {/* Employment Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">Employment</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500">Department</p>
              <p className="text-neutral-900 dark:text-white">{employee.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Position</p>
              <p className="text-neutral-900 dark:text-white">{employee.position || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Employment Type</p>
              <p className="text-neutral-900 dark:text-white capitalize">{employee.employmentType}</p>
            </div>
          </div>
        </Card>

        {/* Bank Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h3 className="font-semibold text-neutral-900 dark:text-white">Bank Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500">Bank</p>
              <p className="text-neutral-900 dark:text-white">{employee.bankName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Account Number</p>
              <p className="text-neutral-900 dark:text-white font-mono">{employee.bankAccountNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Account Holder</p>
              <p className="text-neutral-900 dark:text-white">{employee.bankAccountName || '-'}</p>
            </div>
          </div>
        </Card>

        {/* KTP Image */}
        {employee.ktpUrl && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <FileImage className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">KTP (ID Card)</h3>
            </div>
            <div className="space-y-3">
              <div className="relative aspect-[1.6/1] bg-neutral-800 rounded-lg overflow-hidden">
                <img
                  src={employee.ktpUrl}
                  alt="KTP"
                  className="w-full h-full object-contain"
                />
              </div>
              <a
                href={employee.ktpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View full size
              </a>
            </div>
          </Card>
        )}

        {/* Salary Info */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h3 className="font-semibold text-neutral-900 dark:text-white">Salary Components</h3>
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
                  <p className="text-sm text-neutral-500">Base Salary (Gaji Pokok)</p>
                  <p className="text-neutral-900 dark:text-white font-semibold">{formatRupiah(parseFloat(salary.gajiPokok))}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Transport Allowance</p>
                  <p className="text-neutral-900 dark:text-white">{formatRupiah(parseFloat(salary.tunjanganTransport || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Meal Allowance</p>
                  <p className="text-neutral-900 dark:text-white">{formatRupiah(parseFloat(salary.tunjanganMakan || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Communication Allowance</p>
                  <p className="text-neutral-900 dark:text-white">{formatRupiah(parseFloat(salary.tunjanganKomunikasi || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Position Allowance</p>
                  <p className="text-neutral-900 dark:text-white">{formatRupiah(parseFloat(salary.tunjanganJabatan || 0))}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Other Allowances</p>
                  <p className="text-neutral-900 dark:text-white">{formatRupiah(parseFloat(salary.tunjanganLainnya || 0))}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-800">
                <div className="flex justify-between">
                  <p className="text-neutral-400">Total Gross Salary</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatRupiah(totalSalary)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500 mb-4">No salary data</p>
              <Button onClick={openSalaryModal}>Add Salary</Button>
            </div>
          )}
        </Card>
      </div>

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
