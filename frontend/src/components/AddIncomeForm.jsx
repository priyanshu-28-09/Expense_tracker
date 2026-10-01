import React, { useState } from 'react';
import API from '../api/axiosInstance';

const AddIncomeForm = ({ onAdded }) => {
  const [form, setForm] = useState({ description: '', amount: '', category: '', date: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/income/add', { ...form, amount: Number(form.amount) });
      setForm({ description: '', amount: '', category: '', date: '' });
      onAdded && onAdded();
    } catch (err) {
      if (err.response?.status === 401) return;
      alert(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded shadow">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input name="description" value={form.description} onChange={handleChange} placeholder="Description" className="p-2 border rounded" />
        <input name="amount" value={form.amount} onChange={handleChange} placeholder="Amount" type="number" className="p-2 border rounded" />
        <input name="category" value={form.category} onChange={handleChange} placeholder="Source" className="p-2 border rounded" />
        <input name="date" value={form.date} onChange={handleChange} type="date" className="p-2 border rounded" />
      </div>
      <div className="mt-3 text-right">
        <button disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded">Add Income</button>
      </div>
    </form>
  );
};

export default AddIncomeForm;
