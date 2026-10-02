import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import API from '../api/axiosInstance';
import AddExpenseForm from '../components/AddExpenseForm';
import TransactionTable from '../components/TransactionTable';

const Expense = () => {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const fetchItems = async () => {
    try {
      const res = await API.get('/expense/get');
      setItems(res.data?.data || res.data || []);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load expenses');
    }
  };

  useEffect(() => {
    const loadItems = async () => {
      await fetchItems();
    };
    loadItems();
  }, []);

  useEffect(() => {
    if (location.hash !== '#add-expense') return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('add-expense')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const refreshApp = () => {
    window.dispatchEvent(new Event('app-data-updated'));
  };

  const remove = async (id) => {
    if (!confirm('Delete expense?')) return;
    await API.delete(`/expense/delete/${id}`);
    await fetchItems();
    refreshApp();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div id="add-expense" className="scroll-mt-5">
          <h1 className="text-3xl font-semibold text-slate-900">Expense</h1>
          <p className="text-sm text-slate-500">Record your spending and stay on budget.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {error && <div className="text-rose-600 mb-2">{error}</div>}
          <TransactionTable items={items} onDelete={remove} />
        </div>
        <div>
          <AddExpenseForm
            onAdded={async () => {
              await fetchItems();
              refreshApp();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Expense;
