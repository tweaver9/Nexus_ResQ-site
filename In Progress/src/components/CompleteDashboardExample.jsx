import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  BarChart3,
  Eye,
  Zap,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  Target,
  Gauge,
  Database,
  Cpu,
  Package,
  FileText,
  MapPin,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';
import { useAssets } from '../hooks/useAssets';
import { useLogs } from '../hooks/useLogs';
// CSS handled by App.css
import ModernUserManagementPanel from './ModernUserManagementPanel';
import ModernAssetsPanel from './ModernAssetsPanel';
import ModernLogsPanel from './ModernLogsPanel';
import ModernLocationsManager from './ModernLocationsManager';
import {
  GlassPanel,
  PremiumCard,
  StaggeredGrid,
  LuxuryButton
} from './atomic/DashboardComponents';

// Mock data for dashboard overview
const stats = [
  {
    title: 'Active Users',
    value: '24',
    change: '+2',
    icon: Users,
    color: '#ffd700',
    bgColor: 'rgba(255,215,0,0.15)',
    trend: 'up'
  },
  {
    title: 'System Status',
    value: 'Online',
    change: '100%',
    icon: Shield,
    color: '#ffd700',
    bgColor: 'rgba(255,215,0,0.15)',
    trend: 'stable'
  },
  {
    title: 'Recent Activity',
    value: '12',
    change: 'Today',
    icon: Activity,
    color: '#ffd700',
    bgColor: 'rgba(255,215,0,0.15)',
    trend: 'up'
  },
  {
    title: 'Performance',
    value: '98.5%',
    change: '+0.3%',
    icon: Gauge,
    color: '#ffd700',
    bgColor: 'rgba(255,215,0,0.15)',
    trend: 'up'
  }
];

const recentActivity = [
  {
    id: 1,
    type: 'system',
    message: 'System backup completed successfully',
    time: '2 minutes ago',
    status: 'success'
  },
  {
    id: 2,
    type: 'user',
    message: 'New user login detected from 192.168.1.100',
    time: '15 minutes ago',
    status: 'info'
  },
  {
    id: 3,
    type: 'update',
    message: 'Database schema updated to version 2.1.0',
    time: '1 hour ago',
    status: 'success'
  },
  {
    id: 4,
    type: 'warning',
    message: 'High memory usage detected on server-01',
    time: '3 hours ago',
    status: 'warning'
  }
];

const quickActions = [
  { title: 'Add User', icon: Users, color: '#ffd700' },
  { title: 'View Logs', icon: Activity, color: '#ffd700' },
  { title: 'System Settings', icon: Settings, color: '#ffd700' },
  { title: 'Export Data', icon: Download, color: '#bfc3d1' }
];

