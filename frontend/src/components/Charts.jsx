import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts/es6';

const chartColors = ['#197d69', '#e5a33a', '#467aa1', '#db705f', '#6b8c5a', '#8770a6'];
const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-medium text-slate-700">{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-slate-600">
          <span>{entry.name || entry.dataKey}</span>
          <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const ChartEmpty = () => (
  <div className="flex h-56 items-center justify-center text-sm text-slate-500">
    Add transactions to see this chart.
  </div>
);

export const MonthlyExpensesChart = ({ data = [] }) => {
  if (!data.some((item) => Number(item.amount) > 0)) return <ChartEmpty />;

  return (
    <div className="h-60 w-full" aria-label="Monthly expense trend">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 240 }}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#197d69" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#197d69" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e8ecea" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64736e', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64736e', fontSize: 11 }} tickFormatter={(value) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="amount" name="Expenses" stroke="#197d69" strokeWidth={2.5} fill="url(#expenseFill)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CategoryExpensesChart = ({ data = [] }) => {
  const visibleData = [...data].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 7);
  if (!visibleData.some((item) => Number(item.amount) > 0)) return <ChartEmpty />;

  return (
    <div className="h-60 w-full" aria-label="Expense by category">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 240 }}>
        <BarChart data={visibleData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke="#e8ecea" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64736e', fontSize: 11 }} tickFormatter={(value) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
          <YAxis type="category" dataKey="category" width={86} axisLine={false} tickLine={false} tick={{ fill: '#46544f', fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="amount" name="Expenses" fill="#467aa1" radius={[0, 3, 3, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IncomeExpenseChart = ({ income = 0, expense = 0 }) => {
  const data = [{ period: 'This month', income: Number(income || 0), expense: Number(expense || 0) }];
  if (data[0].income === 0 && data[0].expense === 0) return <ChartEmpty />;

  return (
    <div className="h-60 w-full" aria-label="Income compared with expenses">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 240 }}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barGap={10}>
          <CartesianGrid stroke="#e8ecea" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#64736e', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64736e', fontSize: 11 }} tickFormatter={(value) => `₹${value >= 1000 ? `${Math.round(value / 1000)}k` : value}`} />
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: '#64736e' }} />
          <Bar dataKey="income" name="Income" fill="#197d69" radius={[3, 3, 0, 0]} barSize={30} />
          <Bar dataKey="expense" name="Expenses" fill="#db705f" radius={[3, 3, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PaymentMethodChart = ({ data = {} }) => {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value: Number(value || 0) })).filter((item) => item.value > 0);
  if (!chartData.length) return <ChartEmpty />;

  return (
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(110px,0.9fr)]">
      <div className="h-52 min-w-0" aria-label="Expense by payment method">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 240 }}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="82%" paddingAngle={2} stroke="none">
              {chartData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="shrink-0 font-medium text-slate-800">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};