import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import RoleSwitcher from '../dev/RoleSwitcher';

export default function Layout() {
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface-container-low transition-colors dark:bg-[var(--bg-secondary)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <div className="hidden lg:block">
        <RoleSwitcher />
      </div>
    </div>
  );
}
