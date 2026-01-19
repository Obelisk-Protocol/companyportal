import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Upload, X, ExternalLink } from 'lucide-react';

const PTKP_OPTIONS = [
  { value: 'TK/0', label: 'TK/0 - Single, 0 Dependents' },
  { value: 'TK/1', label: 'TK/1 - Single, 1 Dependent' },
  { value: 'TK/2', label: 'TK/2 - Single, 2 Dependents' },
  { value: 'TK/3', label: 'TK/3 - Single, 3 Dependents' },
  { value: 'K/0', label: 'K/0 - Married, 0 Dependents' },
  { value: 'K/1', label: 'K/1 - Married, 1 Dependent' },
  { value: 'K/2', label: 'K/2 - Married, 2 Dependents' },
  { value: 'K/3', label: 'K/3 - Married, 3 Dependents' },
];

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [invitation, setInvitation] = useState<{ email: string; name: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    nik: '',
    npwp: '',
    ptkpStatus: 'TK/0',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    ktpUrl: '',
  });

  useEffect(() => {
    const validateToken = async () => {
      try {
        const data = await api.get<{ email: string; name: string; role: string }>(
          `/auth/invitation/${token}`
        );
        setInvitation(data);
        setFormData((prev) => ({ ...prev, fullName: data.name }));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid invitation');
      } finally {
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleKtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await api.upload<{ url: string }>('/upload/ktp', file);
      setFormData({ ...formData, ktpUrl: result.url });
      toast.success('KTP uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload KTP');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const isAccountant = invitation?.role === 'accountant';

    if (!isAccountant && formData.nik.length !== 16) {
      toast.error('NIK must be 16 digits');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isAccountant) {
        // Simple registration for accountants
        await api.post('/auth/register', {
          token,
          password: formData.password,
          fullName: formData.fullName,
        });
      } else {
        // Full registration for employees
        await api.post('/auth/register', {
          token,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone,
          nik: formData.nik,
          npwp: formData.npwp,
          ptkpStatus: formData.ptkpStatus,
          address: formData.address,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          bankName: formData.bankName,
          bankAccountNumber: formData.bankAccountNumber,
          bankAccountName: formData.bankAccountName,
          ktpUrl: formData.ktpUrl,
        });
      }

      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { theme } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent-primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)] transition-colors">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">Invalid Invitation</h1>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <Button onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-[var(--bg-primary)] transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/obelisk_white.png" 
            alt="Obelisk" 
            className={cn("w-20 h-20 mx-auto mb-4", theme === 'light' && 'invert')}
          />
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome!</h1>
          <p className="text-[var(--text-secondary)]">
            You've been invited to join as{' '}
            <span className="text-[var(--text-primary)] font-medium">{invitation?.role}</span>
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-8 transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Info */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  value={invitation?.email || ''}
                  disabled
                />
                <Input
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Show full form only for non-accountants */}
            {invitation?.role !== 'accountant' && (
              <>
                {/* Personal Info */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="NIK (ID Card Number)"
                      value={formData.nik}
                      onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                      placeholder="16-digit NIK"
                      required
                    />
                    <Input
                      label="NPWP (Tax ID - Optional)"
                      value={formData.npwp}
                      onChange={(e) => setFormData({ ...formData, npwp: e.target.value })}
                      placeholder="XX.XXX.XXX.X-XXX.XXX"
                    />
                    <Input
                      label="Phone Number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62..."
                    />
                    <Select
                      label="PTKP Status (Tax Status)"
                      value={formData.ptkpStatus}
                      onChange={(e) => setFormData({ ...formData, ptkpStatus: e.target.value })}
                      options={PTKP_OPTIONS}
                    />
                  </div>
                </div>

                {/* KTP Upload */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">KTP (ID Card Image)</h3>
                  {formData.ktpUrl ? (
                    <div className="space-y-3">
                      <div className="relative aspect-[1.6/1] bg-[var(--bg-input)] rounded-lg overflow-hidden">
                        <img
                          src={formData.ktpUrl}
                          alt="KTP"
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, ktpUrl: '' })}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full hover:bg-black transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <a
                        href={formData.ktpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View full size
                      </a>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleKtpUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      <div className="flex flex-col items-center justify-center gap-3 p-8 bg-[var(--bg-input)] border-2 border-dashed border-[var(--border-color)] rounded-lg cursor-pointer hover:border-[var(--text-secondary)] transition-colors">
                        <Upload className="w-8 h-8 text-[var(--text-muted)]" />
                        <div className="text-center">
                          <p className="text-[var(--text-primary)] font-medium">
                            {isUploading ? 'Uploading...' : 'Upload KTP Image'}
                          </p>
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            JPEG, PNG, or PDF up to 5MB
                          </p>
                        </div>
                      </div>
                    </label>
                  )}
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        label="Address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <Input
                      label="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Input
                      label="Province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>
                </div>

                {/* Bank Info */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Bank Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Bank Name"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="BCA, Mandiri, BNI, etc."
                    />
                    <Input
                      label="Account Number"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    />
                    <div className="md:col-span-2">
                      <Input
                        label="Account Holder Name"
                        value={formData.bankAccountName}
                        onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full" size="lg">
              Register
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
