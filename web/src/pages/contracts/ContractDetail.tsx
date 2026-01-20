import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatRupiah } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { FileSignature, Download, PenTool, CheckCircle, XCircle, Calendar, DollarSign, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => api.get<any>(`/contracts/${id}`),
    enabled: !!id,
  });

  const signMutation = useMutation({
    mutationFn: async (data: { signature: string; name: string }) => {
      return api.post(`/contracts/${id}/sign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setIsSignModalOpen(false);
      setSignatureName('');
      clearSignature();
      toast.success('Contract signed successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to sign contract');
    },
  });

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = () => {
    if (!signatureName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!hasSignature) {
      toast.error('Please provide your signature');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signature = canvas.toDataURL('image/png');
    signMutation.mutate({ signature, name: signatureName });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <FileSignature className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
        <p className="text-neutral-500">Contract not found</p>
        <Button onClick={() => navigate(user?.role === 'employee' ? '/my-contracts' : '/contracts')} className="mt-4">
          Back to Contracts
        </Button>
      </div>
    );
  }

  const canSign = (user?.role === 'client' || user?.role === 'employee') && contract.status === 'sent';
  const isSigned = contract.status === 'signed' || contract.status === 'active';
  const canSend = (user?.role === 'admin' || user?.role === 'hr') && contract.status === 'draft';
  
  const sendMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/send`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract sent successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.json?.error || 'Failed to send contract');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{contract.title}</h1>
          <p className="text-neutral-500">{contract.contractNumber}</p>
        </div>
        {canSign && (
          <Button onClick={() => setIsSignModalOpen(true)}>
            <PenTool className="w-4 h-4 mr-2" />
            Sign Contract
          </Button>
        )}
        {canSend && (
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Sending...' : 'Send for Signature'}
          </Button>
        )}
        {contract.signedDocumentUrl && (
          <Button
            variant="outline"
            onClick={() => window.open(contract.signedDocumentUrl, '_blank')}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Signed PDF
          </Button>
        )}
        {user?.role === 'admin' || user?.role === 'hr' ? (
          contract.status === 'signed' && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await api.post(`/contracts/${contract.id}/company-sign`);
                  queryClient.invalidateQueries({ queryKey: ['contract', id] });
                  queryClient.invalidateQueries({ queryKey: ['contracts'] });
                  toast.success('Contract signed by company');
                } catch (error: any) {
                  toast.error(error?.response?.json?.error || 'Failed to sign contract');
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Sign on Behalf of Company
            </Button>
          )
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Contract Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-neutral-400">
              <Calendar className="w-4 h-4" />
              <span>Start Date: {new Date(contract.startDate).toLocaleDateString()}</span>
            </div>
            {contract.endDate && (
              <div className="flex items-center gap-2 text-neutral-400">
                <Calendar className="w-4 h-4" />
                <span>End Date: {new Date(contract.endDate).toLocaleDateString()}</span>
              </div>
            )}
            {contract.value && (
              <div className="flex items-center gap-2 text-neutral-400">
                <DollarSign className="w-4 h-4" />
                <span>Value: {formatRupiah(parseFloat(contract.value))} {contract.currency}</span>
              </div>
            )}
            {contract.contractType && (
              <div>
                <span className="text-neutral-400">Type: </span>
                <span className="text-neutral-900 dark:text-white capitalize">{contract.contractType}</span>
              </div>
            )}
            {contract.paymentTerms && (
              <div>
                <span className="text-neutral-400">Payment Terms: </span>
                <span className="text-neutral-900 dark:text-white">{contract.paymentTerms}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Status</h3>
          <div className="space-y-3">
            <div>
              <span className="text-neutral-400">Status: </span>
              <span className={`badge ${
                contract.status === 'active' ? 'badge-success' :
                contract.status === 'sent' ? 'badge-warning' :
                contract.status === 'signed' ? 'badge-info' :
                'badge-neutral'
              }`}>
                {contract.status}
              </span>
            </div>
            {contract.signedByClientAt && (
              <div>
                <span className="text-neutral-400">Signed by Client: </span>
                <span className="text-neutral-900 dark:text-white">
                  {new Date(contract.signedByClientAt).toLocaleString()}
                </span>
              </div>
            )}
            {contract.signedByEmployeeAt && (
              <div>
                <span className="text-neutral-400">Signed by Employee: </span>
                <span className="text-neutral-900 dark:text-white">
                  {new Date(contract.signedByEmployeeAt).toLocaleString()}
                </span>
              </div>
            )}
            {contract.signedByCompanyAt && (
              <div>
                <span className="text-neutral-400">Signed by Company: </span>
                <span className="text-neutral-900 dark:text-white">
                  {new Date(contract.signedByCompanyAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {contract.description && (
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Description</h3>
          <p className="text-neutral-400 whitespace-pre-wrap">{contract.description}</p>
        </Card>
      )}

      {(contract.client || contract.employee) && (
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">
            {contract.client ? 'Client Information' : 'Employee Information'}
          </h3>
          <div className="space-y-2">
            {contract.client ? (
              <>
                <p className="text-neutral-900 dark:text-white">{contract.client.name || contract.client.fullName}</p>
                {contract.client.email && (
                  <p className="text-neutral-400">Email: {contract.client.email}</p>
                )}
                {contract.client.phone && (
                  <p className="text-neutral-400">Phone: {contract.client.phone}</p>
                )}
              </>
            ) : contract.employee ? (
              <>
                <p className="text-neutral-900 dark:text-white">{contract.employee.fullName}</p>
                <p className="text-neutral-400">Employee #: {contract.employee.employeeNumber}</p>
                {contract.employee.email && (
                  <p className="text-neutral-400">Email: {contract.employee.email}</p>
                )}
                {contract.employee.phone && (
                  <p className="text-neutral-400">Phone: {contract.employee.phone}</p>
                )}
                {contract.employee.department && (
                  <p className="text-neutral-400">Department: {contract.employee.department}</p>
                )}
                {contract.employee.position && (
                  <p className="text-neutral-400">Position: {contract.employee.position}</p>
                )}
              </>
            ) : null}
          </div>
        </Card>
      )}

      {contract.documentUrl && (
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Contract Document</h3>
          <Button
            variant="outline"
            onClick={() => window.open(contract.documentUrl, '_blank')}
          >
            <Download className="w-4 h-4 mr-2" />
            View Contract PDF
          </Button>
        </Card>
      )}

      {/* Sign Modal */}
      <Modal
        isOpen={isSignModalOpen}
        onClose={() => {
          setIsSignModalOpen(false);
          clearSignature();
          setSignatureName('');
        }}
        title="Sign Contract"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Your Name
            </label>
            <Input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Signature
            </label>
            <div className="border-2 border-neutral-700 rounded-lg p-4 bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full border border-neutral-300 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSignature}
              className="mt-2"
            >
              Clear
            </Button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || !signatureName.trim() || !hasSignature}
              className="flex-1"
            >
              {signMutation.isPending ? 'Signing...' : 'Sign Contract'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsSignModalOpen(false);
                clearSignature();
                setSignatureName('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
