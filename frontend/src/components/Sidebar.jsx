import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ className = '', onNavigate }) => {
  const link = (to, label) => (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `block px-4 py-2 rounded hover:bg-gray-100 ${isActive ? 'bg-gray-100 font-semibold' : ''}`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <aside className={`w-64 bg-white border-r p-4 hidden md:block ${className}`}>
      <h3 className="text-xl font-bold mb-4">Expense Tracker</h3>
      <nav className="flex flex-col gap-1">
        {link('/dashboard', 'Dashboard')}
        {link('/income', 'Income')}
        {link('/expense', 'Expense')}
        {link('/profile', 'Profile')}
      </nav>
    </aside>
  );
};

export default Sidebar;
