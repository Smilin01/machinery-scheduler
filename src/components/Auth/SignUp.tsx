import React, { useState } from 'react';
import { UserPlus, Shield, UserCog, User, Eye, EyeOff, Mail, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const roles = [
  { value: 'superadmin', label: 'Super Admin', icon: <Shield className="text-purple-600" size={20} /> },
  { value: 'admin', label: 'Admin', icon: <UserCog className="text-blue-600" size={20} /> },
  { value: 'operator', label: 'Operator', icon: <User className="text-green-600" size={20} /> },
];

const roleDescriptions: Record<string, string> = {
  superadmin: 'Super Admin: Full access to all system settings, user management, and data.',
  admin: 'Admin: Manage production, machines, products, and orders. Cannot manage other admins.',
  operator: 'Operator: Can view and update assigned tasks, but cannot change master data or users.'
};

export default function SignUp({ onSignUp }: { onSignUp?: () => void }) {
  const { signUp } = useApp();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required.');
      setSuccess('');
      return;
    }
    // Use context signUp method
    const result = signUp(form);
    if (!result.success) {
      setError(result.message);
      setSuccess('');
      return;
    }
    setSuccess(result.message);
    setError('');
    if (onSignUp) onSignUp();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-indigo-100 to-indigo-300 relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-400 opacity-20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400 opacity-20 rounded-full blur-3xl animate-pulse" />
      <div className="bg-white/90 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-blue-100 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full p-4 mb-2 shadow-lg">
            <Sparkles size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h2>
          <p className="text-gray-500 text-sm">Sign up to get started with OptiFlow</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
            <div className="relative flex items-center">
              <User className="absolute left-3 text-indigo-400" size={20} />
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full pl-11 pr-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/50 text-gray-900 font-medium shadow-sm"
                placeholder="Your Name"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-indigo-400" size={20} />
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full pl-11 pr-3 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/50 text-gray-900 font-medium shadow-sm"
                placeholder="you@email.com"
                autoComplete="off"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full pl-3 pr-11 py-2 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/50 text-gray-900 font-medium shadow-sm"
                placeholder="Password"
                autoComplete="off"
              />
              <button type="button" className="absolute right-3" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeOff size={20} className="text-indigo-400" /> : <Eye size={20} className="text-indigo-400" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
            <div className="flex gap-2">
              {roles.map(r => (
                <label key={r.value} className={`flex items-center gap-1 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${form.role === r.value ? 'bg-indigo-100 border-indigo-400' : 'bg-gray-50 border-gray-200'}`}>
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={form.role === r.value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  {r.icon}
                  <span className="font-semibold text-xs">{r.label}</span>
                </label>
              ))}
            </div>
            {/* Role description info box */}
            <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 animate-fadeIn">
              <Shield className="text-blue-400" size={16} />
              {roleDescriptions[form.role]}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 justify-center bg-red-100 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm font-semibold animate-fadeIn shadow">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-red-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z' /></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 justify-center bg-green-100 border border-green-300 text-green-700 rounded-lg px-3 py-2 text-sm font-semibold animate-fadeIn shadow">
              <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' /></svg>
              {success}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-bold hover:from-indigo-700 hover:to-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg text-lg"
          >
            <UserPlus size={22} /> Sign Up
          </button>
        </form>
      </div>
    </div>
  );
} 