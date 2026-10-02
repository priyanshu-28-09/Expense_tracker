import React from 'react';

const tones = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-sky-50 text-sky-700',
  rose: 'bg-rose-50 text-rose-700',
  amber: 'bg-amber-50 text-amber-700',
  teal: 'bg-teal-50 text-teal-700',
  slate: 'bg-slate-100 text-slate-700',
};

const SummaryCard = ({ title, value, icon: Icon, tone = 'slate' }) => {
  return (
    <div className="min-w-0 rounded border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-xs font-medium text-slate-500 sm:text-sm">{title}</div>
        {Icon && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded ${tones[tone] || tones.slate}`}>
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
      </div>
      <div className="mt-2 truncate text-lg font-semibold tabular-nums text-slate-900 sm:text-xl">{value}</div>
    </div>
  );
};

export default SummaryCard;
