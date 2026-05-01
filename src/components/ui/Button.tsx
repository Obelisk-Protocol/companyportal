import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-label';

    const variants = {
      primary:
        'bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-semibold shadow-lg hover:shadow-xl active:scale-[0.98] btn-glow',
      secondary:
        'bg-surface-container-low text-on-surface dark:bg-[var(--bg-tertiary)] dark:text-[var(--text-primary)] hover:bg-surface-container-high dark:hover:opacity-90',
      outline:
        'border border-outline-variant text-on-surface-variant bg-transparent hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]',
      ghost: 'text-on-surface-variant hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]',
      danger:
        'bg-error-container text-on-error-container border border-error/20 hover:opacity-90 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/50',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3.5 text-base rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
