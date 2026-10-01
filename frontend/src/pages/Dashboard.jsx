import React, { useEffect, useState } from 'react';
import API from '../api/axiosInstance';
import SummaryCard from '../components/SummaryCard';
import TransactionTable from '../components/TransactionTable';
import { ExpensePie, IncomeExpenseBar } from '../components/Charts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await API.get('/dashboard');
      setData(res.data?.data || res.data || null);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();

    const handleRefresh = () => {
      fetchOverview();
    };

    window.addEventListener('app-data-updated', handleRefresh);
    return () => window.removeEventListener('app-data-updated', handleRefresh);
  }, []);

  const incomeValue = data?.monthlyIncome ?? 0;
  const expenseValue = data?.monthlyExpense ?? 0;
  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const balance = data?.balance ?? totalIncome - totalExpense;

  // build a 7-day series from recentTransactions (group by day)
  const buildSeries = (transactions = []) => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    return days.map((day) => {
      const dayKey = day.toDateString();
      const dayItems = (transactions || []).filter((t) => new Date(t.date || t.createdAt).toDateString() === dayKey);
      const income = dayItems.filter((t) => t.type === 'income').reduce((s, it) => s + Number(it.amount || 0), 0);
      const expense = dayItems.filter((t) => t.type === 'expense').reduce((s, it) => s + Number(it.amount || 0), 0);
      return { date: dayKey, label: day.getDate().toString(), income, expense };
    });
  };

  const series = buildSeries(data?.recentTransactions || []);

  return (
      <div className="space-y-6">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded">
            {error}
          </div>
        )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Live snapshot of your income, expenses, and savings.</p>
        </div>
        <button
          onClick={fetchOverview}
          className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Income" value={`$${totalIncome.toFixed(2)}`} />
        <SummaryCard title="Total Expense" value={`$${totalExpense.toFixed(2)}`} />
        <SummaryCard title="Balance" value={`$${balance.toFixed(2)}`} />
        <SummaryCard title="This Month (Income)" value={`$${incomeValue.toFixed(2)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Income vs Expense</h2>
                <p className="text-sm text-slate-500">Compare monthly cash flow trends.</p>
              </div>
            </div>
            <IncomeExpenseBar income={incomeValue} expense={expenseValue} series={series} />
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
                <p className="text-sm text-slate-500">Latest activity across incomes and expenses.</p>
              </div>
            </div>
            <TransactionTable items={data?.recentTransactions || []} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Expense Distribution</h2>
              <p className="text-sm text-slate-500">Where your money is going this month.</p>
            </div>
            <ExpensePie data={data?.expenseDistribution || []} />
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Top Categories</h2>
            {data?.spendByCategory ? (
              <div className="space-y-2">
                {Object.entries(data.spendByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                      <span>{category}</span>
                      <span>${Number(amount).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No category data available yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
