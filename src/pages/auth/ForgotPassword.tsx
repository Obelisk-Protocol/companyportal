import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import MaterialIcon from '../../components/ui/MaterialIcon';
import AuthPageShell from '../../components/auth/AuthPageShell';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitted(false);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
      toast.success('If an account exists with that email, you will receive a password reset link shortly.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthPageShell
      title={submitted ? 'Check your inbox' : 'Reset password'}
      subtitle={
        submitted
          ? 'We sent instructions to your email if an account exists.'
          : "Enter your corporate email and we'll send a reset link."
      }
    >
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="rounded-xl bg-surface-container-lowest p-8 shadow-stitch dark:bg-[var(--bg-card)] dark:shadow-stitch-dark">
          {submitted ? (
            <div className="space-y-6">
              <p className="text-center text-on-surface-variant">
                We&apos;ve sent an email to <strong className="text-on-surface">{email}</strong> with instructions.
                The link expires in one hour.
              </p>
              <p className="text-center text-sm text-outline">
                Didn&apos;t receive it? Check spam or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="font-semibold text-primary-container hover:underline"
                >
                  try again
                </button>
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full py-3"
                size="lg"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="forgot-email"
                  className="font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant"
                >
                  Corporate Email
                </label>
                <div className="relative">
                  <input
                    id="forgot-email"
                    type="email"
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

              <Button type="submit" isLoading={isLoading} className="w-full gap-2 py-4" size="lg">
                Send reset link
                <MaterialIcon name="mail" className="!text-[1.25rem]" />
              </Button>
            </form>
          )}
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
