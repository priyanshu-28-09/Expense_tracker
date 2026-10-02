import React, { lazy, Suspense, useDeferredValue, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, ArrowDownToLine, ArrowUpFromLine, CalendarDays, RefreshCw, Search, Wallet } from 'lucide-react';
import API from '../api/axiosInstance';
import SummaryCard from '../components/SummaryCard';
import TransactionTable from '../components/TransactionTable';

const MonthlyExpensesChart = lazy(() => import('../components/Charts').then((charts) => ({ default: charts.MonthlyExpensesChart })));
const CategoryExpensesChart = lazy(() => import('../components/Charts').then((charts) => ({ default: charts.CategoryExpensesChart })));
const IncomeExpenseChart = lazy(() => import('../components/Charts').then((charts) => ({ default: charts.IncomeExpenseChart })));
const PaymentMethodChart = lazy(() => import('../components/Charts').then((charts) => ({ default: charts.PaymentMethodChart })));
const chartFallback = <div className="h-60 animate-pulse rounded bg-slate-50" />;

const pageSize = 20;
const segments = ['All', 'Income', 'Expense', 'UPI', 'Bank', 'Cash', 'Card'];
const paymentBySegment = {
  UPI: 'UPI',
  Bank: 'Bank Transfer',
  Cash: 'Cash',
  Card: 'Card',
};
const sources = ['Manual', 'Android Notification', 'CSV', 'Bank Integration', 'UPI Integration', 'Other'];

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const matchesLegacyFilters = (transaction, filters) => {
  const searchValue = filters.search.toLowerCase();
  const textMatches = !searchValue || [
    transaction.merchant,
    transaction.description,
    transaction.category,
    transaction.transactionId,
    transaction.referenceId,
  ].some((value) => String(value || '').toLowerCase().includes(searchValue));
  const typeMatches = filters.segment === 'All'
    || filters.segment === 'Income' && transaction.type === 'income'
    || filters.segment === 'Expense' && transaction.type === 'expense'
    || paymentBySegment[filters.segment] && transaction.paymentMethod === paymentBySegment[filters.segment];
  const amount = Number(transaction.amount || 0);
  const date = new Date(transaction.transactionDate || transaction.date || transaction.createdAt);

  return textMatches
    && typeMatches
    && (!filters.category || transaction.category === filters.category)
    && (!filters.source || transaction.source === filters.source)
    && (!filters.fromDate || date >= new Date(`${filters.fromDate}T00:00:00`))
    && (!filters.toDate || date <= new Date(`${filters.toDate}T23:59:59.999`))
    && (filters.minAmount === '' || amount >= Number(filters.minAmount))
    && (filters.maxAmount === '' || amount <= Number(filters.maxAmount));
};

