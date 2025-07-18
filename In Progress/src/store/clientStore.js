import { create } from 'zustand';

const useClientStore = create((set) => ({
  clientId: 'nexus',
  role: 'nexus', // default role for demo
  setClientId: (clientId) => set({ clientId }),
  setRole: (role) => set({ role }),
}));

export default useClientStore;
