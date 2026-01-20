import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table';
import { FileSignature, Eye, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function Contracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', isEmployee ? 'employee' : isClient ? 'client' : 'all'],
    queryFn: () => api.get<any[]>(isEmployee ? '/contracts?category=employee' : isClient ? '/contracts?category=client' : '/contracts'),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-neutral">Draft</span>;
      case 'sent':
        return <span className="badge badge-warning">Pending Signature</span>;
      case 'signed':
        return <span className="badge badge-info">Signed</span>;
      case 'active':
        return <span className="badge badge-success">Active</span>;
      case 'expired':
        return <span className="badge badge-error">Expired</span>;
      case 'terminated':
        return <span className="badge badge-error">Terminated</span>;
      case 'cancelled':
        return <span className="badge badge-neutral">Cancelled</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="w-4 h-4" />;
      case 'signed':
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
      case 'terminated':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-900 dark:text-white">
          {isEmployee ? 'My Contracts' : isClient ? 'Contracts' : 'Contracts'}
        </h1>
        <p className="text-neutral-500">View and manage your contracts</p>
      </div>

      <Card>
        {contracts && contracts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>{isEmployee ? 'Employee' : isClient ? 'Client' : 'Party'}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract: any) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-900 dark:text-white">{contract.title}</p>
                      <p className="text-sm text-neutral-500">{contract.contractNumber}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.client ? (
                      <div>
                        <p className="text-neutral-900 dark:text-neutral-900 dark:text-white">{contract.client.name || contract.client.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          {contract.client.type === 'company' ? 'Company' : 'Individual'}
                        </p>
                      </div>
                    ) : contract.employee ? (
                      <div>
                        <p className="text-neutral-900 dark:text-neutral-900 dark:text-white">{contract.employee.fullName}</p>
                        <p className="text-xs text-neutral-500">
                          Employee #{contract.employee.employeeNumber}
                        </p>
                      </div>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-neutral-400 capitalize">
                      {contract.contractType || 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contract.value ? (
                      <span className="font-medium text-neutral-900 dark:text-neutral-900 dark:text-white">
                        {formatRupiah(parseFloat(contract.value))}
                      </span>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-neutral-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(contract.startDate).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contract.endDate ? (
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(contract.endDate).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-500">Open-ended</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(contract.status)}
                      {getStatusBadge(contract.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(isEmployee ? `/my-contracts/${contract.id}` : `/contracts/${contract.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <FileSignature className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-500">No contracts found</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
