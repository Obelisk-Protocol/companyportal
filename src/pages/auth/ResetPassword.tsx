import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import MaterialIcon from '../../components/ui/MaterialIcon';
import AuthPageShell from '../../components/auth/AuthPageShell';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setTokenValid(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/reset-password/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          toast.error(data.error || 'Invalid or expired reset link');
        }
      } catch {
        setTokenValid(false);
        toast.error('Failed to validate reset link');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      toast.success('Password reset successfully! You can now log in.');
      navigate('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface dark:bg-[var(--bg-primary)]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <AuthPageShell title="Invalid link" subtitle="This reset link is invalid or has expired.">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-surface-container-lowest p-8 text-center shadow-stitch dark:bg-[var(--bg-card)]"
        >
          <Link to="/forgot-password">
            <Button className="w-full" size="lg">
              Request new link
            </Button>
          </Link>
          <p className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </p>
        </motion.div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell title="Set new password" subtitle="Choose a strong password you haven’t used before.">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="rounded-xl bg-surface-container-lowest p-8 shadow-stitch dark:bg-[var(--bg-card)] dark:shadow-stitch-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="new-password"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <MaterialIcon
                  name="lock"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm-password"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <MaterialIcon
                  name="lock_reset"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline/40"
                />
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full gap-2 py-4" size="lg">
              Update password
              <MaterialIcon name="check_circle" className="!text-[1.25rem]" />
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
