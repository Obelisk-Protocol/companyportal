import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatAmount } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { Gift, Eye, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Grants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user && (user.role === 'admin' || user.role === 'hr');

  const { data: grants, isLoading } = useQuery({
    queryKey: ['grants'],
    queryFn: () => api.get<any[]>('/grants'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'draft':
        return <span className="badge badge-warning">Draft</span>;
      case 'closed':
        return <span className="badge badge-neutral">Closed</span>;
      case 'archived':
        return <span className="badge badge-neutral">Archived</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Grants</h1>
          <p className="text-[var(--text-secondary)]">Transparency for grant funds: wallet audit, deductions, and owners</p>
        </div>
        {canManage && (
          <Button onClick={() => navigate('/grants/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Grant
          </Button>
        )}
      </div>

      <Card>
        {grants && grants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Grant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Last audit</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {grants.map((grant: any) => (
                <TableRow key={grant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{grant.name}</p>
                      {grant.description && (
                        <p className="text-sm text-[var(--text-muted)] line-clamp-1">{grant.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(grant.status)}</TableCell>
                  <TableCell>
                    {grant.wallet ? (
                      <span className="font-mono text-xs text-[var(--text-secondary)]">
                        {grant.wallet.walletAddress.slice(0, 6)}…{grant.wallet.walletAddress.slice(-4)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grant.latestAudit ? (
                      <span className="text-[var(--text-primary)]">
                        {formatAmount(grant.latestAudit.totalInbound ?? 0, 'SOL')}
                        {grant.latestAudit.balanceUsdc != null && Number(grant.latestAudit.balanceUsdc) > 0 && (
                          <span className="ml-1">{formatAmount(grant.latestAudit.balanceUsdc, 'USDC')}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">No audit</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grant.totalDeductions != null && grant.totalDeductions > 0
                      ? formatAmount(grant.totalDeductions, grant.currency)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/grants/${grant.slug || grant.id}`)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-16">
            <Gift className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No grants yet</h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
              {canManage ? 'Create a grant to track funding, run on-chain wallet audits, add deductions, and assign founders/owners for full transparency.' : 'No grants have been published yet.'}
            </p>
            {canManage && (
              <Button onClick={() => navigate('/grants/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first grant
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
