import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { theme } = useTheme();
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)] transition-colors">
      {/* Background pattern */}
      <div
        className={cn(
          "absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAxOGMtMy4zMTQgMC02LTIuNjg2LTYtNnMyLjY4Ni02IDYtNiA2IDIuNjg2IDYgNi0yLjY4NiA2LTYgNnoiIGZpbGw9InJnYmEoMTI4LDEyOCwxMjgsMC4wNSkiLz48L2c+PC9zdmc+')]",
          theme === 'dark' ? 'opacity-30' : 'opacity-50'
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/obelisk_white.png"
            alt="Obelisk"
            className={cn('w-20 h-20 mx-auto mb-4', theme === 'light' && 'invert')}
          />
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Reset Password</h1>
          <p className="text-[var(--text-secondary)]">
            {submitted
              ? 'Check your email for a reset link'
              : 'Enter your email and we\'ll send you a link to reset your password'}
          </p>
        </div>

        <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-8 shadow-lg transition-colors">
          {submitted ? (
            <div className="space-y-6">
              <p className="text-[var(--text-secondary)] text-center">
                We've sent an email to <strong className="text-[var(--text-primary)]">{email}</strong> with
                instructions to reset your password. The link will expire in 1 hour.
              </p>
              <p className="text-sm text-[var(--text-muted)] text-center">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-[var(--accent-primary)] hover:underline"
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
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)]/50 transition-all"
                />
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full py-3" size="lg">
                Send Reset Link
              </Button>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link
            to="/login"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