export default function CompleteDashboardExample() {
  const [activePanel, setActivePanel] = useState('dashboard');
  const [jiggle, setJiggle] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const { currentUser, logout } = useAuth();
  const { users } = useUsers('demo-client');
  const { assets } = useAssets('demo-client');
  const { logs } = useLogs('demo-client', false);

  // Always show dashboard - no login screen needed (post-login state)

  // Calculate real stats from Firebase data
  const stats = [
    {
      title: 'Active Users',
      value: users.filter(u => u.status === 'active' || u.status === true).length.toString(),
      change: `${users.length} total`,
      icon: Users,
      color: '#ffd700',
      bgColor: 'rgba(255,215,0,0.15)',
      trend: 'up'
    },
    {
      title: 'Total Assets',
      value: assets.length.toString(),
      change: `${assets.filter(a => a.status === true).length} active`,
      icon: Package,
      color: '#ffd700',
      bgColor: 'rgba(255,215,0,0.15)',
      trend: 'stable'
    },
    {
      title: 'Recent Activity',
      value: logs.length.toString(),
      change: 'Last 24h',
      icon: Activity,
      color: '#ffd700',
      bgColor: 'rgba(255,215,0,0.15)',
      trend: 'up'
    },
    {
      title: 'System Status',
      value: 'Online',
      change: '100%',
      icon: Shield,
      color: '#ffd700',
      bgColor: 'rgba(255,215,0,0.15)',
      trend: 'stable'
    }
  ];

  const recentActivity = logs.slice(0, 4).map((log, index) => ({
    id: log.id || index,
    type: log.type || 'system',
    message: log.action || log.message || 'System activity',
    time: log.timestamp ? new Date(log.timestamp.toDate ? log.timestamp.toDate() : log.timestamp).toLocaleString() : 'Unknown time',
    status: log.error ? 'error' : 'success'
  }));

  const quickActions = [
    { title: 'Add User', icon: Users, color: '#ffd700', action: () => setActivePanel('Users') },
    { title: 'Add Asset', icon: Package, color: '#ffd700', action: () => setActivePanel('Assets') },
    { title: 'View Logs', icon: Activity, color: '#ffd700', action: () => setActivePanel('Logs') },
    { title: 'Manage Locations', icon: MapPin, color: '#ffd700', action: () => setActivePanel('Locations') },
    { title: 'System Settings', icon: Settings, color: '#bfc3d1', action: () => setActivePanel('Settings') }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4" style={{ color: '#ffd700' }} />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" style={{ color: '#ffd700' }} />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" style={{ color: '#bfc3d1' }} />;
      default:
        return <Activity className="w-4 h-4" style={{ color: '#ffd700' }} />;
    }
  };

  const handleBellClick = () => {
    setJiggle(false);
    setTimeout(() => setJiggle(true), 10);
  };

  const handleBellAnimationEnd = () => setJiggle(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Always show dashboard - no loading screen needed
  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="w-16 h-16 border-4 border-nexus-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
  //         <p className="text-text-primary font-medium">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Render the appropriate panel
  const renderPanel = () => {
    switch (activePanel) {
      case 'Users':
        return <ModernUserManagementPanel />;
      case 'Assets':
        return <ModernAssetsPanel />;
      case 'Logs':
        return <ModernLogsPanel />;
      case 'Locations':
        return <ModernLocationsManager />;
      case 'Settings':
        return <div style={{ padding: '2rem', color: '#bfc3d1' }}>Settings Panel - Coming Soon</div>;
      case 'Assignments':
        return (
          <div style={{ padding: '2.5rem', minHeight: '60vh', color: '#e3e6f6', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 500, color: '#ffd700', letterSpacing: '0.08em', margin: 0 }}>
                Assignments
              </h1>
              <button
                onClick={() => setShowAssignmentModal(true)}
                style={{
                  background: 'linear-gradient(90deg, #ffd700 80%, #fffbe6 100%)',
                  color: '#181a2c',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '0.7em 2em',
                  boxShadow: '0 2px 12px #ffd70033',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.18s, color 0.18s',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7em'
                }}
              >
                <Target size={18} style={{ color: '#bfa100' }} />
                Create Assignment
              </button>
            </div>
            {/* Modal Shell - absolutely positioned inside panel */}
            {showAssignmentModal && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(10,10,20,0.55)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
              }}>
                <div style={{
                  background: 'rgba(24,26,44,0.90)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid #ffd70088',
                  borderRadius: '22px',
                  boxShadow: '0 8px 32px #ffd70022, 0 0 1.5px #ffd70044 inset',
                  padding: '2.5rem 2.2rem',
                  minWidth: '340px',
                  maxWidth: '98vw',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  color: '#e3e6f6'
                }}>
                  <button
                    onClick={() => setShowAssignmentModal(false)}
                    style={{
                      position: 'absolute',
                      top: 18, right: 18,
                      background: 'none',
                      border: 'none',
                      color: '#ffd700',
                      fontSize: '1.5rem',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <h2 style={{ color: '#ffd700', fontWeight: 600, fontSize: '1.15rem', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.07em' }}>
                    Create Assignment
                  </h2>
                  {/* Modal content will go here */}
                  <div style={{ color: '#bfc3d1', textAlign: 'center', fontSize: '1.05rem', padding: '2.5rem 0' }}>
                    Assignment creation flow coming soon...
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'dashboard':
      default:
        return (
          <>
            {/* Dashboard Overview Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.8rem'
            }}>
              <div>
                <h1 style={{
                  fontSize: '1rem',
                  fontWeight: '400',
                  color: '#ffd700',
                  letterSpacing: '0.03em',
                  margin: '0 0 0.2rem 0'
                }}>
                  Dashboard Overview
                </h1>
                <p style={{
                  fontSize: '0.75rem',
                  fontWeight: '300',
                  color: '#bfc3d1',
                  margin: 0
                }}>
                  Welcome back, {currentUser?.displayName || currentUser?.email || 'Demo User'}! Here's what's happening with your system today.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,224,102,0.2)'
                }}>
                  <div style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#ffd700'
                  }}></div>
                  <span style={{ color: '#e3e6f6', fontSize: '0.7rem' }}>System Online</span>
                </div>
                <button
                  onClick={handleBellClick}
                  onAnimationEnd={handleBellAnimationEnd}
                  className={jiggle ? 'bell-jiggle' : ''}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,224,102,0.2)',
                    borderRadius: '4px',
                    padding: '0.4rem',
                    color: '#ffd700',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Bell size={12} />
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '4px',
                    padding: '0.4rem',
                    color: '#ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(239,68,68,0.2)';
                    e.target.style.borderColor = 'rgba(239,68,68,0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(239,68,68,0.1)';
                    e.target.style.borderColor = 'rgba(239,68,68,0.2)';
                  }}
                >
                  <LogOut size={12} />
                  <span style={{ fontSize: '0.7rem' }}>Logout</span>
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <StaggeredGrid style={{ marginBottom: '0.8rem' }}>
              {stats.map((stat, index) => (
                <PremiumCard key={index}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.3rem' }}>
                    <div style={{
                      background: stat.bgColor,
                      borderRadius: '6px',
                      padding: '0.6rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <stat.icon size={18} style={{ color: stat.color }} />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e3e6f6' }}>
                      {stat.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.4rem',
                    marginTop: '0.3rem'
                  }}>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      color: stat.trend === 'up' ? '#ffd700' : stat.trend === 'down' ? '#bfc3d1' : '#9ca3af'
                    }}>
                      {stat.change}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      from last week
                    </span>
                  </div>
                </PremiumCard>
              ))}
            </StaggeredGrid>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem' }}>
              {/* Recent Activity */}
              <GlassPanel>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <h2 style={{
                    fontSize: '1rem',
                    fontWeight: '400',
                    color: '#ffd700',
                    margin: 0
                  }}>
                    Recent Activity
                  </h2>
                  <LuxuryButton variant="secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    View All
                  </LuxuryButton>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {recentActivity.length > 0 ? recentActivity.map((activity) => (
                    <div key={activity.id} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.8rem',
                      padding: '0.8rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,224,102,0.08)',
                      transition: 'all 0.2s ease'
                    }}>
                      {getStatusIcon(activity.status)}
                      <div style={{ flex: 1 }}>
                        <p style={{ 
                          margin: '0 0 0.2rem 0', 
                          color: '#e3e6f6',
                          fontSize: '0.85rem'
                        }}>
                          {activity.message}
                        </p>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: '#9ca3af' 
                        }}>
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '0.9rem'
                    }}>
                      No recent activity
                    </div>
                  )}
                </div>
              </GlassPanel>

              {/* Quick Actions */}
              <GlassPanel>
                <h2 style={{
                  fontSize: '1rem',
                  fontWeight: '400',
                  color: '#ffd700',
                  margin: '0 0 1rem 0'
                }}>
                  Quick Actions
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.8rem',
                        padding: '0.8rem',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,224,102,0.12)',
                        borderRadius: '6px',
                        color: '#e3e6f6',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'left',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(255,224,102,0.05)';
                        e.target.style.borderColor = 'rgba(255,224,102,0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255,255,255,0.03)';
                        e.target.style.borderColor = 'rgba(255,224,102,0.12)';
                      }}
                    >
                      <div style={{
                        background: `${action.color}20`,
                        borderRadius: '5px',
                        padding: '0.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <action.icon size={14} style={{ color: action.color }} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                        {action.title}
                      </span>
                    </button>
                  ))}
                </div>
              </GlassPanel>
            </div>
          </>
        );
    }
  };

  return (
    <>
      <style>{`
        @keyframes jiggle {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(-10deg); }
          30% { transform: rotate(8deg); }
          45% { transform: rotate(-6deg); }
          60% { transform: rotate(4deg); }
          75% { transform: rotate(-2deg); }
          100% { transform: rotate(0deg); }
        }
        .bell-jiggle {
          animation: jiggle 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, right: 0, width: '2px', height: '100vh', background: '#2a3441', zIndex: 9999, pointerEvents: 'none' }} />
      <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar removed: now only rendered in App.jsx */}
        
        {/* Main Content Zone */}
        <div className="main-content-zone" style={{ flex: 1, padding: '0.9rem', overflow: 'hidden' }}>
          {renderPanel()}
        </div>
      </div>
    </>
  );
} 