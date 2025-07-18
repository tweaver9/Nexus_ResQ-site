import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CompleteDashboardExample from './components/CompleteDashboardExample';
import ModernUserManagementPanel from './components/ModernUserManagementPanel';
import ModernLogsPanel from './components/ModernLogsPanel';
import ModernAssetsPanel from './components/ModernAssetsPanel';
import LogsPanel from './components/LogsPanel';
import LoginPanel from './components/LoginPanel';
import { Navigate } from 'react-router-dom';
import useClientStore from './store/clientStore';
// import { AnimatedPanel } from './components/AnimatedCard';

function AdminRoute({ children }) {
  // Check role from Zustand store or sessionStorage
  const { role } = useClientStore.getState();
  const sessionRole = typeof window !== 'undefined' ? (sessionStorage.getItem('role') || localStorage.getItem('role')) : null;
  const userRole = role || sessionRole;
  if (userRole === 'admin' || userRole === 'nexus') {
    return children;
  } else {
    return <Navigate to="/" replace />;
  }
}

function App() {
  const location = useLocation();
  const pathToPanel = {
    '/': 'dashboard',
    '/admin': 'Admin',
    '/inspections': 'Inspections',
    '/assignments': 'Assignments',
    '/assets': 'Assets',
    '/users': 'Users',
    '/logs': 'Logs',
    '/analytics': 'Analytics',
    '/help': 'Help',
    '/firebase-manager': 'Firebase Manager',
    '/nexus-admin': 'Nexus Admin',
    '/onboard-client': 'Onboard Client',
  };
  const activePanel = pathToPanel[location.pathname] || 'dashboard';
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#101624' }}>
      <Sidebar activePanel={activePanel} />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<CompleteDashboardExample />} />
          <Route path="/admin" element={
            <AdminRoute>
              <CompleteDashboardExample />
            </AdminRoute>
          } />
          {/* <Route path="/inspections" element={<AnimatedPanel />} /> */}
          {/* <Route path="/assignments" element={<Sidebar />} /> */}
          <Route path="/assets" element={<ModernAssetsPanel />} />
          <Route path="/users" element={<ModernUserManagementPanel />} />
          <Route path="/logs" element={<ModernLogsPanel />} />
          <Route path="/analytics" element={<LogsPanel />} />
          {/* <Route path="/help" element={<Sidebar />} /> */}
          {/* <Route path="/firebase-manager" element={<Sidebar />} /> */}
          {/* <Route path="/nexus-admin" element={<Sidebar />} /> */}
          {/* <Route path="/onboard-client" element={<Sidebar />} /> */}
        </Routes>
      </div>
    </div>
  );
}

export default function AppWithRouter() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
