import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function CreateCompany() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    companyType: '',
    npwp: '',
    nib: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    size: '',
    solanaWallet: '',
    status: 'active',
    registrationDate: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/crm/clients/companies', data);
    },
    onSuccess: () => {
      toast.success('Company created successfully');
      navigate('/crm/clients');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create company');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      size: formData.size ? parseInt(formData.size) : undefined,
    };
    
    createMutation.mutate(submitData);
  };

  const companyTypeOptions = [
    { value: '', label: 'Select company type' },
    { value: 'PT', label: 'PT (Perseroan Terbatas)' },
    { value: 'CV', label: 'CV (Commanditaire Vennootschap)' },
    { value: 'Firma', label: 'Firma' },
    { value: 'UD', label: 'UD (Usaha Dagang)' },
    { value: 'Other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'prospect', label: 'Prospect' },
    { value: 'lead', label: 'Lead' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/clients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Company</h1>
          <p className="text-[var(--text-muted)] mt-1">Add a new company client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Basic Information</h2>
            
            <Input
              label="Company Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <Input
              label="Legal Name"
              value={formData.legalName}
              onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
              placeholder="Registered legal name"
            />
            
            <Select
              label="Company Type"
              options={companyTypeOptions}
              value={formData.companyType}
              onChange={(e) => setFormData({ ...formData, companyType: e.target.value })}
            />
            
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </Card>

          {/* Tax & Registration */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Tax & Registration</h2>
            
            <Input
              label="NPWP"
              value={formData.npwp}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
            />
            
            <Input
              label="NIB (Business Identification Number)"
              value={formData.nib}
              onChange={(e) => setFormData({ ...formData, nib: e.target.value })}
            />
            
            <Input
              label="Registration Date"
              type="date"
              value={formData.registrationDate}
              onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
            />
          </Card>

          {/* Contact Information */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contact Information</h2>
            
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            
            <Input
              label="Website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </Card>

          {/* Address */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Address</h2>
            
            <Input
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              
              <Input
                label="Province"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              />
            </div>
            
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />
          </Card>

          {/* Business Details */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Business Details</h2>
            
            <Input
              label="Industry/Sector"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Technology, Manufacturing"
            />
            
            <Input
              label="Company Size (Employee Count)"
              type="number"
              min="0"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              placeholder="Number of employees"
            />
          </Card>

          {/* Payment Information */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Payment Information</h2>
            
            <Input
              label="Solana Wallet Address"
              value={formData.solanaWallet}
              onChange={(e) => setFormData({ ...formData, solanaWallet: e.target.value })}
              placeholder="e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
              helperText="Optional: Solana wallet address for crypto payments"
            />
          </Card>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/crm/clients')}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Company
          </Button>
        </div>
      </form>

      {/* Success Modal with Invite Option */}
      {createMutation.isSuccess && createMutation.data ? (() => {
        const data = createMutation.data as any;
        return (
          <Modal
            isOpen={true}
            onClose={() => {
              createMutation.reset();
              navigate('/crm/clients');
            }}
            title="Company Created Successfully"
          >
            <div className="space-y-4">
              <p className="text-[var(--text-primary)]">
                Company <strong>{data?.name}</strong> has been created.
              </p>
            <p className="text-sm text-[var(--text-muted)]">
              Would you like to send an invitation to a contact at this company?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  createMutation.reset();
                  navigate('/crm/clients');
                }}
              >
                Skip
              </Button>
              <Button
                onClick={() => {
                  navigate(`/crm/clients/company/${data?.id}`);
                }}
              >
                Send Invitation
              </Button>
            </div>
          </div>
        </Modal>
        );
      })() : null}
    </div>
  );
}
