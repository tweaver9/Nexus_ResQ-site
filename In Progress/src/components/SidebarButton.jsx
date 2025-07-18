import React from 'react';

const SidebarButton = ({ active = false, onClick, children }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="sidebar-button"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'Oswald, sans-serif',
        fontWeight: active ? '300' : '200',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        color: active ? '#ffd700' : '#a0a3b8',
        background: 'transparent',
        border: 'none',
        borderLeft: active ? '1px solid #ffd700' : '1px solid transparent',
        borderRadius: 0,
        padding: '0.25rem 0.6rem',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        outline: 'none',
        boxShadow: 'none'
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#ffd700';
        e.target.style.borderLeft = '1px solid #ffd700';
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.target.style.color = '#a0a3b8';
          e.target.style.borderLeft = '1px solid transparent';
        }
      }}
      onFocus={(e) => {
        e.target.style.color = '#ffd700';
        e.target.style.borderLeft = '1px solid #ffd700';
      }}
      onBlur={(e) => {
        if (!active) {
          e.target.style.color = '#a0a3b8';
          e.target.style.borderLeft = '1px solid transparent';
        }
      }}
    >
      {children}
    </button>
  );
};

export default SidebarButton;
