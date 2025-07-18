import { useState, useEffect } from 'react';

// MOCK DATA - NO FIREBASE WRITES, SAFE FOR DEMO
const mockUsers = [
  {
    id: 'user1',
    name: 'Tyler Weaver',
    username: 'tweaver',
    email: 'tyler.weaver@company.com',
    role: 'nexus',
    status: 'active',
    lastLogin: '2025-07-15T08:30:00Z',
    department: 'Administration',
    assignedAreas: ['Building A', 'Emergency Systems'],
    created_at: '2024-01-15T09:00:00Z',
    avatar: null
  },
  {
    id: 'user2',
    name: 'Sarah Mitchell',
    username: 'smitchell',
    email: 'sarah.mitchell@company.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2025-07-15T07:45:00Z',
    department: 'Operations',
    assignedAreas: ['Building B', 'Fire Safety'],
    created_at: '2024-02-20T10:15:00Z',
    avatar: null
  },
  {
    id: 'user3',
    name: 'Mike Rodriguez',
    username: 'mrodriguez',
    email: 'mike.rodriguez@company.com',
    role: 'manager',
    status: 'active',
    lastLogin: '2025-07-14T16:20:00Z',
    department: 'Safety',
    assignedAreas: ['Vehicle Fleet', 'Equipment Storage'],
    created_at: '2024-03-10T14:30:00Z',
    avatar: null
  },
  {
    id: 'user4',
    name: 'Jessica Chen',
    username: 'jchen',
    email: 'jessica.chen@company.com',
    role: 'user',
    status: 'active',
    lastLogin: '2025-07-15T09:10:00Z',
    department: 'Medical',
    assignedAreas: ['Medical Bay'],
    created_at: '2024-04-05T11:00:00Z',
    avatar: null
  },
  {
    id: 'user5',
    name: 'David Thompson',
    username: 'dthompson',
    email: 'david.thompson@company.com',
    role: 'user',
    status: 'inactive',
    lastLogin: '2025-07-10T14:30:00Z',
    department: 'Maintenance',
    assignedAreas: [],
    created_at: '2024-05-12T13:45:00Z',
    avatar: null
  },
  {
    id: 'user6',
    name: 'Lisa Park',
    username: 'lpark',
    email: 'lisa.park@company.com',
    role: 'user',
    status: 'pending',
    lastLogin: null,
    department: 'Training',
    assignedAreas: ['Training Center'],
    created_at: '2025-07-14T16:00:00Z',
    avatar: null
  }
];

export const useUsers = (clientId) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [clientId]);

  return { users, loading, error };
}; 