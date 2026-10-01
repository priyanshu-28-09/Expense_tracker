import React, { useEffect, useState } from 'react';
import API from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ name: user?.name || '', email: user?.email || '' });
  }, [user]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await API.put('/user/profile', form);
      if (res.data?.user) {
        setUser(res.data.user);
        alert('Profile updated');
      } else {
        alert('Profile updated');
      }
    } catch (err) {
      alert(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Profile</h1>
          <p className="text-sm text-slate-500">Update your account information.</p>
        </div>
      </div>

      <div className="mt-6 max-w-md bg-white p-6 rounded-xl shadow">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              className="mt-2 w-full rounded border border-slate-200 p-3"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="mt-2 w-full rounded border border-slate-200 p-3"
              required
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
