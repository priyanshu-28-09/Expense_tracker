import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
        <form onSubmit={submit} className="space-y-3">
          <input name="name" onChange={onChange} value={form.name} placeholder="Name" className="w-full p-2 border rounded" />
          <input name="email" onChange={onChange} value={form.email} placeholder="Email" className="w-full p-2 border rounded" />
          <input name="password" onChange={onChange} value={form.password} type="password" placeholder="Password" className="w-full p-2 border rounded" />
          <div className="flex items-center justify-between">
            <button className="px-4 py-2 bg-green-600 text-white rounded">Register</button>
            <Link to="/login" className="text-sm text-blue-600">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
