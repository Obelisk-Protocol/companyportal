import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import MaterialIcon from '../../components/ui/MaterialIcon';
import AuthPageShell from '../../components/auth/AuthPageShell';
import { motion } from 'framer-motion';

export default function ForcePasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('Choose a different password from your temporary one');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.put<{ message: string; accessToken: string }>('/me/password', {
        currentPassword,
        newPassword,
      });
      localStorage.setItem('accessToken', res.accessToken);
      await refreshUser();
      toast.success('Password updated. You are all set.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      title="Set a new password"
      subtitle="Your account is using a temporary password. Choose a new one to continue."
      alignTop
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="rounded-xl bg-surface-container-lowest p-8 shadow-stitch dark:bg-[var(--bg-card)] dark:shadow-stitch-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="current"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Current (temporary) password
              </label>
              <div className="relative">
                <input
                  id="current"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline/50 hover:bg-[var(--hover-bg)] hover:text-on-surface-variant"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcon name={showCurrent ? 'visibility_off' : 'visibility'} className="text-xl !text-[1.25rem]" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="new"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="new"
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline/50 hover:bg-[var(--hover-bg)] hover:text-on-surface-variant"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcon name={showNew ? 'visibility_off' : 'visibility'} className="text-xl !text-[1.25rem]" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-4 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
              />
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full gap-2 py-4" size="lg">
              Update password
              <MaterialIcon name="lock_reset" className="!text-[1.25rem]" />
            </Button>
          </form>
        </div>
      </motion.div>
    </AuthPageShell>
  );
}
