import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Cog, User, Bell, RefreshCw, Image as ImageIcon, Save, Eye, EyeOff, CheckCircle, AlertTriangle, LogOut, SlidersHorizontal, Globe, Shield, Database, Zap, ChevronRight, ChevronLeft, Mail, Trash2, Download, Languages, Sidebar as SidebarIcon, Settings as SettingsIcon, Key, Lock, Eye as EyeIcon, Users, Building, Phone, MapPin
} from 'lucide-react';

const tabConfig = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'data', label: 'Data & Privacy', icon: Database },
  { key: 'customization', label: 'Customization', icon: SlidersHorizontal },
  { key: 'system', label: 'System', icon: Zap },
];

const Settings: React.FC = () => {
  const {
    user,
    setUser,
    theme,
    setTheme,
    resetToSampleData,
    notifications,
    setNotifications,
    signOut,
    sidebarCollapsed,
    setSidebarCollapsed,
    machines,
    products,
    purchaseOrders,
    scheduleItems,
    playNotificationSound
  } = useApp();

  const [activeTab, setActiveTab] = useState('profile');
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  // Enhanced profile form state with company info
  const [formData, setFormData] = useState({
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    password: user?.password || '',
    profileImage: user?.profileImage || '',
    role: user?.role || 'operator',
    companyName: 'Manufacturing Company',
    companyAddress: '',
    phone: '',
    department: 'Production'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Enhanced notification preferences
  const [notificationSettings, setNotificationSettings] = useState({
    sound: true,
    criticalOnly: false,
    machineAlerts: true,
    orderUpdates: true,
    maintenanceReminders: true
  });

  // Handle notification sound toggle
  const handleNotificationSoundToggle = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));

    // If enabling sound, play a test sound
    if (key === 'sound' && value) {
      playNotificationSound();
    }
  };

  // Enhanced customization settings
  const [customizationSettings, setCustomizationSettings] = useState({
    sidebarAutoCollapse: sidebarCollapsed,
    defaultLanding: 'dashboard',
    compactMode: false,
    showAnimations: true,
    autoRefresh: true,
    refreshInterval: 30
  });

  // Enhanced data management
  const [dataStats, setDataStats] = useState({
    machines: 0,
    products: 0,
    orders: 0,
    scheduleItems: 0,
    notifications: 0
  });

  // Update data stats when data changes
  useEffect(() => {
    setDataStats({
      machines: machines.length,
      products: products.length,
      orders: purchaseOrders.length,
      scheduleItems: scheduleItems.length,
      notifications: notifications.length
    });
  }, [machines, products, purchaseOrders, scheduleItems, notifications]);

  // Enhanced profile submit with validation
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error('Name and email are required');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Update user with enhanced data
      const updatedUser = {
        ...user,
        ...formData,
        role: formData.role || user?.role || 'operator',
        profileImage: formData.profileImage
      };

      setUser(updatedUser);
      setShowToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      setShowToast({ message: error instanceof Error ? error.message : 'Failed to update profile', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('All password fields are required');
      }

      if (currentPassword !== user?.password) {
        throw new Error('Current password is incorrect');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      setUser(prev => prev ? { ...prev, password: newPassword } : null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowToast({ message: 'Password changed successfully!', type: 'success' });
    } catch (error) {
      setShowToast({ message: error instanceof Error ? error.message : 'Failed to change password', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced profile image handling
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setShowToast({ message: 'Image size must be less than 5MB', type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData((prev) => ({ ...prev, profileImage: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Enhanced data export
  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const exportData = {
        user: user,
        machines: machines,
        products: products,
        purchaseOrders: purchaseOrders,
        scheduleItems: scheduleItems,
        notifications: notifications,
        settings: {
          theme,
          notificationSettings,
          customizationSettings
        },
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const content = JSON.stringify(exportData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manufacturing-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowToast({ message: 'Data exported successfully!', type: 'success' });
    } catch (error) {
      setShowToast({ message: 'Failed to export data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced clear notifications
  const handleClearNotifications = () => {
    setNotifications([]);
    setShowToast({ message: 'All notifications cleared successfully!', type: 'success' });
  };

  // Enhanced reset demo
  const handleResetDemo = async () => {
    setIsLoading(true);
    try {
      resetToSampleData();
      setShowToast({ message: 'Demo data reset successfully!', type: 'success' });
    } catch (error) {
      setShowToast({ message: 'Failed to reset demo data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced sign out
  const handleSignOut = () => {
    signOut();
    setShowToast({ message: 'Signed out successfully!', type: 'success' });
  };

  // Toast auto-hide
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <SettingsIcon className="text-[#F24E1E]" size={32} /> Settings
            </h1>
            <p className="text-gray-500 text-lg">
              Manage your preferences and account settings
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 text-sm font-medium shadow-sm">
                Theme: <span className="capitalize text-gray-900">{theme}</span>
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F24E1E]/10 text-[#F24E1E] text-sm font-medium border border-[#F24E1E]/20">
                Role: <span className="capitalize">{user?.role}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Bar */}
        <div className="flex overflow-x-auto gap-2 mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 w-full md:w-fit no-scrollbar">
          {tabConfig.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 whitespace-nowrap
                  ${isActive
                    ? 'bg-[#F24E1E] text-white shadow-md shadow-orange-200'
                    : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Enhanced Tab Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-10">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-2 bg-[#F24E1E]/10 rounded-lg">
                  <User className="text-[#F24E1E]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
                  <p className="text-sm text-gray-500">Update your personal information and profile picture</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Profile Image Section */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100 flex flex-col items-center text-center">
                    <div className="relative mb-6 group">
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#F24E1E] to-orange-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden shadow-xl ring-4 ring-white">
                        {formData.profileImage ? (
                          <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          formData.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                      <label className="absolute bottom-2 right-2 bg-white rounded-full p-3 shadow-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 hover:scale-110 border border-gray-100">
                        <ImageIcon size={20} className="text-[#F24E1E]" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <h4 className="text-xl font-bold text-gray-900 mb-1">{formData.name}</h4>
                    <p className="text-gray-500 mb-4">{formData.email}</p>
                    <span className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full">
                      {formData.role}
                    </span>
                  </div>
                </div>

                {/* Profile Form Section */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleProfileSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User size={16} className="text-gray-400" /> Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" /> Email Address *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" /> Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Users size={16} className="text-gray-400" /> Department
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter your department"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building size={16} className="text-gray-400" /> Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter company name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" /> Company Address
                        </label>
                        <input
                          type="text"
                          value={formData.companyAddress}
                          onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                          placeholder="Enter company address"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Shield size={16} className="text-gray-400" /> Role
                        </label>
                        <div className="relative">
                          <select
                            value={formData.role}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all appearance-none"
                          >
                            <option value="operator">Operator</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                          <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90" size={18} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex items-center gap-2 px-8 py-3.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-all shadow-lg shadow-orange-200 font-semibold disabled:opacity-50 hover:-translate-y-0.5"
                      >
                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>

                  {/* Password Change Section */}
                  <div className="mt-12 pt-10 border-t border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-lg">
                        <Lock size={18} className="text-gray-600" />
                      </div>
                      Change Password
                    </h3>
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Current Password</label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all pr-12"
                              placeholder="Current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">New Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all pr-12"
                              placeholder="New password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                            placeholder="Confirm new password"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all font-semibold disabled:opacity-50 shadow-lg shadow-gray-200"
                        >
                          {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Key size={18} />}
                          {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-2 bg-[#F24E1E]/10 rounded-lg">
                  <Bell className="text-[#F24E1E]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Notification Preferences</h2>
                  <p className="text-sm text-gray-500">Manage how and when you receive notifications</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Notification Settings</h3>
                    <button
                      onClick={playNotificationSound}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs font-semibold shadow-sm"
                    >
                      <Bell size={14} />
                      Test Sound
                    </button>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(notificationSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between group">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {key === 'sound' ? 'Notification Sounds' :
                              key === 'criticalOnly' ? 'Critical Notifications Only' :
                                key === 'machineAlerts' ? 'Machine Alerts' :
                                  key === 'orderUpdates' ? 'Order Updates' :
                                    key === 'maintenanceReminders' ? 'Maintenance Reminders' : key}
                          </div>
                          <div className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors">
                            {key === 'sound' ? 'Play sounds for new notifications' :
                              key === 'criticalOnly' ? 'Show only high-priority notifications' :
                                key === 'machineAlerts' ? 'Get alerts for machine issues' :
                                  key === 'orderUpdates' ? 'Receive updates on order status' :
                                    key === 'maintenanceReminders' ? 'Get reminders for maintenance' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleNotificationSoundToggle(key, !value)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${value ? 'bg-[#F24E1E]' : 'bg-gray-200'
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Notifications</h3>
                  <div className="space-y-4">
                    {notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:shadow-md hover:border-gray-200">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'warning' ? 'bg-yellow-500' :
                              notification.type === 'error' ? 'bg-red-500' :
                                'bg-blue-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{notification.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-2 mt-0.5">{notification.message}</div>
                          <div className="text-xs text-gray-400 mt-2 font-medium">
                            {new Date(notification.timestamp).toLocaleDateString()} • {new Date(notification.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          <Bell size={20} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No notifications yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-2 bg-[#F24E1E]/10 rounded-lg">
                  <Database className="text-[#F24E1E]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Data & Privacy</h2>
                  <p className="text-sm text-gray-500">Manage your data storage and export options</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Data Statistics */}
                <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Data Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[
                      { label: 'Machines', value: dataStats.machines, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Products', value: dataStats.products, color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'Orders', value: dataStats.orders, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { label: 'Schedule', value: dataStats.scheduleItems, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'Alerts', value: dataStats.notifications, color: 'text-red-600', bg: 'bg-red-50' },
                    ].map((stat, idx) => (
                      <div key={idx} className="bg-white rounded-xl p-5 text-center border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Data Management</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <div className="font-semibold text-gray-900">Export Data</div>
                          <div className="text-sm text-gray-500 mt-0.5">Download your data as JSON file</div>
                        </div>
                        <button
                          onClick={handleExportData}
                          disabled={isLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm"
                        >
                          {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                          Export
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <div className="font-semibold text-gray-900">Clear Notifications</div>
                          <div className="text-sm text-gray-500 mt-0.5">Remove all notification history</div>
                        </div>
                        <button
                          onClick={handleClearNotifications}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all font-medium shadow-sm"
                        >
                          <Trash2 size={16} />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="text-blue-600" size={24} />
                      <h3 className="text-lg font-bold text-gray-900">Privacy & Security</h3>
                    </div>
                    <div className="space-y-4 text-sm text-gray-600">
                      <p className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        Your data is stored locally on your device using secure browser storage.
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        No personal information is shared with third parties or external servers.
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        You retain full ownership and control over your manufacturing data.
                      </p>
                      <p className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        Settings and preferences are automatically synced to your local environment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customization Tab */}
          {activeTab === 'customization' && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-2 bg-[#F24E1E]/10 rounded-lg">
                  <SlidersHorizontal className="text-[#F24E1E]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Customization</h2>
                  <p className="text-sm text-gray-500">Personalize your workspace experience</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Interface Settings</h3>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="font-semibold text-gray-900">Auto-collapse Sidebar</div>
                        <div className="text-sm text-gray-500 mt-0.5">Automatically hide sidebar on smaller screens</div>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !customizationSettings.sidebarAutoCollapse;
                          setCustomizationSettings(prev => ({ ...prev, sidebarAutoCollapse: newValue }));
                          setSidebarCollapsed(newValue);
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${customizationSettings.sidebarAutoCollapse ? 'bg-[#F24E1E]' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${customizationSettings.sidebarAutoCollapse ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="font-semibold text-gray-900">Compact Mode</div>
                        <div className="text-sm text-gray-500 mt-0.5">Use more compact layout for better space utilization</div>
                      </div>
                      <button
                        onClick={() => setCustomizationSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${customizationSettings.compactMode ? 'bg-[#F24E1E]' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${customizationSettings.compactMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="font-semibold text-gray-900">Show Animations</div>
                        <div className="text-sm text-gray-500 mt-0.5">Enable smooth animations and transitions</div>
                      </div>
                      <button
                        onClick={() => setCustomizationSettings(prev => ({ ...prev, showAnimations: !prev.showAnimations }))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${customizationSettings.showAnimations ? 'bg-[#F24E1E]' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${customizationSettings.showAnimations ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between group">
                      <div>
                        <div className="font-semibold text-gray-900">Auto Refresh</div>
                        <div className="text-sm text-gray-500 mt-0.5">Automatically refresh data periodically</div>
                      </div>
                      <button
                        onClick={() => setCustomizationSettings(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${customizationSettings.autoRefresh ? 'bg-[#F24E1E]' : 'bg-gray-200'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${customizationSettings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Theme Preview</h3>
                  <div className="space-y-6">
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#F24E1E] flex items-center justify-center text-white font-bold text-xs">A</div>
                        <div className="h-2 w-24 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-gray-100 rounded-full"></div>
                        <div className="h-2 w-2/3 bg-gray-100 rounded-full"></div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 w-20 bg-[#F24E1E] rounded-lg"></div>
                        <div className="h-8 w-20 bg-gray-100 rounded-lg"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                      Current theme uses <span className="font-bold text-[#F24E1E]">#F24E1E</span> as the primary accent color.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                <div className="p-2 bg-[#F24E1E]/10 rounded-lg">
                  <Zap className="text-[#F24E1E]" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
                  <p className="text-sm text-gray-500">Advanced system controls and session management</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Session Management</h3>

                  <div className="space-y-6">
                    <div className="p-5 bg-red-50 rounded-xl border border-red-100">
                      <h4 className="font-bold text-red-900 mb-2">Sign Out</h4>
                      <p className="text-sm text-red-700 mb-4">End your current session securely.</p>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-all font-semibold shadow-sm"
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </div>

                    <div className="p-5 bg-orange-50 rounded-xl border border-orange-100">
                      <h4 className="font-bold text-orange-900 mb-2">Reset Demo Data</h4>
                      <p className="text-sm text-orange-700 mb-4">Reset the application to its initial state with sample data. This cannot be undone.</p>
                      <button
                        onClick={handleResetDemo}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 transition-all font-semibold shadow-sm disabled:opacity-50"
                      >
                        {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        {isLoading ? 'Resetting...' : 'Reset Data'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">System Information</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-gray-600">Version</span>
                      <span className="font-mono font-medium text-gray-900">v1.2.4</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-gray-600">Build ID</span>
                      <span className="font-mono font-medium text-gray-900">2024.05.15-prod</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-gray-600">Environment</span>
                      <span className="font-medium text-green-600 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Production
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-gray-600">Browser</span>
                      <span className="font-medium text-gray-900">{navigator.userAgent.split(')')[0].split('(')[1] || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-200">
                      <span className="text-gray-600">Platform</span>
                      <span className="font-medium text-gray-900">{navigator.platform}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-300 z-50 animate-in slide-in-from-right-10 ${showToast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-500 text-white'
          }`}>
          {showToast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span className="font-medium">{showToast.message}</span>
        </div>
      )}
    </div>
  );
};

export default Settings;