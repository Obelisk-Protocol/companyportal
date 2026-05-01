import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { splitMobileNav, publicGrantNav, type NavItem } from '../../lib/navConfig';
import { cn } from '../../lib/utils';
import { Menu } from 'lucide-react';
import MobileMoreSheet from './MobileMoreSheet';

function NavTab({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.href}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-0.5 py-1 min-w-0 max-w-[20%]',
          isActive ? 'text-primary' : 'text-on-surface-variant'
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex items-center justify-center rounded-xl p-1.5 transition-colors',
              isActive && 'bg-primary/12 text-primary'
            )}
          >
            <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.25 : 2} />
          </span>
          <span className="text-[10px] font-medium leading-tight text-center truncate w-full px-0.5">
            {item.name === 'My Payslips' ? 'Payslips' : item.name === 'My Expenses' ? 'Expenses' : item.name === 'Event grants' ? 'Events' : item.name}
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function MobileBottomNav() {
  const { user } = useAuth();
  const { viewMode } = useNavigation();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const onGrantsPublic = !user && location.pathname.startsWith('/grants');

  let primary: NavItem[] = [];
  let more: NavItem[] = [];

  if (user) {
    const split = splitMobileNav({ role: user.role }, viewMode);
    primary = split.primary;
    more = split.more;
  } else if (onGrantsPublic) {
    primary = publicGrantNav;
    more = [];
  } else {
    return null;
  }

  const showMoreTab = user && more.length > 0;

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border-color)] bg-surface/95 backdrop-blur-md dark:bg-[var(--bg-primary)]/95 lg:hidden',
          'pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-4px_24px_var(--shadow-color)]'
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {primary.map((item) => (
            <NavTab key={`${item.href}-${item.name}`} item={item} />
          ))}
          {showMoreTab && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-w-0 max-w-[20%] flex-1 flex-col items-center justify-center gap-0.5 py-1 text-on-surface-variant',
                moreOpen && 'text-primary'
              )}
            >
              <span className="flex items-center justify-center rounded-xl p-1.5">
                <Menu className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          )}
        </div>
      </nav>

      {user && <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} items={more} />}
    </>
  );
}
