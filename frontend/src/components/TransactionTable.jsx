import React from 'react';

const TransactionTable = ({ items = [], onDelete }) => {
  return (
    <div className="bg-white shadow rounded overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-slate-600">Type</th>
            <th className="p-3 text-left text-slate-600">Description</th>
            <th className="p-3 text-right text-slate-600">Amount</th>
            <th className="p-3 text-left text-slate-600">Date</th>
            <th className="p-3 text-right text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="5" className="p-6 text-center text-slate-500">
                No transactions yet.
              </td>
            </tr>
          ) : (
            items.map((it) => (
              <tr key={it._id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    it.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {it.type ? it.type.toUpperCase() : 'OTHER'}
                  </span>
                </td>
                <td className="p-3">{it.description}</td>
                <td className="p-3 text-right font-semibold">${Number(it.amount || 0).toFixed(2)}</td>
                <td className="p-3">{new Date(it.date || it.createdAt).toLocaleDateString()}</td>
                <td className="p-3 text-right">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(it._id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
