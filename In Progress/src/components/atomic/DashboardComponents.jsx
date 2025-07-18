import React from 'react';

// Glass Panel - Main workspace container
export const GlassPanel = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`glass-panel ${className}`}
      style={{
        background: 'rgba(24,26,44,0.90)',
        backdropFilter: 'blur(13px)',
        border: '1px solid rgba(255,224,102,0.15)',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        padding: '2rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Premium Card - For stats and widgets
export const PremiumCard = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`premium-card ${className}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,224,102,0.12)',
        borderRadius: '12px',
        padding: '1.5rem',
        transition: 'all 0.2s ease',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Staggered Grid - For responsive layouts
export const StaggeredGrid = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`staggered-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Luxury Button
export const LuxuryButton = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = {
    background: variant === 'primary' ? '#ffd700' : 'transparent',
    color: variant === 'primary' ? '#181a2c' : '#ffd700',
    border: variant === 'primary' ? 'none' : '1px solid #ffd700',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    ...props.style
  };

  const hoverStyle = {
    boxShadow: variant === 'primary' ? '0 0 15px rgba(255,215,0,0.4)' : '0 0 10px rgba(255,215,0,0.2)',
    transform: 'translateY(-1px)'
  };

  return (
    <button 
      className={`luxury-btn ${className}`}
      style={baseStyle}
      onMouseEnter={(e) => {
        Object.assign(e.target.style, hoverStyle);
      }}
      onMouseLeave={(e) => {
        e.target.style.boxShadow = '';
        e.target.style.transform = '';
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// Modern Table
export const ModernTable = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`modern-table-container ${className}`}
      style={{
        width: '100%',
        overflow: 'auto',
        borderRadius: '12px',
        border: '1px solid rgba(255,224,102,0.1)',
        background: 'rgba(255,255,255,0.02)',
        ...props.style
      }}
      {...props}
    >
      <table 
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.95rem'
        }}
      >
        {children}
      </table>
    </div>
  );
};

// Table Header
export const TableHeader = ({ children, ...props }) => (
  <thead>
    <tr style={{ borderBottom: '1px solid rgba(255,224,102,0.2)' }}>
      {React.Children.map(children, (child) => 
        React.cloneElement(child, {
          style: {
            color: '#ffe066',
            fontWeight: '400',
            padding: '1rem',
            textAlign: 'left',
            fontSize: '0.9rem',
            letterSpacing: '0.05em',
            ...child.props.style
          },
          ...props
        })
      )}
    </tr>
  </thead>
);

// Table Body
export const TableBody = ({ children, ...props }) => (
  <tbody {...props}>
    {React.Children.map(children, (child, index) => 
      React.cloneElement(child, {
        style: {
          borderBottom: '1px solid rgba(255,224,102,0.08)',
          transition: 'background 0.2s ease',
          ...child.props.style
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.background = 'rgba(255,224,102,0.05)';
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = 'transparent';
        },
        ...props
      })
    )}
  </tbody>
);

// Table Cell
export const TableCell = ({ children, ...props }) => (
  <td 
    style={{
      color: '#e3e6f6',
      padding: '1rem',
      fontSize: '0.95rem',
      ...props.style
    }}
    {...props}
  >
    {children}
  </td>
);

// Table Header Cell
export const TableHeaderCell = ({ children, ...props }) => (
  <th 
    style={{
      color: '#ffe066',
      fontWeight: '400',
      padding: '1rem',
      textAlign: 'left',
      fontSize: '0.9rem',
      letterSpacing: '0.05em',
      ...props.style
    }}
    {...props}
  >
    {children}
  </th>
);

// Status Badge
export const StatusBadge = ({ status, children, ...props }) => {
  const statusColors = {
    success: { bg: 'rgba(57,211,83,0.15)', color: '#39d353', border: 'rgba(57,211,83,0.3)' },
    warning: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
    error: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    info: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' }
  };

  const colors = statusColors[status] || statusColors.info;

  return (
    <span 
      style={{
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '0.25rem 0.75rem',
        fontSize: '0.85rem',
        fontWeight: '500',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </span>
  );
}; 