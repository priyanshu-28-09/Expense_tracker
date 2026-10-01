import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <form onSubmit={submit} className="space-y-3">
          <input name="email" onChange={onChange} value={form.email} placeholder="Email" className="w-full p-2 border rounded" />
          <input name="password" type="password" onChange={onChange} value={form.password} placeholder="Password" className="w-full p-2 border rounded" />
          <div className="flex items-center justify-between">
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
            <Link to="/register" className="text-sm text-blue-600">Register</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
