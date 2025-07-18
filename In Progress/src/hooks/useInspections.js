import { useState, useEffect } from 'react';

// MOCK DATA - NO FIREBASE WRITES, SAFE FOR DEMO
const mockInspections = [
  {
    id: 'inspect1',
    assetId: 'asset1',
    assetName: 'Server Rack A1',
    status: 'Completed',
    inspector: 'John Doe',
    date: '2025-07-14',
    findings: 'All systems operational'
  },
  {
    id: 'inspect2',
    assetId: 'asset2',
    assetName: 'Network Switch B2',
    status: 'In Progress',
    inspector: 'Sarah Wilson',
    date: '2025-07-14',
    findings: 'Maintenance required'
  }
];

export function useInspections(clientId) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setInspections(mockInspections);
      setLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, [clientId]);

  return { inspections, loading, error };
}
