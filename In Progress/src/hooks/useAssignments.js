import { useState, useEffect } from 'react';

// MOCK DATA - NO FIREBASE WRITES, SAFE FOR DEMO
const mockAssignments = [
  {
    id: 'assign1',
    title: 'Server Maintenance',
    assignee: 'John Doe',
    status: 'In Progress',
    dueDate: '2025-07-20',
    priority: 'High'
  },
  {
    id: 'assign2',
    title: 'Network Security Audit',
    assignee: 'Sarah Wilson',
    status: 'Pending',
    dueDate: '2025-07-25',
    priority: 'Medium'
  }
];

export function useAssignments(clientId) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setAssignments(mockAssignments);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [clientId]);

  return { assignments, loading, error };
}
