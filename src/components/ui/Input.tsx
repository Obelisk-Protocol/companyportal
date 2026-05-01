import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-on-surface-variant font-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg text-on-surface placeholder:text-outline/60 font-body',
            'bg-surface-container-highest border-none',
            'dark:bg-[var(--bg-input)] dark:border dark:border-transparent',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest dark:focus:bg-[var(--bg-card)]',
            'transition-all duration-200',
            error && 'ring-2 ring-error/30 focus:ring-error/40',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && <p className="text-sm text-on-surface-variant">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
