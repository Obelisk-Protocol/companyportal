import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import type { NavItem } from '../../lib/navConfig';
import { cn } from '../../lib/utils';
interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}

export default function MobileMoreSheet({ open, onClose, items }: MobileMoreSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-surface dark:bg-[var(--bg-primary)] lg:hidden">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-color)] px-4 pt-[max(0.25rem,env(safe-area-inset-top))]">
        <h2 className="font-headline text-lg font-semibold text-on-surface">More</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] px-3 py-8 text-center">No extra destinations.</p>
        ) : (
          items.map((item) => (
            <NavLink
              key={`${item.href}-${item.name}`}
              to={item.href}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                  isActive
                    ? 'border border-primary/20 bg-primary/10 font-semibold text-primary'
                    : 'text-on-surface-variant hover:bg-[var(--hover-bg)] hover:text-on-surface'
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </NavLink>
          ))
        )}
      </nav>
    </div>
  );
}
