import { useState, useEffect } from 'react';

// MOCK DATA - NO FIREBASE WRITES, SAFE FOR DEMO
const mockLocations = [
  {
    id: 'loc1',
    name: 'Data Center 1',
    address: '123 Tech Street, Silicon Valley, CA',
    type: 'Data Center',
    status: 'Active'
  },
  {
    id: 'loc2',
    name: 'Data Center 2',
    address: '456 Server Avenue, Austin, TX',
    type: 'Data Center',
    status: 'Active'
  },
  {
    id: 'loc3',
    name: 'Office Building A',
    address: '789 Business Blvd, New York, NY',
    type: 'Office',
    status: 'Active'
  }
];

export function useLocations(clientId) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setLocations(mockLocations);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [clientId]);

  return { locations, loading, error };
}
