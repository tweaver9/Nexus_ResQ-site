import React from 'react';

const Sidebar = ({ activeSection, setActiveSection }) => {
  const handleNavigation = (section) => {
    setActiveSection(section);
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        LOGO
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <button
            className={`sidebar-item ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigation('dashboard')}
          >
            Home
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'admin' ? 'active' : ''}`}
            onClick={() => handleNavigation('admin')}
          >
            Admin
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'Assets' ? 'active' : ''}`}
            onClick={() => handleNavigation('Assets')}
          >
            Assets
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'Users' ? 'active' : ''}`}
            onClick={() => handleNavigation('Users')}
          >
            Users
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'Inspections' ? 'active' : ''}`}
            onClick={() => handleNavigation('Inspections')}
          >
            Inspections
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'Logs' ? 'active' : ''}`}
            onClick={() => handleNavigation('Logs')}
          >
            Logs
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'help' ? 'active' : ''}`}
            onClick={() => handleNavigation('help')}
          >
            Help
          </button>
        </div>
        
        {/* Bottom Section */}
        <div className="sidebar-bottom">
          <button
            className={`sidebar-item ${activeSection === 'nexus-admin' ? 'active' : ''}`}
            onClick={() => handleNavigation('nexus-admin')}
          >
            Nexus Admin
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'firebase-manager' ? 'active' : ''}`}
            onClick={() => handleNavigation('firebase-manager')}
          >
            Firebase Manager
          </button>
          
          <button
            className={`sidebar-item ${activeSection === 'onboard-client' ? 'active' : ''}`}
            onClick={() => handleNavigation('onboard-client')}
          >
            Onboard Client
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
