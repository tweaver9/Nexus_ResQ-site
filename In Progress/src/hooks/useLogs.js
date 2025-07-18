import { useEffect, useState } from "react";

// MOCK DATA - NO FIREBASE WRITES, SAFE FOR DEMO
const mockLogs = [
  {
    id: 'log1',
    type: 'system',
    message: 'System backup completed successfully',
    timestamp: new Date('2025-07-14T10:30:00Z'),
    level: 'info',
    user: 'System'
  },
  {
    id: 'log2',
    type: 'inspection_complete',
    message: 'Asset inspection completed for Server Rack A1',
    timestamp: new Date('2025-07-14T09:15:00Z'),
    level: 'success',
    user: 'John Doe'
  },
  {
    id: 'log3',
    type: 'user',
    message: 'User login: sarah.wilson@company.com',
    timestamp: new Date('2025-07-14T08:45:00Z'),
    level: 'info',
    user: 'Sarah Wilson'
  },
  {
    id: 'log4',
    type: 'asset_failed',
    message: 'Network Switch B2 maintenance required',
    timestamp: new Date('2025-07-14T08:00:00Z'),
    level: 'warning',
    user: 'System'
  },
  {
    id: 'log5',
    type: 'system',
    message: 'Database optimization completed',
    timestamp: new Date('2025-07-13T23:30:00Z'),
    level: 'info',
    user: 'System'
  }
];

export function useLogs(clientId, showOnlyImportant) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      let filteredLogs = [...mockLogs];
      
      // Filter for "only important" if requested
      if (showOnlyImportant) {
        filteredLogs = filteredLogs.filter(
          l =>
            l.type === "inspection_complete" ||
            l.type === "inspection_ended" ||
            l.type === "asset_failed" ||
            l.type === "area_noncompliance"
        );
      }
      
      setLogs(filteredLogs);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [clientId, showOnlyImportant]);

  return { logs, loading, error };
} 