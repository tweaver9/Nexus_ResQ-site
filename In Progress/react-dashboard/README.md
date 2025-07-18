import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../src/components/Sidebar';
// Dummy panel components for demonstration
const Dashboard = () => <div style={{padding: '2rem', color: '#fff'}}>Dashboard Home</div>;
const Admin = () => <div style={{padding: '2rem', color: '#fff'}}>Admin Panel</div>;
const Inspections = () => <div style={{padding: '2rem', color: '#fff'}}>Inspections Panel</div>;
const Assignments = () => <div style={{padding: '2rem', color: '#fff'}}>Assignments Panel</div>;
const Assets = () => <div style={{padding: '2rem', color: '#fff'}}>Assets Panel</div>;
const Users = () => <div style={{padding: '2rem', color: '#fff'}}>Users Panel</div>;
const Logs = () => <div style={{padding: '2rem', color: '#fff'}}>Logs Panel</div>;
const Analytics = () => <div style={{padding: '2rem', color: '#fff'}}>Analytics Panel</div>;
const Help = () => <div style={{padding: '2rem', color: '#fff'}}>Help Panel</div>;
const FirebaseManager = () => <div style={{padding: '2rem', color: '#fff'}}>Firebase Manager</div>;
const NexusAdmin = () => <div style={{padding: '2rem', color: '#fff'}}>Nexus Admin</div>;
const OnboardClient = () => <div style={{padding: '2rem', color: '#fff'}}>Onboard Client</div>;

function App() {
  // Use location to determine active panel for Sidebar
  const location = useLocation();
  // Map path to panel name
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/users" element={<Users />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
          <Route path="/firebase-manager" element={<FirebaseManager />} />
          <Route path="/nexus-admin" element={<NexusAdmin />} />
          <Route path="/onboard-client" element={<OnboardClient />} />
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
