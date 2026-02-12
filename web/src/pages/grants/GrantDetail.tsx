import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatAmount, formatShortDate } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import {
  ArrowLeft,
  Wallet,
  FileCheck,
  Plus,
  Trash2,
  RefreshCw,
  Users,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function GrantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [walletInput, setWalletInput] = useState('');
  const [walletLabel, setWalletLabel] = useState('');
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    amount: '',
    category: 'operational' as 'platform_fee' | 'tax' | 'operational' | 'other',
    description: '',
    deductedAt: new Date().toISOString().split('T')[0],
  });
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'founder' as 'owner' | 'founder' | 'viewer' });

  const { data: grant, isLoading, error } = useQuery({
    queryKey: ['grant', id],
    queryFn: () => api.get<any>(`/grants/${id}`),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ['grants-users-for-members'],
    queryFn: () => api.get<any[]>('/grants/users-for-members'),
    enabled: showMemberModal,
  });

  const setWalletMutation = useMutation({
    mutationFn: (body: { walletAddress: string; label?: string }) => api.post(`/grants/${id}/wallet`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      setWalletInput('');
      setWalletLabel('');
      toast.success('Wallet updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to set wallet'),
  });

  const runAuditMutation = useMutation({
    mutationFn: () => api.post(`/grants/${id}/audit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      toast.success('Audit complete');
    },
    onError: (err: any) => toast.error(err?.message || 'Audit failed'),
  });

  const addDeductionMutation = useMutation({
    mutationFn: (body: any) => api.post(`/grants/${id}/deductions`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      setShowDeductionModal(false);
      setDeductionForm({
        amount: '',
        category: 'operational',
        description: '',
        deductedAt: new Date().toISOString().split('T')[0],
      });
      toast.success('Deduction added');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add deduction'),
  });

  const deleteDeductionMutation = useMutation({
    mutationFn: (deductionId: string) => api.delete(`/grants/${id}/deductions/${deductionId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      toast.success('Deduction removed');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove'),
  });

  const addMemberMutation = useMutation({
    mutationFn: (body: { userId: string; role: string }) => api.post(`/grants/${id}/members`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      setShowMemberModal(false);
      setMemberForm({ userId: '', role: 'founder' });
      toast.success('Member added');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to add member'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/grants/${id}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grant', id] });
      toast.success('Member removed');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to remove'),
  });

  if (isLoading || !grant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Grant not found.</p>
        <Button className="mt-4" onClick={() => navigate('/grants')}>
          Back to Grants
        </Button>
      </div>
    );
  }

  const currency = grant.currency || 'SOL';
  const explorerUrl = (addr: string) => `https://explorer.solana.com/address/${addr}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/grants')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{grant.name}</h1>
            <p className="text-[var(--text-secondary)]">
              {grant.status} · {currency}
              {grant.expectedAmount != null && ` · Expected ${formatAmount(grant.expectedAmount, currency)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Overview */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Overview</h2>
        {grant.description && (
          <p className="text-[var(--text-secondary)] mb-4">{grant.description}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[var(--text-muted)]">Status</p>
            <p className="font-medium text-[var(--text-primary)] capitalize">{grant.status}</p>
          </div>
          {grant.startDate && (
            <div>
              <p className="text-[var(--text-muted)]">Start</p>
              <p className="font-medium text-[var(--text-primary)]">{formatShortDate(grant.startDate)}</p>
            </div>
          )}
          {grant.endDate && (
            <div>
              <p className="text-[var(--text-muted)]">End</p>
              <p className="font-medium text-[var(--text-primary)]">{formatShortDate(grant.endDate)}</p>
            </div>
          )}
          {grant.summary && (
            <>
              <div>
                <p className="text-[var(--text-muted)]">Funds received (audit)</p>
                <p className="font-medium text-[var(--text-primary)]">{formatAmount(grant.summary.fundsReceived, currency)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Total deductions</p>
                <p className="font-medium text-[var(--text-primary)]">{formatAmount(grant.summary.totalDeductions, currency)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Net for project</p>
                <p className="font-medium text-[var(--text-primary)]">{formatAmount(grant.summary.netForProject, currency)}</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Wallet & Audit */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet & on-chain audit
        </h2>
        {grant.wallet ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-[var(--text-secondary)] break-all">{grant.wallet.walletAddress}</span>
              <a
                href={explorerUrl(grant.wallet.walletAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 text-sm"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {grant.latestAudit && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-[var(--bg-secondary)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Inbound</p>
                  <p className="font-medium text-[var(--text-primary)]">{formatAmount(grant.latestAudit.totalInbound, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Outbound</p>
                  <p className="font-medium text-[var(--text-primary)]">{formatAmount(grant.latestAudit.totalOutbound, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Balance at audit</p>
                  <p className="font-medium text-[var(--text-primary)]">
                    {grant.latestAudit.balanceAtAudit != null ? formatAmount(grant.latestAudit.balanceAtAudit, currency) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Transactions</p>
                  <p className="font-medium text-[var(--text-primary)]">{grant.latestAudit.transactionCount ?? 0}</p>
                </div>
              </div>
            )}
            <Button
              onClick={() => runAuditMutation.mutate()}
              disabled={runAuditMutation.isPending}
              isLoading={runAuditMutation.isPending}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Run on-chain audit
            </Button>
            {grant.audits?.length > 1 && (
              <div className="pt-4 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)] mb-2">Audit history</p>
                <ul className="text-sm space-y-1">
                  {grant.audits.slice(1, 6).map((a: any) => (
                    <li key={a.id} className="text-[var(--text-secondary)]">
                      {formatShortDate(a.auditRunAt)} — In: {formatAmount(a.totalInbound, currency)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">Set the Solana wallet that received the grant funds.</p>
            <Input
              label="Wallet address"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            />
            <Input
              label="Label (optional)"
              value={walletLabel}
              onChange={(e) => setWalletLabel(e.target.value)}
              placeholder="e.g. Primary funding wallet"
            />
            <Button
              onClick={() => setWalletMutation.mutate({ walletAddress: walletInput.trim(), label: walletLabel.trim() || undefined })}
              disabled={!walletInput.trim() || setWalletMutation.isPending}
              isLoading={setWalletMutation.isPending}
            >
              Save wallet
            </Button>
          </div>
        )}
      </Card>

      {/* Deductions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Deductions
        </h2>
        {grant.deductions?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {grant.deductions.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{formatShortDate(d.deductedAt)}</TableCell>
                  <TableCell>{formatAmount(d.amount, d.currency || currency)}</TableCell>
                  <TableCell className="capitalize">{d.category.replace('_', ' ')}</TableCell>
                  <TableCell>{d.description || '—'}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDeductionMutation.mutate(d.id)}
                      disabled={deleteDeductionMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--text-muted)] mb-4">No deductions yet.</p>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowDeductionModal(true)} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add deduction
        </Button>
      </Card>

      {/* Members */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Founders / owners
        </h2>
        {grant.members?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeader>
            <TableBody>
              {grant.members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>{m.user?.email ?? m.userId}</TableCell>
                  <TableCell className="capitalize">{m.role}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMemberMutation.mutate(m.userId)}
                      disabled={removeMemberMutation.isPending}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[var(--text-muted)] mb-4">No members assigned yet.</p>
        )}
        <Button variant="outline" size="sm" onClick={() => setShowMemberModal(true)} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add member
        </Button>
      </Card>

      {/* Add deduction modal */}
      <Modal isOpen={showDeductionModal} onClose={() => setShowDeductionModal(false)} title="Add deduction" size="md">
        <div className="space-y-4">
          <Input
            label="Amount"
            type="number"
            step="any"
            value={deductionForm.amount}
            onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
            placeholder="0"
          />
          <Input
            label="Date"
            type="date"
            value={deductionForm.deductedAt}
            onChange={(e) => setDeductionForm({ ...deductionForm, deductedAt: e.target.value })}
          />
          <Select
            label="Category"
            value={deductionForm.category}
            onChange={(e) => setDeductionForm({ ...deductionForm, category: e.target.value as any })}
            options={[
              { value: 'platform_fee', label: 'Platform fee' },
              { value: 'tax', label: 'Tax' },
              { value: 'operational', label: 'Operational' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-[60px]"
              value={deductionForm.description}
              onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowDeductionModal(false)}>Cancel</Button>
            <Button
              onClick={() =>
                addDeductionMutation.mutate({
                  amount: parseFloat(deductionForm.amount) || 0,
                  category: deductionForm.category,
                  description: deductionForm.description || undefined,
                  deductedAt: deductionForm.deductedAt,
                })
              }
              disabled={!deductionForm.amount || addDeductionMutation.isPending}
              isLoading={addDeductionMutation.isPending}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add member modal */}
      <Modal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} title="Add member" size="md">
        <div className="space-y-4">
          <Select
            label="User"
            value={memberForm.userId}
            onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}
            options={[
              { value: '', label: 'Select user…' },
              ...(users || [])
                .filter((u: any) => !grant.members?.some((m: any) => m.userId === u.id))
                .map((u: any) => ({ value: u.id, label: u.email })),
            ]}
          />
          <Select
            label="Role"
            value={memberForm.role}
            onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as any })}
            options={[
              { value: 'owner', label: 'Owner' },
              { value: 'founder', label: 'Founder' },
              { value: 'viewer', label: 'Viewer' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowMemberModal(false)}>Cancel</Button>
            <Button
              onClick={() => addMemberMutation.mutate(memberForm)}
              disabled={!memberForm.userId || addMemberMutation.isPending}
              isLoading={addMemberMutation.isPending}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
