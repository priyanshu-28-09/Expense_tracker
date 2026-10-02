import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChartNoAxesCombined, LayoutDashboard, Plus, ReceiptText, UserRound } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mobileLinks = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Transactions', to: '/dashboard#transactions', icon: ReceiptText },
    { label: 'Add', to: '/expense#add-expense', icon: Plus },
    { label: 'Analytics', to: '/dashboard#analytics', icon: ChartNoAxesCombined },
    { label: 'Profile', to: '/profile', icon: UserRound },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar className="hidden md:block" />
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="absolute inset-0 h-full w-full bg-slate-950/35" />
          <div className="relative z-10 h-full w-72">
            <Sidebar className="!block !h-full !w-72 border-r bg-white shadow-xl" onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col">
        <Navbar onToggle={() => setSidebarOpen((value) => !value)} />
        <main className="min-w-0 flex-1 p-3 pb-24 sm:p-4 md:p-6 md:pb-6">
          <Outlet />
        </main>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 max-w-xl grid-cols-5 items-center px-1">
          {mobileLinks.map(({ label, to, icon }) => {
            const target = new URL(to, window.location.origin);
            const isCurrentPath = location.pathname === target.pathname || target.pathname === '/dashboard' && location.pathname === '/';
            const isActive = isCurrentPath && (target.hash ? location.hash === target.hash : !location.hash);
            const isAdd = label === 'Add';
            return (
              <NavLink
                key={label}
                to={to}
                className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium ${isAdd || isActive ? 'text-emerald-800' : 'text-slate-500'}`}
              >
                <span className={`grid h-7 w-8 place-items-center ${isAdd ? '-mt-2 h-10 w-10 rounded-full bg-emerald-700 text-white shadow-md' : ''}`}>
                  {React.createElement(icon, { size: isAdd ? 20 : 18, strokeWidth: isActive || isAdd ? 2.2 : 1.8 })}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
