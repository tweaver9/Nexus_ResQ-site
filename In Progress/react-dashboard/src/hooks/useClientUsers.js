import { useQuery } from '@tanstack/react-query';
import useClientStore from '../store/clientStore';

// Dummy fetch function (replace with real Firebase call)
async function fetchUsersForClient(clientId) {
  // Simulate API call delay
  await new Promise(res => setTimeout(res, 500));
  // Return dummy data for demonstration
  if (!clientId) return [];
  return [
    { id: 1, name: 'Alice', role: 'admin', clientId },
    { id: 2, name: 'Bob', role: 'user', clientId },
  ];
}

export default function useClientUsers() {
  const { clientId } = useClientStore();
  return useQuery({
    queryKey: ['users', clientId],
    queryFn: () => fetchUsersForClient(clientId),
    enabled: !!clientId, // Only run if clientId is set
  });
}
