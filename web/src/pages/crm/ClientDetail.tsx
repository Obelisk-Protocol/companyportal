import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { ArrowLeft, Mail, Building2, User, Edit } from 'lucide-react';
import { useState } from 'react';

export default function ClientDetail() {
  const { type, id } = useParams<{ type: 'company' | 'individual'; id: string }>();
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');

  const { data: client, isLoading } = useQuery({
    queryKey: [`crm-client-${type}`, id],
    queryFn: async () => {
      if (type === 'company') {
        return api.get<any>(`/crm/clients/companies/${id}`);
      } else {
        return api.get<any>(`/crm/clients/individuals/${id}`);
      }
    },
    enabled: !!id && !!type,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string }) => {
      if (type === 'company') {
        return api.post(`/crm/clients/companies/${id}/invite`, data);
      } else {
        return api.post(`/crm/clients/individuals/${id}/invite`, { email: data.email });
      }
    },
    onSuccess: (data) => {
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'company') {
      if (!inviteEmail || !inviteName) {
        toast.error('Email and name are required');
        return;
      }
      inviteMutation.mutate({ email: inviteEmail, name: inviteName });
    } else {
      if (!inviteEmail && !client?.email) {
        toast.error('Email is required');
        return;
      }
      inviteMutation.mutate({ email: inviteEmail || client?.email });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Client not found</p>
        <Button variant="outline" onClick={() => navigate('/crm/clients')} className="mt-4">
          Back to Clients
        </Button>
      </div>
    );
  }

  const isCompany = type === 'company';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/crm/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {isCompany ? client.name : client.fullName}
            </h1>
            <p className="text-[var(--text-muted)] mt-1">
              {isCompany ? 'Company Client' : 'Individual Client'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowInviteModal(true)}>
            <Mail className="w-4 h-4 mr-2" />
            Send Invitation
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              {isCompany ? (
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isCompany ? client.name : client.fullName}
                </h2>
                {isCompany && client.legalName && (
                  <p className="text-sm text-[var(--text-muted)]">{client.legalName}</p>
                )}
              </div>
              <span className={`badge ${getStatusBadgeClass(client.status)} ml-auto`}>
                {getStatusLabel(client.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {client.email && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Email</p>
                  <p className="text-[var(--text-primary)]">{client.email}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Phone</p>
                  <p className="text-[var(--text-primary)]">{client.phone}</p>
                </div>
              )}
              {isCompany && client.companyType && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Company Type</p>
                  <p className="text-[var(--text-primary)]">{client.companyType}</p>
                </div>
              )}
              {isCompany && client.npwp && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">NPWP</p>
                  <p className="text-[var(--text-primary)]">{client.npwp}</p>
                </div>
              )}
              {!isCompany && client.nik && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">NIK</p>
                  <p className="text-[var(--text-primary)]">{client.nik}</p>
                </div>
              )}
              {!isCompany && client.occupation && (
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Occupation</p>
                  <p className="text-[var(--text-primary)]">{client.occupation}</p>
                </div>
              )}
            </div>

            {client.solanaWallet && (
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)] mb-2">Solana Wallet Address</p>
                <p className="text-[var(--text-primary)] font-mono text-sm break-all">{client.solanaWallet}</p>
              </div>
            )}

            {(client.address || client.city) && (
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)] mb-2">Address</p>
                <p className="text-[var(--text-primary)]">
                  {client.address}
                  {client.city && `, ${client.city}`}
                  {client.province && `, ${client.province}`}
                  {client.postalCode && ` ${client.postalCode}`}
                </p>
              </div>
            )}
          </Card>

          {/* Company Contacts */}
          {isCompany && client.contacts && client.contacts.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contacts</h3>
              <div className="space-y-3">
                {client.contacts.map((contact: any) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{contact.name}</p>
                      {contact.position && (
                        <p className="text-sm text-[var(--text-muted)]">{contact.position}</p>
                      )}
                      {contact.email && (
                        <p className="text-sm text-[var(--text-secondary)]">{contact.email}</p>
                      )}
                    </div>
                    {contact.isPrimary && (
                      <span className="badge badge-success">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Created</p>
                <p className="text-[var(--text-primary)]">{formatDate(client.createdAt)}</p>
              </div>
              {isCompany && client.industry && (
                <div>
                  <p className="text-[var(--text-muted)]">Industry</p>
                  <p className="text-[var(--text-primary)]">{client.industry}</p>
                </div>
              )}
              {isCompany && client.size && (
                <div>
                  <p className="text-[var(--text-muted)]">Company Size</p>
                  <p className="text-[var(--text-primary)]">{client.size} employees</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Invitation Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Send Invitation"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          {isCompany ? (
            <>
              <Input
                label="Contact Name *"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                placeholder="e.g., John Doe"
              />
              <Input
                label="Email *"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                placeholder="contact@company.com"
              />
            </>
          ) : (
            <Input
              label="Email"
              type="email"
              value={inviteEmail || client.email || ''}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={client.email || 'client@example.com'}
              disabled={!!client.email}
            />
          )}
          <p className="text-sm text-[var(--text-muted)]">
            An invitation email will be sent to create an account and access the platform.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
