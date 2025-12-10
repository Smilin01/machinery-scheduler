import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const Navbar: React.FC = () => {
  const { user, getUnreadNotificationsCount } = useApp();
  const unreadCount = getUnreadNotificationsCount();

  return (
    <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 group-focus-within:text-[#F24E1E] transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#F24E1E] focus:border-[#F24E1E] sm:text-sm transition-all duration-200"
            placeholder="Search..."
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-xs border border-gray-200 rounded px-1.5 py-0.5">⌘ F</span>
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4 ml-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-[#F24E1E] ring-2 ring-white" />
          )}
        </button>

        {/* Profile */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-100">
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">{user?.name || 'User'}</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
