import React, { useState } from 'react';

export default function ModernLocationsManager() {
  // Example state for locations
  const [locations, setLocations] = useState([
    { id: '000', name: 'Newly Added Asset', code: '000', type: 'Main Location' },
    { id: '001', name: 'Warehouse', code: '001', type: 'Main Location' },
    { id: '002', name: 'Engine Bay', code: '002', type: 'Sublocation' },
  ]);
  const [newLocation, setNewLocation] = useState({ name: '', code: '', type: 'Main Location' });
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddLocation = () => {
    setLocations([...locations, { ...newLocation, id: Date.now().toString() }]);
    setNewLocation({ name: '', code: '', type: 'Main Location' });
    setShowAddModal(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ color: '#ffd700', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.5rem' }}>Locations Manager</h2>
      <button
        onClick={() => setShowAddModal(true)}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.13), rgba(255, 224, 102, 0.07))',
          color: '#ffd700',
          border: '1px solid #ffd700',
          borderRadius: '6px',
          padding: '0.6rem 1.2rem',
          fontWeight: 600,
          fontSize: '1rem',
          marginBottom: '1.5rem',
          cursor: 'pointer',
        }}
      >
        + Add Location
      </button>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(24,28,44,0.92)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ffd700' }}>
            <th style={{ color: '#ffd700', fontWeight: 600, padding: '0.5rem' }}>Name</th>
            <th style={{ color: '#ffd700', fontWeight: 600, padding: '0.5rem' }}>Code</th>
            <th style={{ color: '#ffd700', fontWeight: 600, padding: '0.5rem' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {locations.map(loc => (
            <tr key={loc.id} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ color: '#e3e6f6', padding: '0.5rem' }}>{loc.name}</td>
              <td style={{ color: '#bfc3d1', padding: '0.5rem' }}>{loc.code}</td>
              <td style={{ color: '#bfc3d1', padding: '0.5rem' }}>{loc.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}
          onClick={() => setShowAddModal(false)}
        >
          <div style={{
            background: 'rgba(26, 29, 46, 0.98)',
            border: '1px solid #ffd700',
            borderRadius: '10px',
            padding: '2rem',
            minWidth: 320,
            maxWidth: 400,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#ffd700', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Add Location</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ color: '#e3e6f6', fontWeight: 500 }}>Name:</label>
              <input
                type="text"
                value={newLocation.name}
                onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ffd700', marginTop: '0.3rem', marginBottom: '0.7rem', background: '#23253a', color: '#ffd700' }}
              />
              <label style={{ color: '#e3e6f6', fontWeight: 500 }}>Code:</label>
              <input
                type="text"
                value={newLocation.code}
                onChange={e => setNewLocation({ ...newLocation, code: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ffd700', marginTop: '0.3rem', marginBottom: '0.7rem', background: '#23253a', color: '#ffd700' }}
              />
              <label style={{ color: '#e3e6f6', fontWeight: 500 }}>Type:</label>
              <select
                value={newLocation.type}
                onChange={e => setNewLocation({ ...newLocation, type: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '5px', border: '1px solid #ffd700', background: '#23253a', color: '#ffd700', marginTop: '0.3rem' }}
              >
                <option value="Main Location">Main Location</option>
                <option value="Sublocation">Sublocation</option>
                <option value="Precision Location">Precision Location</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '0.5rem 1.1rem',
                  border: '1px solid #bfc3d1',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#bfc3d1',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                style={{
                  padding: '0.5rem 1.1rem',
                  border: '1px solid #ffd700',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.13), rgba(255, 224, 102, 0.07))',
                  color: '#ffd700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
