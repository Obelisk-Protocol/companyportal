import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import MaterialIcon from '../../components/ui/MaterialIcon';
import AuthPageShell from '../../components/auth/AuthPageShell';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const ssoEnabled = import.meta.env.VITE_ENABLE_SSO === 'true';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onSsoClick = () => {
    if (!ssoEnabled) {
      toast.error('Single sign-on is not configured for this deployment.');
      return;
    }
    toast('SSO is not yet connected.', { icon: 'ℹ️' });
  };

  return (
    <AuthPageShell title="Welcome back" subtitle="Access your enterprise dashboard">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="rounded-xl bg-surface-container-lowest p-8 shadow-stitch dark:bg-[var(--bg-card)] dark:shadow-stitch-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
              >
                Corporate Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <MaterialIcon
                  name="alternate_email"
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline/40"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-primary-container hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border-none bg-surface-container-highest py-3.5 pl-4 pr-12 text-on-surface placeholder:text-outline/60 transition-all focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-[var(--bg-input)] dark:focus:bg-[var(--bg-card)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-outline/50 hover:bg-[var(--hover-bg)] hover:text-on-surface-variant"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <MaterialIcon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl !text-[1.25rem]" />
                </button>
              </div>
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full gap-2 py-4" size="lg">
              Sign In
              <MaterialIcon name="arrow_forward" className="!text-[1.25rem]" />
            </Button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-outline-variant/20" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">Secure Access</span>
            <div className="h-px flex-1 bg-outline-variant/20" />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              disabled={!ssoEnabled}
              onClick={onSsoClick}
              className={cn(
                'font-label flex w-full items-center justify-center gap-3 rounded-lg py-3.5 font-semibold transition-colors',
                'bg-surface-container-low text-on-surface hover:bg-surface-container-high',
                'dark:bg-[var(--bg-tertiary)] dark:hover:bg-[var(--bg-secondary)]',
                !ssoEnabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with SSO
            </button>
            {!ssoEnabled && (
              <p className="text-center text-xs text-on-surface-variant">SSO is disabled. Use your email and password.</p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center font-label text-[11px] font-medium uppercase tracking-widest text-outline/70">
          Enterprise-grade security & compliance
        </p>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          Don&apos;t have an account? Contact your administrator for an invitation.
        </p>
      </motion.div>
    </AuthPageShell>
  );
}