const Dashboard = () => {
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedSegment, setSelectedSegment] = useState('All');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState({ category: '', fromDate: '', toDate: '', minAmount: '', maxAmount: '', source: '' });
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleRefresh = () => setRefreshVersion((version) => version + 1);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') handleRefresh();
    };
    window.addEventListener('app-data-updated', handleRefresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const intervalId = window.setInterval(refreshWhenVisible, 15000);
    return () => {
      window.removeEventListener('app-data-updated', handleRefresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadSummary = async () => {
      try {
        const response = await API.get('/dashboard', { signal: controller.signal });
        setSummary(response.data?.data || response.data || null);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError?.message || 'Could not load dashboard summary.');
      }
    };
    loadSummary();
    return () => controller.abort();
  }, [refreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    const loadTransactions = async () => {
      setLoading(true);
      setError('');
      const params = { page, limit: pageSize };
      const segmentType = selectedSegment === 'Income' ? 'income' : selectedSegment === 'Expense' ? 'expense' : '';
      if (segmentType) params.type = segmentType;
      if (paymentBySegment[selectedSegment]) params.paymentMethod = paymentBySegment[selectedSegment];
      if (deferredSearch.trim()) params.search = deferredSearch.trim();
      if (filters.category) params.category = filters.category;
      if (filters.source) params.source = filters.source;
      if (filters.fromDate) params.fromDate = filters.fromDate;
      if (filters.toDate) params.toDate = filters.toDate;
      if (filters.minAmount !== '') params.minAmount = filters.minAmount;
      if (filters.maxAmount !== '') params.maxAmount = filters.maxAmount;

      try {
        const response = await API.get('/transactions', { params, signal: controller.signal });
        setTransactions(response.data?.data || []);
        setPagination(response.data?.pagination || { page, pages: 1, total: 0 });
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setTransactions([]);
          setPagination({ page: 1, pages: 1, total: 0 });
          setError(requestError?.message || 'Could not load transactions.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    loadTransactions();
    return () => controller.abort();
  }, [page, selectedSegment, deferredSearch, filters, refreshVersion]);

  useEffect(() => {
    if (!location.hash) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const fallbackItems = (summary?.recentTransactions || []).map((transaction, index) => ({
    ...transaction,
    _id: transaction._id || `${transaction.type || 'transaction'}-${index}`,
    merchant: transaction.merchant || transaction.description || 'Transaction',
    transactionDate: transaction.transactionDate || transaction.date || transaction.createdAt,
    currency: transaction.currency || 'INR',
    paymentMethod: transaction.paymentMethod || 'Other',
    source: transaction.source || 'Manual',
    category: transaction.category || 'Uncategorized',
  }));
  const hasLegacyOnlyData = pagination.total === 0 && page === 1;
  const legacyFilteredItems = hasLegacyOnlyData
    ? fallbackItems.filter((transaction) => matchesLegacyFilters(transaction, {
      ...filters,
      search: deferredSearch,
      segment: selectedSegment,
    }))
    : [];
  const visibleTransactions = transactions.length ? transactions : legacyFilteredItems;
  const categories = [...new Set([
    ...Object.keys(summary?.spendByCategory || {}),
    ...transactions.map((transaction) => transaction.category).filter(Boolean),
  ])].sort((a, b) => a.localeCompare(b));
  const clearFilters = () => {
    setSelectedSegment('All');
    setSearch('');
    setFilters({ category: '', fromDate: '', toDate: '', minAmount: '', maxAmount: '', source: '' });
    setPage(1);
  };
  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };
  const refresh = () => {
    setRefreshing(true);
    setRefreshVersion((version) => version + 1);
  };

  const stats = [
    { title: 'Total Balance', value: formatCurrency(summary?.balance), icon: Wallet, tone: 'green' },
    { title: 'Total Income', value: formatCurrency(summary?.totalIncome), icon: ArrowDownToLine, tone: 'blue' },
    { title: 'Total Expenses', value: formatCurrency(summary?.netExpense ?? summary?.totalExpense), icon: ArrowUpFromLine, tone: 'rose' },
    { title: "Today's Expenses", value: formatCurrency(summary?.todayExpense), icon: CalendarDays, tone: 'amber' },
    { title: "This Month's Expenses", value: formatCurrency(summary?.monthlyNetExpense ?? summary?.monthlyExpense), icon: Activity, tone: 'teal' },
    { title: 'Transaction Count', value: Number(summary?.transactionCount ?? 0).toLocaleString('en-IN'), icon: Activity, tone: 'slate' },
  ];

  const expenseCategories = Object.entries(summary?.spendByCategory || {}).map(([category, amount]) => ({ category, amount }));

  return (
    <div className="mx-auto max-w-[1500px] space-y-5" aria-busy={loading}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Personal finances</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A clear view of your money, across every account.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </div>

      {error && <div role="alert" className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <section aria-label="Account summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => <SummaryCard key={stat.title} {...stat} />)}
      </section>

      <section id="analytics" className="scroll-mt-5 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
            <p className="mt-0.5 text-xs text-slate-500">Spending and cash flow at a glance</p>
          </div>
          <span className="text-xs text-slate-500">Last 6 months</span>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          <section className="min-w-0 rounded border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Monthly Expenses</h3>
              <p className="mt-0.5 text-xs text-slate-500">Completed spending by month</p>
            </div>
            <Suspense fallback={chartFallback}><MonthlyExpensesChart data={summary?.monthlyExpenseTrend || []} /></Suspense>
          </section>
          <section className="min-w-0 rounded border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Category Expenses</h3>
              <p className="mt-0.5 text-xs text-slate-500">This month by category</p>
            </div>
            <Suspense fallback={chartFallback}><CategoryExpensesChart data={expenseCategories} /></Suspense>
          </section>
          <section className="min-w-0 rounded border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Income vs Expense</h3>
              <p className="mt-0.5 text-xs text-slate-500">This month, net of refunds</p>
            </div>
            <Suspense fallback={chartFallback}>
              <IncomeExpenseChart
                income={summary?.monthlyIncome || 0}
                expense={summary?.monthlyNetExpense ?? summary?.monthlyExpense ?? 0}
              />
            </Suspense>
          </section>
          <section className="min-w-0 rounded border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Payment Method Breakdown</h3>
              <p className="mt-0.5 text-xs text-slate-500">This month’s completed expenses</p>
            </div>
            <Suspense fallback={chartFallback}><PaymentMethodChart data={summary?.paymentMethodBreakdown || {}} /></Suspense>
          </section>
        </div>
      </section>

      <section id="transactions" className="scroll-mt-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
            <p className="mt-0.5 text-xs text-slate-500">{pagination.total ? `${pagination.total.toLocaleString('en-IN')} transactions` : 'Latest account activity'}</p>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search merchant, category, ID"
              aria-label="Search transactions"
              className="h-10 w-full rounded border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
            />
          </label>
        </div>

        <div className="overflow-x-auto pb-1">
          <div role="group" aria-label="Transaction quick filters" className="flex min-w-max items-center gap-1 rounded border border-slate-200 bg-white p-1">
            {segments.map((segment) => (
              <button
                key={segment}
                type="button"
                aria-pressed={selectedSegment === segment}
                onClick={() => { setSelectedSegment(segment); setPage(1); }}
                className={`min-h-8 rounded px-3 text-xs font-medium transition-colors ${selectedSegment === segment ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {segment}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
          <label className="text-[11px] font-medium text-slate-500">
            From
            <input type="date" value={filters.fromDate} onChange={(event) => updateFilter('fromDate', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 px-2 text-xs text-slate-800" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            To
            <input type="date" value={filters.toDate} onChange={(event) => updateFilter('toDate', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 px-2 text-xs text-slate-800" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Category
            <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-800">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Min amount
            <input type="number" min="0" value={filters.minAmount} onChange={(event) => updateFilter('minAmount', event.target.value)} placeholder="₹0" className="mt-1 h-9 w-full rounded border border-slate-200 px-2 text-xs text-slate-800" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Max amount
            <input type="number" min="0" value={filters.maxAmount} onChange={(event) => updateFilter('maxAmount', event.target.value)} placeholder="No limit" className="mt-1 h-9 w-full rounded border border-slate-200 px-2 text-xs text-slate-800" />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Source
            <select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-200 bg-white px-2 text-xs text-slate-800">
              <option value="">All sources</option>
              {sources.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
          </label>
          <button type="button" onClick={clearFilters} className="col-span-2 justify-self-start text-xs font-medium text-emerald-800 hover:underline sm:col-span-3 lg:col-span-6">
            Clear filters
          </button>
        </div>

        {loading && transactions.length === 0
          ? <div className="rounded border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">Loading transactions…</div>
          : <TransactionTable items={visibleTransactions} />}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-xs text-slate-700 disabled:opacity-40">
                <span aria-hidden="true">‹</span> Previous
              </button>
              <button type="button" disabled={page >= pagination.pages || loading} onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))} className="inline-flex h-8 items-center gap-1 rounded border border-slate-300 px-2 text-xs text-slate-700 disabled:opacity-40">
                Next <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;