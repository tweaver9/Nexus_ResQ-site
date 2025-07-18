import React, { useState } from 'react';
import { 
  Search, 
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock
} from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { useAuth } from '../contexts/AuthContext';

// Helper to group logs by day
function groupLogsByDay(logs) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  logs.forEach(log => {
    const logDate = new Date(log.timestamp);
    if (isSameDay(logDate, today)) groups.Today.push(log);
    else if (isSameDay(logDate, yesterday)) groups.Yesterday.push(log);
    else groups.Earlier.push(log);
  });
  return groups;
}

// Modal for log details
function LogDetailsModal({ log, onClose }) {
  if (!log) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.45)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem',
    }}>
      <div style={{
        background: 'rgba(24,26,44,0.97)',
        border: '2px solid #ffd700',
        borderRadius: '18px',
        boxShadow: '0 8px 32px #ffd70022, 0 0 1.5px #ffd70044 inset',
        maxWidth: 500,
        width: '100%',
        padding: '2rem 2rem 1.5rem 2rem',
        position: 'relative',
        fontFamily: 'Oswald, Inter, monospace',
        color: '#e3e6f6',
        overflowY: 'auto',
        maxHeight: '80vh',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute',
          top: 18, right: 18,
          background: 'none',
          border: 'none',
          color: '#ffd700',
          fontSize: 22,
          cursor: 'pointer',
          fontWeight: 700,
        }}>&times;</button>
        <h2 style={{ color: '#ffd700', fontWeight: 700, fontSize: '1.1rem', margin: '0 0 1.2rem 0', letterSpacing: '0.04em' }}>Log Details</h2>
        <pre style={{
          background: 'rgba(24,28,44,0.92)',
          borderRadius: '10px',
          padding: '1rem',
          color: '#ffd700',
          fontSize: '0.98rem',
          fontFamily: 'Fira Mono, Menlo, monospace',
          overflowX: 'auto',
          margin: 0,
        }}>{JSON.stringify(log, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function ModernLogsPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showOnlyImportant, setShowOnlyImportant] = useState(false);
  const { clientId } = useAuth();
  const { logs: realLogs, loading, error } = useLogs(clientId, showOnlyImportant);
  // Add a single dummy log if logs is empty
  const logs = realLogs.length > 0 ? realLogs : [{
    id: 'dummy1',
    type: 'Inspection Past Due',
    action: 'Inspection missed for Fire Extinguisher',
    subject: 'Fire Extinguisher #123',
    username: 'system',
    timestamp: new Date().toISOString(),
    details: 'Annual inspection not completed by due date.',
  }];
  const [selectedLog, setSelectedLog] = useState(null);

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.error?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || log.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertTriangle size={14} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertTriangle size={14} style={{ color: '#fbbf24' }} />;
      case 'success':
        return <CheckCircle size={14} style={{ color: '#10b981' }} />;
      default:
        return <Info size={14} style={{ color: '#3b82f6' }} />;
    }
  };

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#fbbf24';
      case 'success':
        return '#10b981';
      default:
        return '#3b82f6';
    }
  };

  // Define critical log types
  const CRITICAL_TYPES = [
    'Area Out of Compliance',
    'Failed Asset Override',
    'Inspection Past Due',
    'Hydro Past Due',
  ];

  // Separate critical and non-critical logs
  const [acknowledged, setAcknowledged] = useState([]); // store acknowledged log ids
  const criticalLogs = filteredLogs.filter(
    log => CRITICAL_TYPES.includes(log.type) && !acknowledged.includes(log.id)
  );
  const nonCriticalLogs = filteredLogs.filter(
    log => !CRITICAL_TYPES.includes(log.type) || acknowledged.includes(log.id)
  );

  // Determine if user is admin (replace with your real admin logic)
  const isAdmin = true; // TODO: replace with real admin check

  const handleAcknowledge = (logId) => {
    setAcknowledged(prev => [...prev, logId]);
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
          Loading logs...
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
          Error loading logs: {error.message || error}
        </div>
      </div>
    );
  }

  const groupedLogs = groupLogsByDay(nonCriticalLogs);
  const dayOrder = ['Today', 'Yesterday', 'Earlier'];

  return (
    <div style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}>
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
        {/* Title and log count */}
        <div style={{ minWidth: '200px' }}>
          <h1 style={{
            fontSize: '1.1rem',
            fontWeight: '700',
            color: '#ffd700',
            letterSpacing: '0.04em',
            margin: 0
          }}>
            System Logs
          </h1>
          <p style={{
            fontSize: '0.8rem',
            fontWeight: '400',
            color: '#bfc3d1',
            margin: 0
          }}>
            {filteredLogs.length} of {logs.length} logs
          </p>
        </div>
        {/* Search and filters */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flex: '1',
          maxWidth: '450px',
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
              placeholder="Search logs..."
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
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{
              padding: '0.4rem 0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,224,102,0.2)',
              borderRadius: '6px',
              color: '#e3e6f6',
              fontSize: '0.85rem',
              minWidth: '90px'
            }}
          >
            <option value="all">All Types</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
          </select>
          <button
            onClick={() => setShowOnlyImportant(!showOnlyImportant)}
            style={{
              padding: '0.4rem 0.6rem',
              background: showOnlyImportant ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showOnlyImportant ? 'rgba(255,215,0,0.4)' : 'rgba(255,224,102,0.2)'}`,
              borderRadius: '6px',
              color: showOnlyImportant ? '#ffd700' : '#e3e6f6',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Important Only
          </button>
        </div>
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={{
            padding: '0.4rem 0.6rem',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: '6px',
            color: '#ffd700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <RefreshCw size={14} />
            Refresh
          </button>
          <button style={{
            padding: '0.4rem 0.6rem',
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: '6px',
            color: '#ffd700',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Critical Alerts Section */}
      {criticalLogs.length > 0 && (
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem',
        }}>
          <h2 style={{
            color: '#ffd700',
            fontWeight: 700,
            fontSize: '1.05rem',
            letterSpacing: '0.04em',
            margin: '0 0 0.7rem 0',
            textTransform: 'uppercase',
          }}>Critical Alerts</h2>
          {criticalLogs.map(log => (
            <div key={log.id} style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(24,26,44,0.92)',
              border: `2.5px solid ${log.type === 'Area Out of Compliance' || log.type === 'Failed Asset Override' ? '#ffd700' : '#fbbf24'}`,
              borderRadius: '14px',
              boxShadow: '0 4px 32px #ffd70022, 0 0 1.5px #ffd70044 inset',
              padding: '1.2rem 2rem',
              marginBottom: 0,
              position: 'relative',
              animation: 'criticalPulse 1.5s infinite alternate',
              gap: '1.2rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 48,
                minHeight: 48,
                borderRadius: '50%',
                background: 'rgba(255,215,0,0.08)',
                boxShadow: '0 0 12px #ffd70055',
                marginRight: '1.2rem',
                fontSize: 32,
                color: '#ffd700',
                border: '2px solid #ffd700',
                animation: 'criticalGlow 1.2s infinite alternate',
              }}>
                <AlertTriangle size={32} style={{ color: '#ffd700' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{
                    fontWeight: 700,
                    color: '#ffd700',
                    fontSize: '0.98rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}>CRITICAL</span>
                  <span style={{
                    fontWeight: 600,
                    color: '#ffd700',
                    fontSize: '0.98rem',
                  }}>{log.type}</span>
                  <span style={{
                    color: '#bfc3d1',
                    fontSize: '0.85rem',
                    fontWeight: 400,
                  }}>{log.timestamp}</span>
                </div>
                <div style={{ color: '#e3e6f6', fontSize: '0.95rem', marginTop: 2 }}>
                  <b>{log.subject || log.asset || log.area}</b> &mdash; {log.details || log.action || log.message}
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleAcknowledge(log.id)}
                  style={{
                    background: '#ffd700',
                    color: '#181a2c',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    padding: '0.5em 1.2em',
                    marginLeft: '1.2rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #ffd70022',
                    transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
                  }}
                >
                  Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logs Table */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 1100, margin: '0 auto', padding: '0 0 2.5rem 0' }}>
        {/* Timeline vertical line */}
        <div style={{
          position: 'absolute',
          left: 32,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'linear-gradient(to bottom, #23263a 0%, #ffd700 100%)',
          opacity: 0.18,
          zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {dayOrder.map(day => groupedLogs[day].length > 0 && (
            <div key={day} style={{ marginBottom: '2.2rem' }}>
              <div style={{
                color: '#ffd700',
                fontWeight: 700,
                fontSize: '1.02rem',
                letterSpacing: '0.04em',
                margin: '0 0 1.1rem 0',
                textTransform: 'uppercase',
                borderBottom: '1.5px solid #23263a',
                paddingBottom: 4,
              }}>{day}</div>
              {groupedLogs[day].map((log, idx) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1.2rem',
                    background: 'rgba(24,26,44,0.92)',
                    borderRadius: '12px',
                    boxShadow: '0 2px 12px #ffd70011',
                    marginBottom: '1.1rem',
                    padding: '1.1rem 1.5rem',
                    cursor: 'pointer',
                    borderLeft: '4px solid #ffd700',
                    position: 'relative',
                    transition: 'background 0.18s, box-shadow 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,215,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(24,26,44,0.92)'}
                >
                  {/* Timeline dot */}
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#181a2c',
                    border: '3px solid #ffd700',
                    boxShadow: '0 0 8px #ffd70033',
                    position: 'absolute',
                    left: -38,
                    top: 18,
                    zIndex: 2,
                  }} />
                  {/* Timestamp */}
                  <div style={{
                    minWidth: 90,
                    color: '#bfc3d1',
                    fontSize: '0.92rem',
                    fontWeight: 400,
                    marginTop: 2,
                    textAlign: 'right',
                  }}>{log.timestamp}</div>
                  {/* Icon */}
                  <div style={{ marginTop: 2 }}>{getLogIcon(log.type)}</div>
                  {/* Main log info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#ffd700', fontWeight: 600, fontSize: '1.01rem', marginBottom: 2 }}>{log.action}</div>
                    <div style={{ color: '#e3e6f6', fontSize: '0.97rem' }}>
                      {log.subject || log.asset || log.area} {log.details ? `— ${log.details}` : ''}
                    </div>
                  </div>
                  {/* Actor/avatar */}
                  <div style={{ color: '#bfc3d1', fontSize: '0.92rem', fontWeight: 400, marginLeft: 8 }}>{log.username || log.actor}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Log Details Modal */}
        <LogDetailsModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </div>
  );
} 