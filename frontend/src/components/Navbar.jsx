import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';

const Navbar = ({ onToggle }) => {
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-white shadow px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-gray-100 md:hidden"
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>
        <div>
          <div className="text-lg font-semibold text-slate-900">Expense Tracker</div>
          <div className="text-sm text-slate-500">Personal finance dashboard</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-700">
        {user ? (
          <>
            <span>{user.name}</span>
            <button onClick={logout} className="rounded bg-rose-500 px-3 py-1 text-white hover:bg-rose-600">
              Logout
            </button>
          </>
        ) : (
          <span>Guest</span>
        )}
      </div>
    </header>
  );
};

export default Navbar;