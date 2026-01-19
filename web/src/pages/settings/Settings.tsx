import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Building, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Settings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    npwp: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    jkkRiskLevel: 0.24,
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: () => api.get<any>('/company').catch(() => null),
  });

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        npwp: company.npwp || '',
        address: company.address || '',
        city: company.city || '',
        province: company.province || '',
        postalCode: company.postalCode || '',
        phone: company.phone || '',
        email: company.email || '',
        jkkRiskLevel: parseFloat(company.jkkRiskLevel) || 0.24,
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.put('/company', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-neutral-500">Company configuration</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-white" />
            <h3 className="font-semibold text-white">Company Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Company Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="PT Company Name"
              required
            />
            <Input
              label="NPWP (Tax ID)"
              value={formData.npwp}
              onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              required
            />
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Sudirman No. 1"
              />
            </div>
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Jakarta"
            />
            <Input
              label="Province"
              value={formData.province}
              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
              placeholder="DKI Jakarta"
            />
            <Input
              label="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="10110"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+62 21 1234567"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@company.com"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                JKK Risk Level (%)
              </label>
              <select
                value={formData.jkkRiskLevel}
                onChange={(e) => setFormData({ ...formData, jkkRiskLevel: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value={0.24}>0.24% - Group I (Very Low Risk)</option>
                <option value={0.54}>0.54% - Group II (Low Risk)</option>
                <option value={0.89}>0.89% - Group III (Medium Risk)</option>
                <option value={1.27}>1.27% - Group IV (High Risk)</option>
                <option value={1.74}>1.74% - Group V (Very High Risk)</option>
              </select>
              <p className="text-xs text-neutral-600 mt-1">
                Based on workplace accident risk level in your industry
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button type="submit" isLoading={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </Card>
      </form>
    </motion.div>
  );
}
