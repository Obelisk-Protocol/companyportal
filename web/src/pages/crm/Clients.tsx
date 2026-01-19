import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, getStatusBadgeClass, getStatusLabel } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import { Plus, Building2, User, Search, Filter } from 'lucide-react';

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['crm-clients', statusFilter, typeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (search) params.append('search', search);
      
      return api.get<any[]>(`/crm/clients?${params.toString()}`);
    },
  });

  const filteredClients = clients || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Clients</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage your client companies and individuals</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/crm/clients/new/individual')}
          >
            <User className="w-4 h-4 mr-2" />
            Add Individual
          </Button>
          <Button onClick={() => navigate('/crm/clients/new/company')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
            <option value="lead">Lead</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20"
          >
            <option value="">All Types</option>
            <option value="company">Companies</option>
            <option value="individual">Individuals</option>
          </select>
        </div>
      </Card>

      {/* Clients List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[var(--text-muted)]">No clients found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client: any) => (
            <Card
              key={client.id}
              className="p-6 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
              onClick={() => navigate(`/crm/clients/${client.clientType === 'company' ? 'company' : 'individual'}/${client.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {client.clientType === 'company' ? (
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">
                      {client.clientType === 'company' ? client.name : client.fullName}
                    </h3>
                    {client.clientType === 'company' && client.legalName && (
                      <p className="text-sm text-[var(--text-muted)]">{client.legalName}</p>
                    )}
                  </div>
                </div>
                <span className={`badge ${getStatusBadgeClass(client.status)}`}>
                  {getStatusLabel(client.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {client.email && (
                  <p className="text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">Email:</span> {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">Phone:</span> {client.phone}
                  </p>
                )}
                {client.city && (
                  <p className="text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">Location:</span> {client.city}
                    {client.province && `, ${client.province}`}
                  </p>
                )}
                {client.clientType === 'company' && client.companyType && (
                  <p className="text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">Type:</span> {client.companyType}
                  </p>
                )}
                {client.clientType === 'individual' && client.occupation && (
                  <p className="text-[var(--text-secondary)]">
                    <span className="text-[var(--text-muted)]">Occupation:</span> {client.occupation}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Created {formatDate(client.createdAt)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
