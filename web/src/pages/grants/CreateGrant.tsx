import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { ArrowLeft, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function CreateGrant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'closed' | 'archived',
    currency: 'SOL',
    expectedAmount: '',
    startDate: '',
    endDate: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/grants', data),
    onSuccess: (grant: any) => {
      queryClient.invalidateQueries({ queryKey: ['grants'] });
      toast.success('Grant created');
      navigate(`/grants/${grant.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create grant');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Grant name is required');
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      currency: formData.currency,
      expectedAmount: formData.expectedAmount ? parseFloat(formData.expectedAmount) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/grants')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Grant</h1>
        <p className="text-[var(--text-secondary)]">Set up a new grant for transparency tracking</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <Input
            label="Grant name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Superteam Q1 2024"
            required
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[80px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of the grant"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'closed', label: 'Closed' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'SOL', label: 'SOL' },
                { value: 'USDC', label: 'USDC' },
              ]}
            />
          </div>
          <Input
            label="Expected amount (optional)"
            type="number"
            step="any"
            value={formData.expectedAmount}
            onChange={(e) => setFormData({ ...formData, expectedAmount: e.target.value })}
            placeholder="e.g. 1000"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="End date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Grant'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/grants')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
