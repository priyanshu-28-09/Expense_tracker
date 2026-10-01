import React from 'react';

const palette = ['bg-teal-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];

export const ExpensePie = ({ data = [] }) => {
  const total = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!data.length) {
    return (
      <div className="h-56 bg-white rounded shadow flex items-center justify-center">
        <div className="text-sm text-gray-500">No expense categories yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const ratio = total ? Math.round((item.amount / total) * 100) : 0;
        return (
          <div key={item.category || index} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded ${palette[index % palette.length]}`} />
            <div className="flex-1">
              <div className="flex justify-between text-sm font-medium text-slate-700">
                <span>{item.category}</span>
                <span>{ratio}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded overflow-hidden mt-1">
                <div className={`h-full rounded ${palette[index % palette.length]}`} style={{ width: `${ratio}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const IncomeExpenseBar = ({ income = 0, expense = 0, series = [] }) => {
  if (series && series.length) {
    const max = Math.max(...series.map((s) => Math.max(s.income || 0, s.expense || 0)), 1);
    return (
      <div className="space-y-3">
        <div className="flex gap-2 items-end">
          {series.map((s) => {
            const inHeight = Math.round(((s.income || 0) / max) * 100);
            const exHeight = Math.round(((s.expense || 0) / max) * 100);
            return (
              <div key={s.date} className="flex flex-col items-center text-xs text-slate-600">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-16 relative flex items-end">
                    <div className="w-full bg-emerald-400" style={{ height: `${inHeight}%`, borderRadius: '4px 4px 0 0' }} />
                    <div className="w-full bg-rose-400" style={{ height: `${exHeight}%`, marginTop: -Math.min(inHeight, exHeight) ? `${Math.min(inHeight, exHeight) * -1}%` : '0' }} />
                  </div>
                </div>
                <div className="mt-2">{s.label}</div>
              </div>
            );
          })}
        </div>
        <div className="text-sm text-slate-500">Income (green) vs Expense (red)</div>
      </div>
    );
  }

  const maxValue = Math.max(income, expense, 1);
  const incomeRatio = Math.round((income / maxValue) * 100);
  const expenseRatio = Math.round((expense / maxValue) * 100);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">This month performance</div>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700">Income</span>
            <span className="text-slate-500">${income.toFixed(2)}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-emerald-500 rounded" style={{ width: `${incomeRatio}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700">Expense</span>
            <span className="text-slate-500">${expense.toFixed(2)}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-rose-500 rounded" style={{ width: `${expenseRatio}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default null;
