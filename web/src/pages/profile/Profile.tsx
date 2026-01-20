import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { User, MapPin, CreditCard, Lock, Save, Upload, FileImage, ExternalLink, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

interface ProfileData {
  user: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
  };
  employee: {
    id: string;
    employeeNumber: string;
    fullName: string;
    email: string;
    phone: string | null;
    nik: string;
    npwp: string | null;
    ptkpStatus: string;
    joinDate: string;
    department: string | null;
    position: string | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    ktpUrl: string | null;
  } | null;
}

export default function Profile() {
  const queryClient = useQueryClient();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    ktpUrl: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<ProfileData>('/me'),
  });

  useEffect(() => {
    if (profile?.employee) {
      setFormData({
        fullName: profile.employee.fullName || '',
        phone: profile.employee.phone || '',
        address: profile.employee.address || '',
        city: profile.employee.city || '',
        province: profile.employee.province || '',
        postalCode: profile.employee.postalCode || '',
        bankName: profile.employee.bankName || '',
        bankAccountNumber: profile.employee.bankAccountNumber || '',
        bankAccountName: profile.employee.bankAccountName || '',
        ktpUrl: profile.employee.ktpUrl || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.put('/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/me/password', data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'hr':
        return 'HR Manager';
      default:
        return 'Employee';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-neutral-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Profile</h1>
          <p className="text-neutral-500">Manage your account settings</p>
        </div>
        <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
          <Lock className="w-4 h-4 mr-2" />
          Change Password
        </Button>
      </div>

      {/* Account Info */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-[var(--text-primary)]" />
          <h3 className="font-semibold text-[var(--text-primary)]">Account Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-neutral-500">Email</p>
            <p className="text-[var(--text-primary)]">{profile?.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Role</p>
            <p className="text-[var(--text-primary)]">{getRoleLabel(profile?.user.role || '')}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Member Since</p>
            <p className="text-[var(--text-primary)]">{profile?.user.createdAt ? formatDate(profile.user.createdAt) : '-'}</p>
          </div>
        </div>
        {profile?.employee && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-neutral-800">
            <div>
              <p className="text-sm text-neutral-500">Employee #</p>
              <p className="text-[var(--text-primary)] font-mono">{profile.employee.employeeNumber}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Department</p>
              <p className="text-[var(--text-primary)]">{profile.employee.department || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Position</p>
              <p className="text-[var(--text-primary)]">{profile.employee.position || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">NIK</p>
              <p className="text-[var(--text-primary)] font-mono">{profile.employee.nik}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">NPWP</p>
              <p className="text-[var(--text-primary)] font-mono">{profile.employee.npwp || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Join Date</p>
              <p className="text-[var(--text-primary)]">{formatDate(profile.employee.joinDate)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Editable Profile */}
      {profile?.employee && (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Personal Information</h3>
              </div>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Your full name"
                  required
                />
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+62..."
                />
              </div>
            </Card>

            {/* KTP Upload */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileImage className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">KTP (ID Card)</h3>
              </div>
              <div className="space-y-4">
                {formData.ktpUrl ? (
                  <div className="space-y-3">
                    <div className="relative aspect-[1.6/1] bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
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
                        <X className="w-4 h-4 text-[var(--text-primary)]" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={formData.ktpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View full size
                      </a>
                    </div>
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
                      <Upload className="w-8 h-8 text-neutral-500" />
                      <div className="text-center">
                        <p className="text-[var(--text-primary)] font-medium">
                          {isUploading ? 'Uploading...' : 'Upload KTP Image'}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
                          JPEG, PNG, or PDF up to 5MB
                        </p>
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </Card>

            {/* Address */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Address</h3>
              </div>
              <div className="space-y-4">
                <Input
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-2 gap-4">
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
                <Input
                  label="Postal Code"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                />
              </div>
            </Card>

            {/* Bank Info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="font-semibold text-[var(--text-primary)]">Bank Information</h3>
              </div>
              <div className="space-y-4">
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
                <Input
                  label="Account Holder Name"
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                />
              </div>
            </Card>
          </div>

          <div className="flex justify-end mt-6">
            <Button type="submit" isLoading={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      )}

      {/* Password Change Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        title="Change Password"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            required
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPasswordModalOpen(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={passwordMutation.isPending}>
              Change Password
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
