import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { useAuthStore } from './store/authStore';

import AgreementPage from './pages/AgreementPage';

import DashboardPage from './pages/DashboardPage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdmin = localStorage.getItem('admin_auth') === 'true';
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

import { Toaster } from 'react-hot-toast';

function App() {
  const [isAdminDomain, setIsAdminDomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    // Check if subdomain is 'admin' OR if we are on localhost with a specific query param for testing ?admin=true
    const isAdmin = hostname.startsWith('admin.') || window.location.search.includes('admin=true');
    setIsAdminDomain(isAdmin);

    // SECURITY: Prevent indexing of Admin Panel
    if (isAdmin) {
      const meta = document.createElement('meta');
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
      document.title = "AITE 2026 - Admin Portal (Restricted)";
    } else {
       document.title = "AITE 2026 - Volunteer Agreement Portal";
    }
  }, []);

  return (
    <Router>
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      {isAdminDomain ? (
        // ====================================================
        // 2️⃣ ADMIN PANEL (Restricted Access)
        // ====================================================
        <Routes>
          <Route path="/" element={<AdminLoginPage />} />
          <Route 
            path="/dashboard" 
            element={
              <AdminRoute>
                <DashboardPage />
              </AdminRoute>
            } 
          />
          {/* Catch all for admin: redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        // ====================================================
        // 1️⃣ VOLUNTEER PORTAL (Public Access)
        // ====================================================
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route 
            path="/agreement" 
            element={
              <ProtectedRoute>
                <AgreementPage />
              </ProtectedRoute>
            } 
          />
          {/* Admin login strictly hidden from public domain */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          
          {/* Catch all for volunteers: redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
