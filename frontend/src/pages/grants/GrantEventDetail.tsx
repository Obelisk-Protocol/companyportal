import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatAmount, formatShortDate, getEventSpendingCategoryLabel } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  MapPin,
  Users,
  Link2,
  Receipt,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const SPENDING_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'food_drinks', label: 'Food & Drinks' },
  { value: 'video_photography', label: 'Video / Photography' },
  { value: 'travel', label: 'Travel' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'labor_organisers', label: 'Labor (Organisers)' },
  { value: 'other', label: 'Other' },
];

export default function GrantEventDetail() {
  const { slug, eventId } = useParams<{ slug: string; eventId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showSpendingModal, setShowSpendingModal] = useState(false);
  const [editingSpendingId, setEditingSpendingId] = useState<string | null>(null);
  const [spendingForm, setSpendingForm] = useState({
    category: 'venue' as const,
    amount: '',
    description: '',
    receiptUrl: '',
    spentAt: new Date().toISOString().split('T')[0],
  });
  const [showEventEditModal, setShowEventEditModal] = useState(false);
  const [eventEditForm, setEventEditForm] = useState({
    title: '',
    amountReceived: '',
    eventDate: '',
    location: '',
    lumaUrl: '',
    creatixUrl: '',
    attendeesCount: '',
    description: '',
    status: 'draft' as 'draft' | 'submitted',
  });
  const [isUploading, setIsUploading] = useState(false);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['grant-event', slug, eventId],
    queryFn: () => api.get<any>(`/grants/${slug}/events/${eventId}`),
    enabled: !!slug && !!eventId,
  });

  const canManage = event?.canManage ?? false;

  const addSpendingMutation = useMutation({
    mutationFn: (body: any) =>
      api.post(`/grants/${slug}/events/${eventId}/spendings`, {
        ...body,
        amount: parseFloat(body.amount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-event', slug, eventId] });
      setShowSpendingModal(false);
      resetSpendingForm();
      toast.success('Spending added');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add spending'),
  });

  const updateSpendingMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put(`/grants/${slug}/events/${eventId}/spendings/${id}`, {
        ...body,
        amount: body.amount != null ? parseFloat(String(body.amount)) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-event', slug, eventId] });
      setShowSpendingModal(false);
      setEditingSpendingId(null);
      resetSpendingForm();
      toast.success('Spending updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const deleteSpendingMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/grants/${slug}/events/${eventId}/spendings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-event', slug, eventId] });
      toast.success('Spending removed');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove'),
  });

  const updateEventMutation = useMutation({
    mutationFn: (body: any) => api.put(`/grants/${slug}/events/${eventId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant-event', slug, eventId] });
      setShowEventEditModal(false);
      toast.success('Event updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update'),
  });

  const resetSpendingForm = () => {
    setSpendingForm({
      category: 'venue',
      amount: '',
      description: '',
      receiptUrl: '',
      spentAt: new Date().toISOString().split('T')[0],
    });
  };

  const openEditSpending = (s: any) => {
    setEditingSpendingId(s.id);
    setSpendingForm({
      category: s.category,
      amount: String(s.amount),
      description: s.description || '',
      receiptUrl: s.receiptUrl || '',
      spentAt: s.spentAt,
    });
    setShowSpendingModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await api.upload<{ url: string }>('/upload/receipt', file);
      setSpendingForm({ ...spendingForm, receiptUrl: result.url });
      toast.success('Receipt uploaded');
    } catch {
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Event not found.</p>
        <Button className="mt-4" onClick={() => navigate(`/grants/${slug}`)}>
          Back to Grant
        </Button>
      </div>
    );
  }

  const currency = event.currency || 'USDC';
  const totalSpent = event.totalSpent ?? event.spendings?.reduce((s: number, sp: any) => s + parseFloat(String(sp.amount)), 0) ?? 0;
  const amountReceived = parseFloat(String(event.amountReceived));
  const diff = amountReceived - totalSpent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/grants/${slug}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{event.title}</h1>
            <p className="text-[var(--text-secondary)]">
              {formatShortDate(event.eventDate)} · {formatAmount(event.amountReceived, currency)}
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => {
            setEventEditForm({
              title: event.title,
              amountReceived: String(event.amountReceived),
              eventDate: event.eventDate,
              location: event.location || '',
              lumaUrl: event.lumaUrl || '',
              creatixUrl: event.creatixUrl || '',
              attendeesCount: event.attendeesCount != null ? String(event.attendeesCount) : '',
              description: event.description || '',
              status: event.status || 'draft',
            });
            setShowEventEditModal(true);
          }}>
            Edit event
          </Button>
        )}
      </div>

      {/* Event details */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Event details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)]">Amount received</p>
            <p className="font-medium text-[var(--text-primary)]">{formatAmount(event.amountReceived, currency)}</p>
          </div>
          {event.location && (
            <div className="col-span-2 flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-[var(--text-muted)]" />
              <p className="text-[var(--text-primary)]">{event.location}</p>
            </div>
          )}
          {event.attendeesCount != null && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--text-muted)]" />
              <p className="font-medium text-[var(--text-primary)]">{event.attendeesCount} attendees</p>
            </div>
          )}
        </div>
        {(event.lumaUrl || event.creatixUrl) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {event.lumaUrl && (
              <a
                href={event.lumaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
              >
                <Link2 className="w-4 h-4" /> Luma event
              </a>
            )}
            {event.creatixUrl && (
              <a
                href={event.creatixUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] hover:underline"
              >
                <Link2 className="w-4 h-4" /> Creatix event
              </a>
            )}
          </div>
        )}
        {event.description && (
          <p className="mt-4 text-[var(--text-secondary)]">{event.description}</p>
        )}
      </Card>

      {/* Spendings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Spendings
          </h2>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => { resetSpendingForm(); setEditingSpendingId(null); setShowSpendingModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add spending
            </Button>
          )}
        </div>

        {event.spendings?.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt</TableHead>
                {canManage && <TableHead>Actions</TableHead>}
              </TableHeader>
              <TableBody>
                {event.spendings.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatShortDate(s.spentAt)}</TableCell>
                    <TableCell>{getEventSpendingCategoryLabel(s.category)}</TableCell>
                    <TableCell>{s.description || '—'}</TableCell>
                    <TableCell>{formatAmount(s.amount, s.currency || currency)}</TableCell>
                    <TableCell>
                      {s.receiptUrl ? (
                        <a
                          href={s.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-[var(--accent-primary)] hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditSpending(s)}>Edit</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSpendingMutation.mutate(s.id)}
                            disabled={deleteSpendingMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 p-4 rounded-lg bg-[var(--bg-secondary)] flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Total spent</p>
                <p className="font-bold text-[var(--text-primary)]">{formatAmount(totalSpent, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Amount received</p>
                <p className="font-medium text-[var(--text-primary)]">{formatAmount(amountReceived, currency)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Difference</p>
                <p className={`font-medium ${diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {diff >= 0 ? '+' : ''}{formatAmount(diff, currency)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No spendings recorded yet.</p>
            {canManage && (
              <Button variant="outline" className="mt-4" onClick={() => setShowSpendingModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add first spending
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Add/Edit spending modal */}
      <Modal
        isOpen={showSpendingModal}
        onClose={() => { setShowSpendingModal(false); setEditingSpendingId(null); resetSpendingForm(); }}
        title={editingSpendingId ? 'Edit spending' : 'Add spending'}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Category"
            value={spendingForm.category}
            onChange={(e) => setSpendingForm({ ...spendingForm, category: e.target.value as any })}
            options={SPENDING_CATEGORIES}
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            min="0"
            value={spendingForm.amount}
            onChange={(e) => setSpendingForm({ ...spendingForm, amount: e.target.value })}
            placeholder="0"
            required
          />
          <Input
            label="Date"
            type="date"
            value={spendingForm.spentAt}
            onChange={(e) => setSpendingForm({ ...spendingForm, spentAt: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[60px]"
              value={spendingForm.description}
              onChange={(e) => setSpendingForm({ ...spendingForm, description: e.target.value })}
              placeholder="Optional notes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Receipt (optional)</label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="text-sm text-[var(--text-secondary)]"
              />
              {spendingForm.receiptUrl && (
                <a
                  href={spendingForm.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--accent-primary)] hover:underline"
                >
                  View
                </a>
              )}
            </div>
            {isUploading && <p className="text-sm text-[var(--text-muted)] mt-1">Uploading…</p>}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => { setShowSpendingModal(false); setEditingSpendingId(null); resetSpendingForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSpendingId) {
                  updateSpendingMutation.mutate({
                    id: editingSpendingId,
                    body: spendingForm,
                  });
                } else {
                  addSpendingMutation.mutate(spendingForm);
                }
              }}
              disabled={!spendingForm.amount || addSpendingMutation.isPending || updateSpendingMutation.isPending}
              isLoading={addSpendingMutation.isPending || updateSpendingMutation.isPending}
            >
              {editingSpendingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit event modal */}
      <Modal isOpen={showEventEditModal} onClose={() => setShowEventEditModal(false)} title="Edit event" size="md">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Input
            label="Event title"
            value={eventEditForm.title}
            onChange={(e) => setEventEditForm({ ...eventEditForm, title: e.target.value })}
          />
          <Input
            label="Amount received"
            type="number"
            step="0.01"
            value={eventEditForm.amountReceived}
            onChange={(e) => setEventEditForm({ ...eventEditForm, amountReceived: e.target.value })}
          />
          <Input
            label="Event date"
            type="date"
            value={eventEditForm.eventDate}
            onChange={(e) => setEventEditForm({ ...eventEditForm, eventDate: e.target.value })}
          />
          <Input
            label="Location"
            value={eventEditForm.location}
            onChange={(e) => setEventEditForm({ ...eventEditForm, location: e.target.value })}
          />
          <Input
            label="Luma URL"
            type="url"
            value={eventEditForm.lumaUrl}
            onChange={(e) => setEventEditForm({ ...eventEditForm, lumaUrl: e.target.value })}
          />
          <Input
            label="Creatix URL"
            type="url"
            value={eventEditForm.creatixUrl}
            onChange={(e) => setEventEditForm({ ...eventEditForm, creatixUrl: e.target.value })}
          />
          <Input
            label="Attendees count"
            type="number"
            min="0"
            value={eventEditForm.attendeesCount}
            onChange={(e) => setEventEditForm({ ...eventEditForm, attendeesCount: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[80px]"
              value={eventEditForm.description}
              onChange={(e) => setEventEditForm({ ...eventEditForm, description: e.target.value })}
            />
          </div>
          <Select
            label="Status"
            value={eventEditForm.status}
            onChange={(e) => setEventEditForm({ ...eventEditForm, status: e.target.value as any })}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowEventEditModal(false)}>Cancel</Button>
            <Button
              onClick={() =>
                updateEventMutation.mutate({
                  title: eventEditForm.title,
                  amountReceived: parseFloat(eventEditForm.amountReceived),
                  eventDate: eventEditForm.eventDate,
                  location: eventEditForm.location || undefined,
                  lumaUrl: eventEditForm.lumaUrl || undefined,
                  creatixUrl: eventEditForm.creatixUrl || undefined,
                  attendeesCount: eventEditForm.attendeesCount ? parseInt(eventEditForm.attendeesCount, 10) : undefined,
                  description: eventEditForm.description || undefined,
                  status: eventEditForm.status,
                })
              }
              disabled={updateEventMutation.isPending}
              isLoading={updateEventMutation.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
