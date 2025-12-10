import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  LayoutGrid,
  Database,
  ShoppingCart,
  Calendar,
  BarChart3,
  Bell,
  AlertTriangle,
  Clock,
  Cog,
  LogOut,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const rolePermissions = {
  superadmin: {
    dashboard: true,
    'master-data': true,
    'purchase-orders': true,
    scheduling: true,
    reports: true,
    notifications: true,
    alerts: true,
    holidays: true,
    'shift-management': true,
    settings: true,
  },
  admin: {
    dashboard: true,
    'master-data': true,
    'purchase-orders': true,
    scheduling: true,
    reports: true,
    notifications: true,
    alerts: true,
    holidays: true,
    'shift-management': true,
    settings: true,
  },
  operator: {
    dashboard: true,
    'master-data': false,
    'purchase-orders': true,
    scheduling: true,
    reports: false,
    notifications: true,
    alerts: true,
    holidays: false,
    'shift-management': false,
    settings: true,
  },
};

const Sidebar: React.FC = () => {
  const {
    user,
    sidebarCollapsed,
    setSidebarCollapsed,
    getUnreadNotificationsCount,
    getCriticalAlertsCount,
    signOut
  } = useApp();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const unreadCount = getUnreadNotificationsCount();
  const criticalAlerts = getCriticalAlertsCount();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutGrid,
      path: '/dashboard',
    },
    {
      id: 'master-data',
      label: 'Master Data',
      icon: Database,
      path: '/master-data',
    },
    {
      id: 'purchase-orders',
      label: 'Sales Orders',
      icon: ShoppingCart,
      path: '/purchase-orders',
    },
    {
      id: 'scheduling',
      label: 'Schedule',
      icon: Calendar,
      path: '/scheduling',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: BarChart3,
      path: '/reports',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount,
      path: '/notifications',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      badge: criticalAlerts,
      badgeColor: 'bg-[#F24E1E]',
      path: '/alerts',
    },
    {
      id: 'holidays',
      label: 'Holidays',
      icon: Calendar,
      path: '/holidays',
    },
    {
      id: 'shift-management',
      label: 'Shifts',
      icon: Clock,
      path: '/shift-management',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog,
      path: '/settings',
    },
  ];

  let role: keyof typeof rolePermissions =
    user?.role === 'manager' ? 'admin' :
      user?.role === 'superadmin' ? 'superadmin' :
        user?.role === 'admin' ? 'admin' :
          'operator';

  const allowedMenuItems = menuItems.filter(
    (item) => (rolePermissions[role] as Record<string, boolean>)[item.id] === true
  );

  return (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white h-screen flex flex-col transition-all duration-300 ease-in-out border-r border-gray-100 z-50`}>
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 bg-[#F24E1E] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-xl text-gray-900 tracking-tight">MANU<span className="font-normal">PRO</span></span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {allowedMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `w-full group relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2.5 rounded-lg transition-all duration-200 ` +
                    (isActive
                      ? 'bg-[#F24E1E] text-white shadow-md shadow-orange-200'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
                  }
                  end={item.path === '/dashboard'}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon size={20} strokeWidth={2} />
                    {item.badge && item.badge > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 ${item.badgeColor || 'bg-[#F24E1E]'} text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-bold border-2 border-white`}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="font-medium text-sm">{item.label}</span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Collapse Toggle */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {!sidebarCollapsed && user && (
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-gray-100 animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sign Out</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to sign out?</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    signOut();
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;