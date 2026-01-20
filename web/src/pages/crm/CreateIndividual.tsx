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

export default function CreateIndividual() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    nik: '',
    npwp: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    dateOfBirth: '',
    occupation: '',
    solanaWallet: '',
    status: 'active',
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/crm/clients/individuals', data);
    },
    onSuccess: () => {
      toast.success('Individual client created successfully');
      navigate('/crm/clients');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create client');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'prospect', label: 'Prospect' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm/clients')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Individual Client</h1>
          <p className="text-[var(--text-muted)] mt-1">Add a new individual client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h2>
            
            <Input
              label="Full Name *"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
            
            <Input
              label="NIK (ID Card Number)"
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              placeholder="16 digits"
              maxLength={16}
            />
            
            <Input
              label="NPWP (Tax ID)"
              value={formData.npwp}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
            />
            
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />
            
            <Input
              label="Occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            />
            
            <Select
              label="Status"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
            Create Client
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
            title="Client Created Successfully"
          >
            <div className="space-y-4">
              <p className="text-[var(--text-primary)]">
                Client <strong>{data?.fullName}</strong> has been created.
              </p>
            <p className="text-sm text-[var(--text-muted)]">
              Would you like to send an invitation to this client?
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
                  navigate(`/crm/clients/individual/${data?.id}`);
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
