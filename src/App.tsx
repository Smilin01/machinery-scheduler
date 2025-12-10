import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';
import Dashboard from './components/Dashboard/Dashboard';
import MasterData from './components/MasterData/MasterData';
import PurchaseOrders from './components/PurchaseOrders/PurchaseOrders';
import Scheduling from './components/Scheduling/Scheduling';
import Reports from './components/Reports/Reports';
import Notifications from './components/Notifications/Notifications';
import Alerts from './components/Alerts/Alerts';
import HolidaySettings from './components/HolidaySettings';
import Settings from './components/Settings/Settings';
import ShiftManagement from './components/ShiftManagement/ShiftManagement';
import { AppProvider, useApp } from './contexts/AppContext';
import SignIn from './components/Auth/SignIn';
import SignUp from './components/Auth/SignUp';
import React, { useState } from 'react';

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

function NotAuthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-blue-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-red-200 flex flex-col items-center">
        <span className="text-5xl mb-2">🚫</span>
        <h2 className="text-2xl font-bold text-red-700 mb-2">Not Authorized</h2>
        <p className="text-gray-700 text-center">You do not have permission to access this page.</p>
        <a href="#/dashboard" className="mt-4 text-blue-600 underline">Go to Dashboard</a>
      </div>
    </div>
  );
}

function ProtectedRoute({ page, children }: { page: keyof typeof rolePermissions['admin'], children: React.ReactNode }) {
  const { user, authToken } = useApp();
  if (!user || !authToken) return <Navigate to="/login" replace />;
  // Map 'manager' to 'admin' for permissions
  let role = (user.role === 'manager' ? 'admin' : user.role) as 'admin' | 'superadmin' | 'operator';
  if (rolePermissions[role][page]) {
    return <>{children}</>;
  }
  return <NotAuthorized />;
}

function AuthGate() {
  const { user, authToken } = useApp();
  const [showSignUp, setShowSignUp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // If not authenticated, show login/signup
  if (!user || !authToken) {
    // If already on /login or /signup, stay, else redirect to /login
    if (location.pathname !== '/login' && location.pathname !== '/signup') {
      return <Navigate to="/login" replace />;
    }
    return (
      <>
        {showSignUp ? (
          <SignUp onSignUp={() => setShowSignUp(false)} />
        ) : (
          <SignIn onSignIn={() => navigate('/dashboard')} />
        )}
        <div className="absolute top-4 right-4">
          {showSignUp ? (
            <button className="text-blue-600 underline" onClick={() => setShowSignUp(false)}>
              Already have an account? Sign In
            </button>
          ) : (
            <button className="text-blue-600 underline" onClick={() => setShowSignUp(true)}>
              New user? Sign Up
            </button>
          )}
        </div>
      </>
    );
  }

  // If authenticated and on /login or /signup, redirect to dashboard
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return <Navigate to="/dashboard" replace />;
  }

  // Main app layout when user is logged in
  return (
    <div className="flex h-screen bg-[#F8F9FC] overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute page="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/master-data" element={<ProtectedRoute page="master-data"><MasterData /></ProtectedRoute>} />
            <Route path="/purchase-orders" element={<ProtectedRoute page="purchase-orders"><PurchaseOrders /></ProtectedRoute>} />
            <Route path="/scheduling" element={<ProtectedRoute page="scheduling"><Scheduling /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute page="reports"><Reports /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute page="notifications"><Notifications /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute page="alerts"><Alerts /></ProtectedRoute>} />
            <Route path="/holidays" element={<ProtectedRoute page="holidays"><HolidaySettings /></ProtectedRoute>} />
            <Route path="/shift-management" element={<ProtectedRoute page="shift-management"><ShiftManagement /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute page="settings"><Settings /></ProtectedRoute>} />
            {/* Add login and signup routes for unauthenticated users */}
            <Route path="/login" element={<SignIn onSignIn={() => navigate('/dashboard')} />} />
            <Route path="/signup" element={<SignUp onSignUp={() => setShowSignUp(false)} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AuthGate />
    </AppProvider>
  );
}

export default App;