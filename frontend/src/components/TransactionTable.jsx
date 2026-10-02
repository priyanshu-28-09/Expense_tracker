import React from 'react';
import { Trash2 } from 'lucide-react';

const formatCurrency = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: /^[A-Z]{3}$/.test(currency) ? currency : 'INR',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  }
};

const formatDateTime = (transaction) => {
  const value = transaction.transactionDate || transaction.date || transaction.createdAt;
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayLabel = dateOnly.getTime() === today.getTime()
    ? 'Today'
    : dateOnly.getTime() === yesterday.getTime()
      ? 'Yesterday'
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const hasTimestamp = transaction.transactionDate && (
    date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0
  );
  const timeValue = transaction.transactionTime || (hasTimestamp || !transaction.transactionDate && !transaction.date && transaction.createdAt
    ? date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : '');
  const time = timeValue;

  return time ? `${dayLabel}, ${time}` : dayLabel;
};

const getSourceLabel = (transaction) => {
  const app = transaction.sourceApplication || '';
  const normalized = app.toLowerCase();
  if (normalized.includes('phonepe')) return 'PhonePe';
  if (normalized.includes('googlepay') || normalized.includes('google pay') || normalized.includes('gpay')) return 'Google Pay';
  if (normalized.includes('paytm')) return 'Paytm';
  if (normalized.includes('amazonpay') || normalized.includes('amazon pay')) return 'Amazon Pay';
  if (app) return app.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return transaction.source || 'Manual';
};

const getTransactionKind = (transaction) => {
  if (transaction.status === 'refunded') return 'Refund';
  if (transaction.type === 'income') return 'Income';
  if (transaction.type === 'transfer') return 'Transfer';
  return 'Expense';
};

const getAmountStyle = (transaction) => {
  if (transaction.status === 'refunded' || transaction.type === 'income') return 'text-emerald-700';
  if (transaction.status === 'failed') return 'text-slate-500 line-through';
  return 'text-slate-900';
};

const TransactionTable = ({ items = [], onDelete }) => {
  if (items.length === 0) {
    return (
      <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
        <p className="text-sm font-medium text-slate-700">No transactions found</p>
        <p className="mt-1 text-xs text-slate-500">Try another search or adjust your filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {items.map((transaction) => {
          const merchant = transaction.merchant || transaction.description || 'Transaction';
          const amountPrefix = transaction.type === 'income' || transaction.status === 'refunded' ? '+' : '−';
          return (
            <article key={transaction._id} className="rounded border border-slate-200 bg-white p-3.5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{merchant}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {transaction.category || 'Uncategorized'} <span className="px-1">•</span> {transaction.paymentMethod || 'Other'}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${getAmountStyle(transaction)}`}>
                  {amountPrefix}{formatCurrency(transaction.amount, transaction.currency)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                <span>{formatDateTime(transaction)}</span>
                <span className="max-w-[50%] truncate">Source: {getSourceLabel(transaction)}</span>
              </div>
              {(transaction.status && transaction.status !== 'completed' || onDelete) && (
                <div className="mt-2 flex items-center justify-between">
                  {transaction.status && transaction.status !== 'completed'
                    ? <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{getTransactionKind(transaction)} · {transaction.status}</span>
                    : <span />}
                  {onDelete && (
                    <button type="button" onClick={() => onDelete(transaction._id)} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${merchant}`}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Date / time</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 text-right">Amount</th>
              {onDelete && <th className="px-3 py-3" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {items.map((transaction) => {
              const merchant = transaction.merchant || transaction.description || 'Transaction';
              const amountPrefix = transaction.type === 'income' || transaction.status === 'refunded' ? '+' : '−';
              return (
                <tr key={transaction._id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="max-w-52 px-4 py-3">
                    <div className="truncate font-medium text-slate-900">{merchant}</div>
                    {transaction.status && transaction.status !== 'completed' && <div className="mt-0.5 text-[11px] capitalize text-slate-500">{getTransactionKind(transaction)} · {transaction.status}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{transaction.category || 'Uncategorized'}</td>
                  <td className="px-4 py-3 text-slate-600">{transaction.paymentMethod || 'Other'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(transaction)}</td>
                  <td className="max-w-36 truncate px-4 py-3 text-slate-600">{getSourceLabel(transaction)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${getAmountStyle(transaction)}`}>
                    {amountPrefix}{formatCurrency(transaction.amount, transaction.currency)}
                  </td>
                  {onDelete && (
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => onDelete(transaction._id)} className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${merchant}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TransactionTable;