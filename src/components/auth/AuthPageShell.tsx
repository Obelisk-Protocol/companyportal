import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

type AuthPageShellProps = {
  children: ReactNode;
  /** Main heading below optional hero (e.g. Welcome back) */
  title?: string;
  subtitle?: ReactNode;
  /** Hide decorative footer links on tight layouts */
  showFooterLinks?: boolean;
  /** Wider card column (e.g. invitation forms) */
  wide?: boolean;
  /** Top-aligned main for long scrolling forms */
  alignTop?: boolean;
};

export default function AuthPageShell({
  children,
  title,
  subtitle,
  showFooterLinks = true,
  wide = false,
  alignTop = false,
}: AuthPageShellProps) {
  return (
    <div className="min-h-[100dvh] bg-surface font-body text-on-surface antialiased transition-colors">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-surface/70 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="font-headline text-xl font-bold tracking-tight text-primary">Obelisk</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://support.obelisk.example"
            className="font-label text-sm font-medium text-primary-container transition-opacity hover:opacity-80"
            onClick={(e) => e.preventDefault()}
          >
            Help
          </a>
        </div>
      </header>

      <main
        className={cn(
          'relative flex min-h-screen flex-col overflow-hidden px-4 pb-28 pt-24',
          alignTop ? 'items-center justify-start' : 'items-center justify-center'
        )}
      >
        <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[60%] w-[40%] rounded-full bg-primary-container/5 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-[10%] -right-[10%] h-[60%] w-[40%] rounded-full bg-tertiary-container/5 blur-[120px]" />

        <div className={cn('relative z-10 w-full', wide ? 'max-w-2xl' : 'max-w-md')}>
          {(title || subtitle) && (
            <div className="mb-10 text-center">
              {title && (
                <h1 className="mb-3 font-headline text-4xl font-extrabold tracking-tight text-primary">{title}</h1>
              )}
              {subtitle && <p className="font-body text-on-surface-variant">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 hidden p-12 opacity-20 lg:block">
          <div className="flex flex-col gap-1">
            <span className="font-headline text-8xl font-black leading-none text-primary">01</span>
            <span className="font-label text-xs font-bold uppercase tracking-[0.5em] text-primary">Security First</span>
          </div>
        </div>
      </main>

      {showFooterLinks && (
        <footer className="fixed bottom-8 z-10 flex w-full items-center justify-center gap-6 px-6">
          <Link
            to="/privacy"
            className="font-label text-[10px] font-bold uppercase tracking-widest text-outline/60 transition-colors hover:text-primary"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </Link>
          <span className="h-1 w-1 rounded-full bg-outline/20" />
          <Link
            to="/terms"
            className="font-label text-[10px] font-bold uppercase tracking-widest text-outline/60 transition-colors hover:text-primary"
            onClick={(e) => e.preventDefault()}
          >
            Terms of Service
          </Link>
          <span className="h-1 w-1 rounded-full bg-outline/20" />
          <a
            href="https://status.obelisk.example"
            className={cn(
              'font-label text-[10px] font-bold uppercase tracking-widest text-outline/60 transition-colors hover:text-primary'
            )}
            onClick={(e) => e.preventDefault()}
          >
            System Status
          </a>
        </footer>
      )}
    </div>
  );
}
