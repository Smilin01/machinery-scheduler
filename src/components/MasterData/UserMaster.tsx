import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Save, User, Mail, Lock, Shield } from 'lucide-react';

// DemoUser type matches the context
interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

const UserMaster: React.FC = () => {
  const { user, setUser } = useApp();
  const [formData, setFormData] = useState<DemoUser>({
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || '',
    role: user?.role || 'admin',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUser(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-orange-50 rounded-xl">
          <User size={24} className="text-[#F24E1E]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Profile</h2>
          <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Full Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Role
            </label>
            <div className="relative">
              <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all appearance-none"
                required
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="operator">Operator</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F24E1E] text-white font-semibold rounded-xl hover:bg-[#d63d12] transition-colors shadow-lg shadow-orange-200 w-full md:w-auto"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserMaster;