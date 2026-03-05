import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function CreateEventGrant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    amountReceived: '',
    currency: 'USDC',
    eventDate: new Date().toISOString().split('T')[0],
    location: '',
    lumaUrl: '',
    creatixUrl: '',
    attendeesCount: '',
    description: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api.post('/event-grants', {
        ...data,
        amountReceived: parseFloat(data.amountReceived),
        attendeesCount: data.attendeesCount ? parseInt(data.attendeesCount, 10) : undefined,
        lumaUrl: data.lumaUrl || undefined,
        creatixUrl: data.creatixUrl || undefined,
      }),
    onSuccess: (event: any) => {
      queryClient.invalidateQueries({ queryKey: ['event-grants'] });
      toast.success('Event grant created');
      navigate(`/event-grants/${event.id}`);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create event grant'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    if (!formData.amountReceived || parseFloat(formData.amountReceived) <= 0) {
      toast.error('Amount received is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/event-grants')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">New event grant</h1>
        <p className="text-[var(--text-secondary)]">
          Submit the amount received from Superteam and event details for accountability.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Amount received</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Amount received from Superteam *"
              type="number"
              step="0.01"
              min="0"
              value={formData.amountReceived}
              onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
              placeholder="e.g. 500"
              required
            />
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              options={[
                { value: 'USDC', label: 'USDC' },
                { value: 'SOL', label: 'SOL' },
              ]}
            />
          </div>

          <h2 className="text-lg font-semibold text-[var(--text-primary)] pt-4">Event details</h2>
          <Input
            label="Event title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Jakarta Solana Meetup March 2025"
            required
          />
          <Input
            label="Event date *"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
            required
          />
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g. Jakarta, Indonesia"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Luma event link"
              type="url"
              value={formData.lumaUrl}
              onChange={(e) => setFormData({ ...formData, lumaUrl: e.target.value })}
              placeholder="https://lu.ma/..."
            />
            <Input
              label="Creatix event link"
              type="url"
              value={formData.creatixUrl}
              onChange={(e) => setFormData({ ...formData, creatixUrl: e.target.value })}
              placeholder="https://creatix.io/..."
            />
          </div>
          <Input
            label="Attendees count"
            type="number"
            min="0"
            value={formData.attendeesCount}
            onChange={(e) => setFormData({ ...formData, attendeesCount: e.target.value })}
            placeholder="e.g. 50"
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description / Additional proof
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the event and how it benefited Superteam..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create & Add spendings'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/event-grants')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
