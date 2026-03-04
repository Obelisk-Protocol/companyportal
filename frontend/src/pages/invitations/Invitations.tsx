import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate, cn } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Plus, UserPlus, Copy, RefreshCw, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'hr', label: 'HR Manager' },
  { value: 'admin', label: 'Administrator' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'client', label: 'Client' },
];

type TabType = 'pending' | 'accepted' | 'cancelled';

export default function Invitations() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'employee',
  });

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: () => api.get<any[]>('/invitations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post<{ invitation: any; invitationLink: string }>('/invitations', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation created successfully');
      
      // Copy link to clipboard
      navigator.clipboard.writeText(data.invitationLink);
      toast.success('Invitation link copied to clipboard');
      
      setIsModalOpen(false);
      setFormData({ email: '', name: '', role: 'employee' });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create invitation');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => api.post<{ invitation: any; invitationLink: string }>(`/invitations/${id}/resend`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      navigator.clipboard.writeText(data.invitationLink);
      toast.success('Invitation resent, link copied to clipboard');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    },
  });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-white text-black';
      case 'hr':
        return 'bg-neutral-700 text-[var(--text-primary)]';
      case 'accountant':
        return 'bg-blue-600 text-[var(--text-primary)]';
      default:
        return 'bg-neutral-800 text-[var(--text-secondary)]';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'hr':
        return 'HR Manager';
      case 'accountant':
        return 'Accountant';
      case 'client':
        return 'Client';
      default:
        return 'Employee';
    }
  };

  // Filter invitations by status
  const filteredInvitations = invitations?.filter((invitation) => {
    if (activeTab === 'pending') {
      return invitation.status === 'pending';
    } else if (activeTab === 'accepted') {
      return invitation.status === 'accepted';
    } else if (activeTab === 'cancelled') {
      return invitation.status === 'cancelled';
    }
    return false;
  }) || [];

  const pendingCount = invitations?.filter((i) => i.status === 'pending').length || 0;
  const acceptedCount = invitations?.filter((i) => i.status === 'accepted').length || 0;
  const cancelledCount = invitations?.filter((i) => i.status === 'cancelled').length || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Invitations</h1>
          <p className="text-neutral-500">Manage user invitations</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invitation
        </Button>
      </div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium transition-colors relative',
              activeTab === 'pending'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Pending
            {pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-neutral-700 text-[var(--text-secondary)]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium transition-colors relative',
              activeTab === 'accepted'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Accepted
            {acceptedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-neutral-700 text-[var(--text-secondary)]">
                {acceptedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium transition-colors relative',
              activeTab === 'cancelled'
                ? 'text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            )}
          >
            Cancelled
            {cancelledCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-neutral-700 text-[var(--text-secondary)]">
                {cancelledCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--text-primary)]"></div>
            </div>
          ) : filteredInvitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {activeTab === 'pending' && <TableHead>Expires</TableHead>}
                {activeTab === 'accepted' && <TableHead>Accepted</TableHead>}
                {activeTab === 'cancelled' && <TableHead>Cancelled</TableHead>}
                <TableHead></TableHead>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium text-[var(--text-primary)]">{invitation.name}</TableCell>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    <span className={cn('badge', getRoleBadge(invitation.role))}>
                      {getRoleLabel(invitation.role)}
                    </span>
                  </TableCell>
                  {activeTab === 'pending' && (
                    <TableCell className="text-[var(--text-muted)]">{formatDate(invitation.expiresAt)}</TableCell>
                  )}
                  {activeTab === 'accepted' && (
                    <TableCell className="text-[var(--text-muted)]">{formatDate(invitation.updatedAt)}</TableCell>
                  )}
                  {activeTab === 'cancelled' && (
                    <TableCell className="text-[var(--text-muted)]">{formatDate(invitation.updatedAt)}</TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {activeTab === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(invitation.token)}
                            title="Copy link"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendMutation.mutate(invitation.id)}
                            title="Resend"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(invitation.id)}
                            title="Cancel"
                          >
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                          </Button>
                        </>
                      )}
                      {activeTab === 'accepted' && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {activeTab === 'cancelled' && (
                        <X className="w-5 h-5 text-neutral-500" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500">
                {activeTab === 'pending' && 'No pending invitations'}
                {activeTab === 'accepted' && 'No accepted invitations'}
                {activeTab === 'cancelled' && 'No cancelled invitations'}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormData({ email: '', name: '', role: 'employee' });
        }}
        title="Create New Invitation"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4"
        >
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Full name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
            required
          />
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={ROLE_OPTIONS}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setFormData({ email: '', name: '', role: 'employee' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
