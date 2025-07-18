// ...existing code...
// ...existing code...
import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit,
  Trash2,
  Eye,
  Calendar
} from 'lucide-react';
import { LuxuryButton } from './atomic/DashboardComponents';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';

export default function ModernUserManagementPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const { clientId } = useAuth();
  const { users, loading, error } = useUsers(clientId);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Get role color
  const getRoleColor = (role) => {
    switch (role) {
      case 'nexus': return { bg: '#ffd700', color: '#0a0e1a' };
      case 'admin': return { bg: '#ef4444', color: '#fff' };
      case 'manager': return { bg: '#3b82f6', color: '#fff' };
      case 'user': return { bg: '#8792a3', color: '#fff' };
      default: return { bg: '#8792a3', color: '#fff' };
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'inactive': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'pending': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default: return { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  // Format time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Never';
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#bfc3d1'
        }}>
          Loading users...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '200px',
          color: '#ef4444'
        }}>
          Error loading users: {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, width: '2px', height: '100vh', background: '#2a3441', zIndex: 9999, pointerEvents: 'none' }} />
      <div style={{
        maxWidth: '1800px',
        margin: '0 auto',
        width: '100%',
        padding: '2.5rem 2.5rem 2.5rem 2.5rem',
        boxSizing: 'border-box',
      }}>
          {/* Panel Title and Controls Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: 0,
            padding: '0 0 1.5rem 0',
            gap: '0.8rem',
            flexWrap: 'wrap',
            border: 'none',
            background: 'none'
          }}>
            {/* Title and user count */}
            <div style={{ minWidth: '200px' }}>
              <h1 style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#ffd700',
                letterSpacing: '0.04em',
                margin: 0
              }}>
                User Management
              </h1>
              <p style={{
                fontSize: '0.8rem',
                fontWeight: '400',
                color: '#bfc3d1',
                margin: 0
              }}>
                {filteredUsers.length} of {users.length} users
              </p>
            </div>
            {/* Search and filters */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flex: '1',
              maxWidth: '600px',
              minWidth: '180px'
            }}>
              <div style={{ position: 'relative', flex: '1' }}>
                <Search size={14} style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.4rem 0.4rem 1.8rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,224,102,0.2)',
                    borderRadius: '6px',
                    color: '#e3e6f6',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
              
              {/* Role Filter */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,224,102,0.2)',
                  borderRadius: '6px',
                  color: '#e3e6f6',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Roles</option>
                <option value="nexus">Nexus</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">User</option>
              </select>
              
              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,224,102,0.2)',
                  borderRadius: '6px',
                  color: '#e3e6f6',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {/* Add User Button */}
            <LuxuryButton style={{ 
              padding: '0.25em 0.9em',
              fontSize: '0.9rem',
              borderRadius: '6px',
              whiteSpace: 'nowrap'
            }}>
              <UserPlus size={16} />
              Add User
            </LuxuryButton>
          </div>

          {/* User Card Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.2rem',
            marginTop: '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: 'none',
          }}>
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="nexus-user-card"
                style={{
                  background: '#151b2e',
                  border: '1px solid #2a3441',
                  borderRadius: '14px',
                  padding: '1.1rem 1.1rem 1rem 1.1rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 240,
                  maxWidth: 340,
                  minHeight: 320,
                  maxHeight: 320,
                  transition: 'background 0.18s, box-shadow 0.18s',
                  cursor: 'pointer',
                  margin: '0 auto',
                  justifyContent: 'flex-start',
                  alignItems: 'stretch',
                }}
                onClick={() => setSelectedUser(user)}
              >
      {/* User Details Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setSelectedUser(null)}
        >
          <div style={{
            background: '#181e2e',
            border: '1.5px solid #ffd700',
            borderRadius: '14px',
            padding: '2.2rem 2.2rem 1.5rem 2.2rem',
            minWidth: 340,
            maxWidth: 420,
            color: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
          >
            <h2 style={{ color: '#ffd700', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1.2rem' }}>User Details</h2>
            <div style={{ marginBottom: '0.7rem' }}>
              <b>Name:</b> {selectedUser.name}
            </div>
            <div style={{ marginBottom: '0.7rem' }}>
              <b>Role:</b> {selectedUser.role}
            </div>
            <div style={{ marginBottom: '0.7rem' }}>
              <b>Status:</b> {selectedUser.status}
            </div>
            {selectedUser.shift && (
              <div style={{ marginBottom: '0.7rem' }}>
                <b>Shift:</b> {selectedUser.shift}
              </div>
            )}
            {selectedUser.assignment && (
              <div style={{ marginBottom: '0.7rem' }}>
                <b>Assigned Areas:</b> {Array.isArray(selectedUser.assignment) ? selectedUser.assignment.join(', ') : selectedUser.assignment}
              </div>
            )}
            {selectedUser.last_login && (
              <div style={{ marginBottom: '0.7rem' }}>
                <b>Last Login:</b> {selectedUser.last_login}
              </div>
            )}
            {selectedUser.last_inspection && (
              <div style={{ marginBottom: '0.7rem' }}>
                <b>Last Inspection:</b> {selectedUser.last_inspection}
              </div>
            )}
            {selectedUser.created_at && (
              <div style={{ marginBottom: '0.7rem' }}>
                <b>Created At:</b> {selectedUser.created_at}
              </div>
            )}
            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setSelectedUser(null)} style={{
                background: 'none',
                border: '1px solid #ffd700',
                color: '#ffd700',
                borderRadius: '6px',
                padding: '0.5rem 1.2rem',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}>Close</button>
            </div>
            <div style={{ marginTop: '1.2rem', color: '#bfc3d1', fontSize: '0.85rem' }}>
              <b>Firebase Path:</b><br />
              clients/{clientId}/users/{selectedUser.username ? selectedUser.username.split('@')[0] : ''}
            </div>
          </div>
        </div>
      )}
                {/* Avatar and Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '0.8rem' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: getRoleColor(user.role).bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    color: getRoleColor(user.role).color,
                    flexShrink: 0
                  }}>
                    {(user.name || user.username || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.15rem', color: '#fff', marginBottom: '0.3rem' }}>
                      {/* First Name and Last Name only */}
                      {user.name ? user.name.split(' ')[0] : ''} {user.name ? user.name.split(' ')[1] || '' : ''}
                    </div>
                    <span style={{
                      background: getRoleColor(user.role).bg,
                      color: getRoleColor(user.role).color,
                      padding: '0.15em 0.7em',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>{user.role || 'user'}</span>
                  </div>
                </div>
                
                
                {/* Assigned Areas */}
                <div style={{ marginBottom: '0.8rem' }}>
                  <div style={{ color: '#ffd700', fontWeight: 500, fontSize: '0.85rem', marginBottom: '0.2rem' }}>Assigned Areas:</div>
                  <div style={{ color: '#e3e6f6', fontSize: '0.9rem' }}>{user.assignedAreas && user.assignedAreas.length > 0 ? user.assignedAreas.join(', ') : 'No areas assigned'}</div>
                </div>
                
                {/* Reset Password */}
                <div style={{ marginBottom: '0.8rem' }}>
                  <span style={{ color: '#ffd700', textDecoration: 'underline', fontWeight: 500, fontSize: '0.93rem', cursor: 'pointer' }}>Reset Password</span>
                </div>
                
                {/* Last Activity */}
                <div style={{ color: '#bfc3d1', fontSize: '0.85rem', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <Calendar size={12} style={{ color: '#9ca3af' }} />
                    <span style={{ color: '#fff', fontWeight: 500 }}>Last Login:</span>
                  </div>
                  <div style={{ color: '#9ca3af' }}>
                    {(() => {
                      if (!user.lastLogin) return 'No recent activity';
                      const now = new Date();
                      const last = new Date(user.lastLogin);
                      const diffHours = (now - last) / (1000 * 60 * 60);
                      if (diffHours > 12) return 'No recent activity';
                      return getTimeAgo(user.lastLogin);
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Add a style tag for the hover effect */}
          <style>{`
            .nexus-user-card {
              border: 1px solid #2a3441;
              transition: background 0.2s, border 0.2s;
            }
            .nexus-user-card:hover {
              background: rgba(255,224,102,0.05) !important;
              border: 1.5px solid rgba(255,224,102,0.22) !important;
              box-shadow: none !important;
            }
          `}</style>
      </div>
    </>
  );
}